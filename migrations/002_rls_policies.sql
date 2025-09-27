-- =========================================
-- FCFS Booking System - RLS Policies
-- Migration: 002_rls_policies.sql
-- =========================================

-- =========================================
-- Enable RLS on all tenant-scoped tables
-- =========================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- Note: users table does NOT have RLS as users can belong to multiple tenants
-- Note: audit_logs and integration_* tables have special handling

-- =========================================
-- Tenant Policies (self-access only)
-- =========================================

CREATE POLICY "tenant_select_own" ON tenants
  FOR SELECT
  USING (id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "tenant_update_own" ON tenants
  FOR UPDATE
  USING (id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Tenants cannot insert/delete themselves (admin operation)

-- =========================================
-- Membership Policies (tenant-scoped)
-- =========================================

CREATE POLICY "membership_tenant_select" ON memberships
  FOR SELECT
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "membership_tenant_insert" ON memberships
  FOR INSERT
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "membership_tenant_update" ON memberships
  FOR UPDATE
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "membership_tenant_delete" ON memberships
  FOR DELETE
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- =========================================
-- Company Policies (tenant-scoped)
-- =========================================

CREATE POLICY "company_tenant_select" ON companies
  FOR SELECT
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "company_tenant_insert" ON companies
  FOR INSERT
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "company_tenant_update" ON companies
  FOR UPDATE
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "company_tenant_delete" ON companies
  FOR DELETE
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- =========================================
-- Qualification Policies (tenant-scoped)
-- =========================================

CREATE POLICY "qualification_tenant_select" ON qualifications
  FOR SELECT
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "qualification_tenant_insert" ON qualifications
  FOR INSERT
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "qualification_tenant_update" ON qualifications
  FOR UPDATE
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "qualification_tenant_delete" ON qualifications
  FOR DELETE
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- =========================================
-- Project Policies (tenant-scoped)
-- =========================================

CREATE POLICY "project_tenant_select" ON projects
  FOR SELECT
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "project_tenant_insert" ON projects
  FOR INSERT
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "project_tenant_update" ON projects
  FOR UPDATE
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "project_tenant_delete" ON projects
  FOR DELETE
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- =========================================
-- Job Post Policies (tenant-scoped)
-- =========================================

CREATE POLICY "job_post_tenant_select" ON job_posts
  FOR SELECT
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "job_post_tenant_insert" ON job_posts
  FOR INSERT
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "job_post_tenant_update" ON job_posts
  FOR UPDATE
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "job_post_tenant_delete" ON job_posts
  FOR DELETE
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- =========================================
-- Job Slot Policies (tenant-scoped)
-- =========================================

CREATE POLICY "job_slot_tenant_select" ON job_slots
  FOR SELECT
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "job_slot_tenant_insert" ON job_slots
  FOR INSERT
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "job_slot_tenant_update" ON job_slots
  FOR UPDATE
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "job_slot_tenant_delete" ON job_slots
  FOR DELETE
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- =========================================
-- Claim Policies (tenant-scoped)
-- =========================================

CREATE POLICY "claim_tenant_select" ON claims
  FOR SELECT
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "claim_tenant_insert" ON claims
  FOR INSERT
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "claim_tenant_update" ON claims
  FOR UPDATE
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "claim_tenant_delete" ON claims
  FOR DELETE
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- =========================================
-- Special Handling for System Tables
-- =========================================

-- Integration tables: No RLS (system-level operations)
-- These tables are managed by background processes and admin operations

-- Audit logs: Special policy for tenant-scoped reading but system-level writing
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Tenants can read their own audit logs
CREATE POLICY "audit_log_tenant_select" ON audit_logs
  FOR SELECT
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid OR tenant_id IS NULL);

-- Only system can insert audit logs (no tenant restriction on insert)
CREATE POLICY "audit_log_system_insert" ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- No updates or deletes on audit logs
-- =========================================
-- Helper function for testing RLS
-- =========================================

-- Function to set JWT claims for testing
CREATE OR REPLACE FUNCTION set_test_tenant(tenant_uuid uuid)
RETURNS void AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('tenant_id', tenant_uuid::text)::text, true);
END;
$$ LANGUAGE plpgsql;

-- Function to clear test tenant
CREATE OR REPLACE FUNCTION clear_test_tenant()
RETURNS void AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', '', true);
END;
$$ LANGUAGE plpgsql;