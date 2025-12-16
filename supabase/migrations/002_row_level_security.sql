-- =====================================================
-- Row Level Security (RLS) ポリシー設定
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE nominated_subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE completion_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_areas ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Helper Functions
-- =====================================================

-- Get current user's tenant_id (for tenant users)
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM tenant_users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Get current user's subcontractor_id (for subcontractors)
CREATE OR REPLACE FUNCTION get_user_subcontractor_id()
RETURNS UUID AS $$
  SELECT id FROM subcontractors WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid() AND status = 'active');
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if current user is tenant user
CREATE OR REPLACE FUNCTION is_tenant_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM tenant_users WHERE auth_user_id = auth.uid() AND status = 'active');
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if current user is subcontractor
CREATE OR REPLACE FUNCTION is_subcontractor_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM subcontractors WHERE auth_user_id = auth.uid() AND status = 'active');
$$ LANGUAGE SQL SECURITY DEFINER;

-- =====================================================
-- Tenants Policies
-- =====================================================

-- Admins can see all tenants
CREATE POLICY "admins_all_tenants" ON tenants
  FOR ALL USING (is_admin_user());

-- Tenant users can see their own tenant
CREATE POLICY "tenant_users_own_tenant" ON tenants
  FOR SELECT USING (id = get_user_tenant_id());

-- =====================================================
-- Tenant Users Policies
-- =====================================================

-- Admins can manage all tenant users
CREATE POLICY "admins_all_tenant_users" ON tenant_users
  FOR ALL USING (is_admin_user());

-- Tenant admins can manage users in their tenant
CREATE POLICY "tenant_admins_manage_users" ON tenant_users
  FOR ALL USING (
    tenant_id = get_user_tenant_id()
    AND EXISTS(
      SELECT 1 FROM tenant_users tu
      WHERE tu.auth_user_id = auth.uid()
      AND tu.tenant_id = tenant_users.tenant_id
      AND tu.role = 'admin'
    )
  );

-- Tenant users can see other users in their tenant
CREATE POLICY "tenant_users_see_colleagues" ON tenant_users
  FOR SELECT USING (tenant_id = get_user_tenant_id());

-- =====================================================
-- Subcontractors Policies
-- =====================================================

-- Admins can manage all subcontractors
CREATE POLICY "admins_all_subcontractors" ON subcontractors
  FOR ALL USING (is_admin_user());

-- Subcontractors can see and update their own record
CREATE POLICY "subcontractors_own_record" ON subcontractors
  FOR ALL USING (auth_user_id = auth.uid());

-- Tenant users can see subcontractors invited to their tenant
CREATE POLICY "tenant_users_see_invited_subcontractors" ON subcontractors
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM tenant_subcontractors ts
      WHERE ts.subcontractor_id = subcontractors.id
      AND ts.tenant_id = get_user_tenant_id()
      AND ts.status = 'active'
    )
  );

-- =====================================================
-- Tenant Subcontractors (Invitations) Policies
-- =====================================================

-- Admins can manage all invitations
CREATE POLICY "admins_all_invitations" ON tenant_subcontractors
  FOR ALL USING (is_admin_user());

-- Tenant users can manage invitations for their tenant
CREATE POLICY "tenant_users_manage_invitations" ON tenant_subcontractors
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Subcontractors can see their invitations
CREATE POLICY "subcontractors_see_invitations" ON tenant_subcontractors
  FOR SELECT USING (subcontractor_id = get_user_subcontractor_id());

-- =====================================================
-- Projects Policies
-- =====================================================

-- Admins can manage all projects
CREATE POLICY "admins_all_projects" ON projects
  FOR ALL USING (is_admin_user());

-- Tenant users can manage their tenant's projects
CREATE POLICY "tenant_users_manage_projects" ON projects
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Subcontractors can see projects from tenants that invited them
CREATE POLICY "subcontractors_see_projects" ON projects
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM tenant_subcontractors ts
      WHERE ts.tenant_id = projects.tenant_id
      AND ts.subcontractor_id = get_user_subcontractor_id()
      AND ts.status = 'active'
    )
  );

-- =====================================================
-- Job Posts Policies
-- =====================================================

-- Admins can manage all job posts
CREATE POLICY "admins_all_job_posts" ON job_posts
  FOR ALL USING (is_admin_user());

-- Tenant users can manage their tenant's job posts
CREATE POLICY "tenant_users_manage_job_posts" ON job_posts
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Subcontractors can see job posts (open or nominated to them)
CREATE POLICY "subcontractors_see_job_posts" ON job_posts
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM tenant_subcontractors ts
      WHERE ts.tenant_id = job_posts.tenant_id
      AND ts.subcontractor_id = get_user_subcontractor_id()
      AND ts.status = 'active'
    )
    AND (
      recruitment_type = 'open'
      OR EXISTS(
        SELECT 1 FROM nominated_subcontractors ns
        WHERE ns.job_post_id = job_posts.id
        AND ns.subcontractor_id = get_user_subcontractor_id()
      )
    )
  );

-- =====================================================
-- Job Slots Policies
-- =====================================================

-- Admins can manage all job slots
CREATE POLICY "admins_all_job_slots" ON job_slots
  FOR ALL USING (is_admin_user());

-- Tenant users can manage their tenant's job slots
CREATE POLICY "tenant_users_manage_job_slots" ON job_slots
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Subcontractors can see available/applied slots
CREATE POLICY "subcontractors_see_job_slots" ON job_slots
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM tenant_subcontractors ts
      WHERE ts.tenant_id = job_slots.tenant_id
      AND ts.subcontractor_id = get_user_subcontractor_id()
      AND ts.status = 'active'
    )
    AND (
      status IN ('available', 'applied')
      OR assigned_subcontractor_id = get_user_subcontractor_id()
    )
  );

-- =====================================================
-- Slot Applications Policies
-- =====================================================

-- Admins can manage all applications
CREATE POLICY "admins_all_applications" ON slot_applications
  FOR ALL USING (is_admin_user());

-- Subcontractors can manage their own applications
CREATE POLICY "subcontractors_own_applications" ON slot_applications
  FOR ALL USING (subcontractor_id = get_user_subcontractor_id());

-- Tenant users can see applications for their slots
CREATE POLICY "tenant_users_see_applications" ON slot_applications
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM job_slots js
      WHERE js.id = slot_applications.job_slot_id
      AND js.tenant_id = get_user_tenant_id()
    )
  );

-- Tenant users can update applications (select/reject)
CREATE POLICY "tenant_users_update_applications" ON slot_applications
  FOR UPDATE USING (
    EXISTS(
      SELECT 1 FROM job_slots js
      WHERE js.id = slot_applications.job_slot_id
      AND js.tenant_id = get_user_tenant_id()
    )
  );

-- =====================================================
-- Nominated Subcontractors Policies
-- =====================================================

-- Admins can manage all nominations
CREATE POLICY "admins_all_nominations" ON nominated_subcontractors
  FOR ALL USING (is_admin_user());

-- Tenant users can manage nominations
CREATE POLICY "tenant_users_manage_nominations" ON nominated_subcontractors
  FOR ALL USING (
    EXISTS(
      SELECT 1 FROM job_posts jp
      WHERE jp.id = nominated_subcontractors.job_post_id
      AND jp.tenant_id = get_user_tenant_id()
    )
  );

-- Subcontractors can see their nominations
CREATE POLICY "subcontractors_see_nominations" ON nominated_subcontractors
  FOR SELECT USING (subcontractor_id = get_user_subcontractor_id());

-- =====================================================
-- Completion Reports Policies
-- =====================================================

-- Admins can manage all reports
CREATE POLICY "admins_all_completion_reports" ON completion_reports
  FOR ALL USING (is_admin_user());

-- Subcontractors can manage their own reports
CREATE POLICY "subcontractors_own_reports" ON completion_reports
  FOR ALL USING (subcontractor_id = get_user_subcontractor_id());

-- Tenant users can see and confirm reports
CREATE POLICY "tenant_users_manage_reports" ON completion_reports
  FOR ALL USING (
    EXISTS(
      SELECT 1 FROM job_slots js
      WHERE js.id = completion_reports.job_slot_id
      AND js.tenant_id = get_user_tenant_id()
    )
  );

-- =====================================================
-- Evaluations Policies
-- =====================================================

-- Admins can manage all evaluations
CREATE POLICY "admins_all_evaluations" ON evaluations
  FOR ALL USING (is_admin_user());

-- Tenant users can manage their tenant's evaluations
CREATE POLICY "tenant_users_manage_evaluations" ON evaluations
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Subcontractors can see their own evaluations
CREATE POLICY "subcontractors_see_evaluations" ON evaluations
  FOR SELECT USING (subcontractor_id = get_user_subcontractor_id());

-- =====================================================
-- Monthly Reports Policies
-- =====================================================

-- Admins can manage all monthly reports
CREATE POLICY "admins_all_monthly_reports" ON monthly_reports
  FOR ALL USING (is_admin_user());

-- Subcontractors can manage their own monthly reports
CREATE POLICY "subcontractors_own_monthly_reports" ON monthly_reports
  FOR ALL USING (subcontractor_id = get_user_subcontractor_id());

-- Tenant users can see monthly reports of invited subcontractors
CREATE POLICY "tenant_users_see_monthly_reports" ON monthly_reports
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM tenant_subcontractors ts
      WHERE ts.subcontractor_id = monthly_reports.subcontractor_id
      AND ts.tenant_id = get_user_tenant_id()
      AND ts.status = 'active'
    )
  );

-- =====================================================
-- Notifications Policies
-- =====================================================

-- Users can see their own notifications
CREATE POLICY "users_own_notifications" ON notifications
  FOR SELECT USING (
    (recipient_type = 'tenant_user' AND recipient_id IN (SELECT id FROM tenant_users WHERE auth_user_id = auth.uid()))
    OR (recipient_type = 'subcontractor' AND recipient_id = get_user_subcontractor_id())
  );

-- Users can update (mark as read) their own notifications
CREATE POLICY "users_update_own_notifications" ON notifications
  FOR UPDATE USING (
    (recipient_type = 'tenant_user' AND recipient_id IN (SELECT id FROM tenant_users WHERE auth_user_id = auth.uid()))
    OR (recipient_type = 'subcontractor' AND recipient_id = get_user_subcontractor_id())
  );

-- Admins can manage all notifications
CREATE POLICY "admins_all_notifications" ON notifications
  FOR ALL USING (is_admin_user());

-- =====================================================
-- CSV Import Logs Policies
-- =====================================================

-- Admins can see all import logs
CREATE POLICY "admins_all_import_logs" ON csv_import_logs
  FOR ALL USING (is_admin_user());

-- Tenant users can see their tenant's import logs
CREATE POLICY "tenant_users_own_import_logs" ON csv_import_logs
  FOR SELECT USING (tenant_id = get_user_tenant_id());

-- =====================================================
-- Admin Users Policies
-- =====================================================

-- Only admins can see admin users
CREATE POLICY "admins_see_admins" ON admin_users
  FOR SELECT USING (is_admin_user());

-- Super admins can manage all admin users
CREATE POLICY "super_admins_manage_admins" ON admin_users
  FOR ALL USING (
    EXISTS(
      SELECT 1 FROM admin_users au
      WHERE au.auth_user_id = auth.uid()
      AND au.role = 'super_admin'
      AND au.status = 'active'
    )
  );

-- =====================================================
-- Master Data Policies (Public Read)
-- =====================================================

-- Everyone can read master trades
CREATE POLICY "public_read_trades" ON master_trades
  FOR SELECT USING (true);

-- Admins can manage master trades
CREATE POLICY "admins_manage_trades" ON master_trades
  FOR ALL USING (is_admin_user());

-- Everyone can read master areas
CREATE POLICY "public_read_areas" ON master_areas
  FOR SELECT USING (true);

-- Admins can manage master areas
CREATE POLICY "admins_manage_areas" ON master_areas
  FOR ALL USING (is_admin_user());
