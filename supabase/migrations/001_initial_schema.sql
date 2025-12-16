-- =====================================================
-- マルチテナント協力業者評価システム 初期スキーマ
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. テナント（プレイス/元請け）
-- =====================================================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tenants_code ON tenants(code);
CREATE INDEX idx_tenants_status ON tenants(status);

-- =====================================================
-- 2. テナントユーザー
-- =====================================================
CREATE TABLE tenant_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  auth_user_id UUID UNIQUE, -- Supabase Auth user ID
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'member')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

CREATE INDEX idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX idx_tenant_users_auth ON tenant_users(auth_user_id);

-- =====================================================
-- 3. 協力業者マスタ（全テナント共通）
-- =====================================================
CREATE TABLE subcontractors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE, -- Supabase Auth user ID
  code VARCHAR(50) UNIQUE NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  representative_name VARCHAR(255),
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255) UNIQUE,
  trades TEXT[] DEFAULT '{}',
  certifications TEXT[] DEFAULT '{}',
  service_areas JSONB DEFAULT '{"prefectures": [], "cities": []}',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subcontractors_code ON subcontractors(code);
CREATE INDEX idx_subcontractors_email ON subcontractors(email);
CREATE INDEX idx_subcontractors_trades ON subcontractors USING GIN(trades);
CREATE INDEX idx_subcontractors_auth ON subcontractors(auth_user_id);

-- =====================================================
-- 4. テナント-協力業者 招待関係
-- =====================================================
CREATE TABLE tenant_subcontractors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  invited_by UUID REFERENCES tenant_users(id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'removed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, subcontractor_id)
);

CREATE INDEX idx_tenant_subcontractors_tenant ON tenant_subcontractors(tenant_id);
CREATE INDEX idx_tenant_subcontractors_sub ON tenant_subcontractors(subcontractor_id);

-- =====================================================
-- 5. プロジェクト
-- =====================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  start_date DATE,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'on_hold', 'cancelled')),
  budget DECIMAL(15,2),
  manager_id UUID REFERENCES tenant_users(id),
  external_id VARCHAR(255),
  source VARCHAR(50) DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_projects_tenant ON projects(tenant_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_external ON projects(external_id);

-- =====================================================
-- 6. 案件定義（ジョブポスト）
-- =====================================================
CREATE TABLE job_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  trade VARCHAR(100) NOT NULL,
  description TEXT,
  unit_price DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'JPY',
  start_date DATE,
  end_date DATE,
  recruitment_type VARCHAR(20) DEFAULT 'open' CHECK (recruitment_type IN ('open', 'nominated')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_job_posts_tenant ON job_posts(tenant_id);
CREATE INDEX idx_job_posts_project ON job_posts(project_id);
CREATE INDEX idx_job_posts_trade ON job_posts(trade);

-- =====================================================
-- 7. 工事スロット
-- =====================================================
CREATE TABLE job_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_post_id UUID NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'applied', 'assigned', 'in_progress', 'completed', 'cancelled')),
  assigned_subcontractor_id UUID REFERENCES subcontractors(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  assigned_by UUID REFERENCES tenant_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_job_slots_tenant ON job_slots(tenant_id);
CREATE INDEX idx_job_slots_job_post ON job_slots(job_post_id);
CREATE INDEX idx_job_slots_status ON job_slots(status);
CREATE INDEX idx_job_slots_date ON job_slots(work_date);
CREATE INDEX idx_job_slots_assigned ON job_slots(assigned_subcontractor_id);

-- =====================================================
-- 8. スロット応募
-- =====================================================
CREATE TABLE slot_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_slot_id UUID NOT NULL REFERENCES job_slots(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'selected', 'rejected', 'withdrawn')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_slot_id, subcontractor_id)
);

CREATE INDEX idx_slot_applications_slot ON slot_applications(job_slot_id);
CREATE INDEX idx_slot_applications_sub ON slot_applications(subcontractor_id);
CREATE INDEX idx_slot_applications_status ON slot_applications(status);

-- =====================================================
-- 9. 指名業者
-- =====================================================
CREATE TABLE nominated_subcontractors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_post_id UUID NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  nominated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  nominated_by UUID REFERENCES tenant_users(id),
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_post_id, subcontractor_id)
);

CREATE INDEX idx_nominated_job_post ON nominated_subcontractors(job_post_id);
CREATE INDEX idx_nominated_sub ON nominated_subcontractors(subcontractor_id);

-- =====================================================
-- 10. 完了報告
-- =====================================================
CREATE TABLE completion_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_slot_id UUID NOT NULL UNIQUE REFERENCES job_slots(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id),
  completion_date DATE NOT NULL,
  summary TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  confirmed_by UUID REFERENCES tenant_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_completion_reports_slot ON completion_reports(job_slot_id);
CREATE INDEX idx_completion_reports_sub ON completion_reports(subcontractor_id);
CREATE INDEX idx_completion_reports_status ON completion_reports(status);

-- =====================================================
-- 11. 評価
-- =====================================================
CREATE TABLE evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  completion_report_id UUID UNIQUE REFERENCES completion_reports(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id),
  job_slot_id UUID NOT NULL REFERENCES job_slots(id),
  schedule_rating INT CHECK (schedule_rating BETWEEN 1 AND 5),
  safety_rating INT CHECK (safety_rating BETWEEN 1 AND 5),
  quality_rating INT CHECK (quality_rating BETWEEN 1 AND 5),
  cost_rating INT CHECK (cost_rating BETWEEN 1 AND 5),
  comment TEXT,
  evaluated_by UUID REFERENCES tenant_users(id),
  evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_evaluations_tenant ON evaluations(tenant_id);
CREATE INDEX idx_evaluations_sub ON evaluations(subcontractor_id);
CREATE INDEX idx_evaluations_tenant_sub ON evaluations(tenant_id, subcontractor_id);

-- =====================================================
-- 12. 月次情報
-- =====================================================
CREATE TABLE monthly_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  report_month DATE NOT NULL,
  trades TEXT[] DEFAULT '{}',
  service_areas JSONB DEFAULT '{"prefectures": [], "cities": []}',
  availability_start DATE,
  availability_end DATE,
  certifications TEXT[] DEFAULT '{}',
  capacity JSONB DEFAULT '{"teams": 0, "workers_per_team": 0, "notes": ""}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subcontractor_id, report_month)
);

CREATE INDEX idx_monthly_reports_sub ON monthly_reports(subcontractor_id);
CREATE INDEX idx_monthly_reports_month ON monthly_reports(report_month);

-- =====================================================
-- 13. 通知
-- =====================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('tenant_user', 'subcontractor')),
  recipient_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_type, recipient_id);
CREATE INDEX idx_notifications_unread ON notifications(recipient_type, recipient_id, read_at) WHERE read_at IS NULL;

-- =====================================================
-- 14. CSVインポート履歴
-- =====================================================
CREATE TABLE csv_import_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  import_type VARCHAR(50) NOT NULL CHECK (import_type IN ('subcontractors', 'evaluations')),
  file_name VARCHAR(255),
  total_rows INT DEFAULT 0,
  success_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  errors JSONB DEFAULT '[]',
  imported_by UUID REFERENCES tenant_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_csv_import_logs_tenant ON csv_import_logs(tenant_id);

-- =====================================================
-- 15. システム管理者
-- =====================================================
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin', 'support')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_users_auth ON admin_users(auth_user_id);

-- =====================================================
-- 16. 工種マスタ
-- =====================================================
CREATE TABLE master_trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(100),
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_master_trades_active ON master_trades(is_active, display_order);

-- =====================================================
-- 17. エリアマスタ
-- =====================================================
CREATE TABLE master_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prefecture VARCHAR(50) NOT NULL,
  city VARCHAR(100),
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(prefecture, city)
);

CREATE INDEX idx_master_areas_pref ON master_areas(prefecture);
CREATE INDEX idx_master_areas_active ON master_areas(is_active, display_order);

-- =====================================================
-- Updated At トリガー関数
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_users_updated_at BEFORE UPDATE ON tenant_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subcontractors_updated_at BEFORE UPDATE ON subcontractors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_subcontractors_updated_at BEFORE UPDATE ON tenant_subcontractors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_posts_updated_at BEFORE UPDATE ON job_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_slots_updated_at BEFORE UPDATE ON job_slots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_completion_reports_updated_at BEFORE UPDATE ON completion_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_evaluations_updated_at BEFORE UPDATE ON evaluations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_monthly_reports_updated_at BEFORE UPDATE ON monthly_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 初期データ: 工種マスタ
-- =====================================================
INSERT INTO master_trades (name, category, display_order) VALUES
  ('電気工事', '設備工事', 1),
  ('配管工事', '設備工事', 2),
  ('空調工事', '設備工事', 3),
  ('給排水工事', '設備工事', 4),
  ('基礎工事', '躯体工事', 10),
  ('鉄筋工事', '躯体工事', 11),
  ('型枠工事', '躯体工事', 12),
  ('コンクリート工事', '躯体工事', 13),
  ('鉄骨工事', '躯体工事', 14),
  ('内装工事', '仕上工事', 20),
  ('塗装工事', '仕上工事', 21),
  ('防水工事', '仕上工事', 22),
  ('タイル工事', '仕上工事', 23),
  ('左官工事', '仕上工事', 24),
  ('建具工事', '仕上工事', 25),
  ('ガラス工事', '仕上工事', 26),
  ('クロス工事', '仕上工事', 27),
  ('床工事', '仕上工事', 28),
  ('外構工事', 'その他', 30),
  ('解体工事', 'その他', 31),
  ('足場工事', 'その他', 32),
  ('土工事', 'その他', 33),
  ('その他', 'その他', 99);

-- =====================================================
-- 初期データ: エリアマスタ（都道府県）
-- =====================================================
INSERT INTO master_areas (prefecture, city, display_order) VALUES
  ('北海道', NULL, 1),
  ('青森県', NULL, 2),
  ('岩手県', NULL, 3),
  ('宮城県', NULL, 4),
  ('秋田県', NULL, 5),
  ('山形県', NULL, 6),
  ('福島県', NULL, 7),
  ('茨城県', NULL, 8),
  ('栃木県', NULL, 9),
  ('群馬県', NULL, 10),
  ('埼玉県', NULL, 11),
  ('千葉県', NULL, 12),
  ('東京都', NULL, 13),
  ('神奈川県', NULL, 14),
  ('新潟県', NULL, 15),
  ('富山県', NULL, 16),
  ('石川県', NULL, 17),
  ('福井県', NULL, 18),
  ('山梨県', NULL, 19),
  ('長野県', NULL, 20),
  ('岐阜県', NULL, 21),
  ('静岡県', NULL, 22),
  ('愛知県', NULL, 23),
  ('三重県', NULL, 24),
  ('滋賀県', NULL, 25),
  ('京都府', NULL, 26),
  ('大阪府', NULL, 27),
  ('兵庫県', NULL, 28),
  ('奈良県', NULL, 29),
  ('和歌山県', NULL, 30),
  ('鳥取県', NULL, 31),
  ('島根県', NULL, 32),
  ('岡山県', NULL, 33),
  ('広島県', NULL, 34),
  ('山口県', NULL, 35),
  ('徳島県', NULL, 36),
  ('香川県', NULL, 37),
  ('愛媛県', NULL, 38),
  ('高知県', NULL, 39),
  ('福岡県', NULL, 40),
  ('佐賀県', NULL, 41),
  ('長崎県', NULL, 42),
  ('熊本県', NULL, 43),
  ('大分県', NULL, 44),
  ('宮崎県', NULL, 45),
  ('鹿児島県', NULL, 46),
  ('沖縄県', NULL, 47);
