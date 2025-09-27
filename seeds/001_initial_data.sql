-- =========================================
-- FCFS Booking System - Initial Seed Data
-- Seed: 001_initial_data.sql
-- =========================================

-- =========================================
-- 1. Create Test Tenant
-- =========================================

INSERT INTO tenants (id, name, integration_mode, is_active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'テスト建設株式会社',
  'dandori',
  true
);

-- =========================================
-- 2. Create Test Users
-- =========================================

-- GC Admin User
INSERT INTO users (id, email, name, phone, is_active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440101'::uuid,
  'admin@test-construction.co.jp',
  '元請管理者',
  '03-1234-5678',
  true
);

-- GC Member User
INSERT INTO users (id, email, name, phone, is_active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440102'::uuid,
  'member@test-construction.co.jp',
  '元請担当者',
  '03-1234-5679',
  true
);

-- Subcontractor Admin User
INSERT INTO users (id, email, name, phone, is_active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440201'::uuid,
  'admin@yamada-interior.co.jp',
  '山田太郎',
  '03-9876-5432',
  true
);

-- Subcontractor Member User
INSERT INTO users (id, email, name, phone, is_active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440202'::uuid,
  'worker@yamada-interior.co.jp',
  '山田次郎',
  '090-1234-5678',
  true
);

-- =========================================
-- 3. Create Companies
-- =========================================

-- General Contractor
INSERT INTO companies (id, tenant_id, name, is_gc, trades, address, contact_name, contact_phone, contact_email, rating, source)
VALUES (
  '550e8400-e29b-41d4-a716-446655440301'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'テスト建設株式会社',
  true,
  'general_construction',
  '東京都港区虎ノ門1-1-1',
  '元請管理者',
  '03-1234-5678',
  'admin@test-construction.co.jp',
  4.5,
  'local'
);

-- Subcontractor - Interior Work
INSERT INTO companies (id, tenant_id, name, is_gc, trades, address, contact_name, contact_phone, contact_email, rating, source)
VALUES (
  '550e8400-e29b-41d4-a716-446655440302'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '山田内装工業',
  false,
  'interior,drywall,flooring',
  '東京都江東区豊洲2-2-2',
  '山田太郎',
  '03-9876-5432',
  'admin@yamada-interior.co.jp',
  4.2,
  'local'
);

-- =========================================
-- 4. Create Memberships (User-Tenant-Company relationships)
-- =========================================

-- GC Admin
INSERT INTO memberships (tenant_id, user_id, role, company_id, is_active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '550e8400-e29b-41d4-a716-446655440101'::uuid,
  'gc_admin',
  '550e8400-e29b-41d4-a716-446655440301'::uuid,
  true
);

-- GC Member
INSERT INTO memberships (tenant_id, user_id, role, company_id, is_active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '550e8400-e29b-41d4-a716-446655440102'::uuid,
  'gc_member',
  '550e8400-e29b-41d4-a716-446655440301'::uuid,
  true
);

-- Sub Admin
INSERT INTO memberships (tenant_id, user_id, role, company_id, is_active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '550e8400-e29b-41d4-a716-446655440201'::uuid,
  'sub_admin',
  '550e8400-e29b-41d4-a716-446655440302'::uuid,
  true
);

-- Sub Member
INSERT INTO memberships (tenant_id, user_id, role, company_id, is_active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '550e8400-e29b-41d4-a716-446655440202'::uuid,
  'sub_member',
  '550e8400-e29b-41d4-a716-446655440302'::uuid,
  true
);

-- =========================================
-- 5. Create Qualifications
-- =========================================

-- Subcontractor qualifications
INSERT INTO qualifications (tenant_id, company_id, name, number, valid_until)
VALUES
(
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '550e8400-e29b-41d4-a716-446655440302'::uuid,
  '内装仕上工事業許可',
  '東京都知事許可第12345号',
  '2025-12-31'::date
),
(
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '550e8400-e29b-41d4-a716-446655440302'::uuid,
  '建築士事務所登録',
  '東京都知事登録第6789号',
  '2026-03-31'::date
);

-- =========================================
-- 6. Create Project
-- =========================================

INSERT INTO projects (id, tenant_id, name, address, start_date, end_date, source, created_by)
VALUES (
  '550e8400-e29b-41d4-a716-446655440401'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '新宿オフィスビル建設プロジェクト',
  '東京都新宿区西新宿1-1-1',
  '2024-10-01'::date,
  '2025-03-31'::date,
  'local',
  '550e8400-e29b-41d4-a716-446655440101'::uuid
);

-- =========================================
-- 7. Create Job Post
-- =========================================

INSERT INTO job_posts (id, tenant_id, project_id, trade, title, description, unit_price, currency, price_type, required_quals, area_hint, start_date, end_date, capacity, is_published, published_at, created_by)
VALUES (
  '550e8400-e29b-41d4-a716-446655440501'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '550e8400-e29b-41d4-a716-446655440401'::uuid,
  'interior',
  '5階内装仕上げ工事',
  'オフィスフロアの内装仕上げ工事。壁面クロス貼り、床材設置、建具取付等を含みます。',
  28000,
  'JPY',
  'fixed',
  '内装仕上工事業許可',
  '5階 500㎡',
  '2024-11-01'::date,
  '2024-11-15'::date,
  3, -- 3 slots available
  true,
  now(),
  '550e8400-e29b-41d4-a716-446655440101'::uuid
);

-- =========================================
-- 8. Create Job Slots (3 slots for FCFS testing)
-- =========================================

-- Slot 1: November 5th
INSERT INTO job_slots (id, tenant_id, job_post_id, work_date, status, slot_no)
VALUES (
  '550e8400-e29b-41d4-a716-446655440601'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '550e8400-e29b-41d4-a716-446655440501'::uuid,
  '2024-11-05'::date,
  'available',
  1
);

-- Slot 2: November 6th
INSERT INTO job_slots (id, tenant_id, job_post_id, work_date, status, slot_no)
VALUES (
  '550e8400-e29b-41d4-a716-446655440602'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '550e8400-e29b-41d4-a716-446655440501'::uuid,
  '2024-11-06'::date,
  'available',
  1
);

-- Slot 3: November 7th
INSERT INTO job_slots (id, tenant_id, job_post_id, work_date, status, slot_no)
VALUES (
  '550e8400-e29b-41d4-a716-446655440603'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '550e8400-e29b-41d4-a716-446655440501'::uuid,
  '2024-11-07'::date,
  'available',
  1
);

-- =========================================
-- 9. Insert Initial Audit Log
-- =========================================

INSERT INTO audit_logs (tenant_id, actor_user_id, actor_role, action, target_table, target_id, payload)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '550e8400-e29b-41d4-a716-446655440101'::uuid,
  'gc_admin',
  'seed_data_inserted',
  'multiple',
  'initial_seed',
  '{"description": "Initial seed data insertion for testing", "tables": ["tenants", "users", "companies", "memberships", "qualifications", "projects", "job_posts", "job_slots"], "slot_count": 3}'::jsonb
);

-- =========================================
-- Summary of Created Data
-- =========================================

-- Tenant: 1 (テスト建設株式会社)
-- Users: 4 (GC: 2, Sub: 2)
-- Companies: 2 (GC: 1, Sub: 1)
-- Memberships: 4 (each user linked to their company)
-- Qualifications: 2 (subcontractor certifications)
-- Projects: 1 (新宿オフィスビル)
-- Job Posts: 1 (内装仕上げ工事)
-- Job Slots: 3 (November 5-7, all available for FCFS testing)