-- =========================================
-- FCFS Booking System - Initial Schema
-- Migration: 001_initial_schema.sql
-- =========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================
-- Core Tables
-- =========================================

-- Tenants (organizations using the system)
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  integration_mode text NOT NULL DEFAULT 'standalone', -- 'standalone' | 'dandori'
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Users (individuals who can access the system)
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text,
  phone text,
  dw_user_id text, -- DandoriWork user ID for integration
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- User memberships within tenants (many-to-many with roles)
CREATE TABLE memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL, -- 'owner'|'gc_admin'|'gc_member'|'sub_admin'|'sub_member'|'ops_admin'
  company_id uuid, -- References companies.id (self-referential)
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- Companies (general contractors and subcontractors)
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_gc boolean NOT NULL DEFAULT false, -- General Contractor flag
  trades text, -- Comma-separated trades (e.g., "interior,scaffold")
  address text,
  contact_name text,
  contact_phone text,
  contact_email text,
  rating numeric(3,2), -- 0.00 to 5.00
  dw_company_id text, -- DandoriWork company ID for integration
  source text DEFAULT 'local', -- 'local'|'dw'
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Add foreign key constraint for memberships.company_id
ALTER TABLE memberships ADD CONSTRAINT fk_memberships_company
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

-- Company qualifications and certifications
CREATE TABLE qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  number text,
  valid_until date,
  files_url text, -- URL to stored qualification documents
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Construction projects
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  start_date date,
  end_date date,
  dw_project_id text, -- DandoriWork project ID for integration
  source text DEFAULT 'local', -- 'local'|'dw'
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Job postings (work requests within projects)
CREATE TABLE job_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  trade text NOT NULL, -- Type of work (e.g., "interior", "scaffold")
  title text NOT NULL,
  description text,
  unit_price integer NOT NULL, -- Price in yen (or smallest currency unit)
  currency text DEFAULT 'JPY',
  price_type text DEFAULT 'fixed', -- 'fixed'|'range'|'bid' (for future expansion)
  required_quals text, -- Comma-separated required qualification names
  area_hint text, -- Location hint within the project
  start_date date NOT NULL,
  end_date date NOT NULL,
  capacity integer NOT NULL DEFAULT 1, -- Number of slots available
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Job slots (individual work slots within job postings - FCFS targets)
CREATE TABLE job_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_post_id uuid NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  status text NOT NULL DEFAULT 'available', -- 'available'|'claimed'|'completed'|'cancelled'
  claimed_by_company uuid REFERENCES companies(id),
  claimed_by_user uuid REFERENCES users(id),
  claimed_at timestamptz,
  canceled_at timestamptz,
  cancel_reason text,
  slot_no int NOT NULL DEFAULT 1, -- Slot number for same date/job_post
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_post_id, work_date, slot_no)
);

-- Claims (record of slot claims for audit and idempotency)
CREATE TABLE claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_slot_id uuid NOT NULL REFERENCES job_slots(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id),
  user_id uuid REFERENCES users(id),
  request_id text UNIQUE NOT NULL, -- For idempotency
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_slot_id) -- Prevent double claims on same slot
);

-- =========================================
-- Integration Tables (Outbox/Inbox Pattern)
-- =========================================

-- Outbound integration events (reliable delivery)
CREATE TABLE integration_outbox (
  id bigserial PRIMARY KEY,
  event_id text UNIQUE NOT NULL,
  event_name text NOT NULL, -- e.g., 'claim.confirmed', 'claim.cancelled'
  payload jsonb NOT NULL,
  target text NOT NULL, -- 'dw' (DandoriWork)
  status text NOT NULL DEFAULT 'pending', -- 'pending'|'sent'|'failed'
  retry_count int NOT NULL DEFAULT 0,
  next_attempt_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Inbound integration events (deduplication)
CREATE TABLE integration_inbox (
  id bigserial PRIMARY KEY,
  event_id text UNIQUE NOT NULL,
  event_name text NOT NULL,
  payload jsonb NOT NULL,
  received_at timestamptz DEFAULT now()
);

-- =========================================
-- Audit and Monitoring
-- =========================================

-- Audit log for all significant actions
CREATE TABLE audit_logs (
  id bigserial PRIMARY KEY,
  tenant_id uuid,
  actor_user_id uuid,
  actor_role text,
  action text NOT NULL, -- 'publish_job','claim','cancel','impersonate_enter', etc.
  target_table text,
  target_id text,
  payload jsonb, -- Additional context data
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================
-- Indexes for Performance
-- =========================================

-- Job posts: tenant + published + date queries
CREATE INDEX idx_job_posts_tenant_published_dates
  ON job_posts(tenant_id, is_published, start_date DESC, created_at DESC);

-- Job slots: open slots for quick FCFS queries
CREATE INDEX idx_job_slots_open
  ON job_slots(tenant_id, job_post_id, status)
  WHERE status = 'available';

-- Job slots: date-based queries for alternatives
CREATE INDEX idx_job_slots_work_date
  ON job_slots(tenant_id, work_date, status);

-- Claims: request_id for idempotency
CREATE INDEX idx_claims_request_id ON claims(request_id);

-- Integration outbox: pending events processing
CREATE INDEX idx_integration_outbox_pending
  ON integration_outbox(status, next_attempt_at)
  WHERE status IN ('pending', 'failed');

-- Audit logs: tenant + time-based queries
CREATE INDEX idx_audit_logs_tenant_time
  ON audit_logs(tenant_id, created_at DESC);

-- Companies: tenant + trade queries
CREATE INDEX idx_companies_tenant_trades
  ON companies(tenant_id, trades)
  WHERE is_active = true;

-- Users: email lookup
CREATE INDEX idx_users_email ON users(email) WHERE is_active = true;

-- Memberships: tenant + role queries
CREATE INDEX idx_memberships_tenant_role
  ON memberships(tenant_id, role)
  WHERE is_active = true;

-- =========================================
-- Triggers for Updated_at
-- =========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_qualifications_updated_at BEFORE UPDATE ON qualifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_posts_updated_at BEFORE UPDATE ON job_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_slots_updated_at BEFORE UPDATE ON job_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_outbox_updated_at BEFORE UPDATE ON integration_outbox
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();