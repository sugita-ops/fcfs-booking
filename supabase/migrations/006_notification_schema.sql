-- Phase D: 通知機能用スキーマ

-- ユーザーテーブル（個人単位）
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 所属（どちらか一方、または両方NULLも可）
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  subcontractor_id UUID REFERENCES subcontractors(id) ON DELETE SET NULL,
  -- 基本情報
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'member', -- 'admin', 'manager', 'member'
  is_primary BOOLEAN DEFAULT false, -- 代表者フラグ
  -- LINE連携
  line_user_id VARCHAR(100), -- LINE Messaging APIのユーザーID
  line_linked_at TIMESTAMPTZ,
  line_verification_code VARCHAR(10), -- 認証コード（一時的）
  line_verification_expires_at TIMESTAMPTZ,
  -- メタ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 通知設定テーブル
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- 通知種別
  notification_type VARCHAR(50) NOT NULL,
  -- 'nominated' - 指名された
  -- 'application_approved' - 応募が承認された
  -- 'report_rejected' - 完了報告が差戻し
  -- 'evaluation_received' - 評価が登録された
  -- 'new_job_post' - 新規案件が公開
  -- 'application_received' - 応募があった
  -- 'report_submitted' - 完了報告が提出された

  -- 送信手段ごとのON/OFF
  email_enabled BOOLEAN DEFAULT true,
  line_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, notification_type)
);

-- 通知履歴テーブル
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 宛先
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  -- 通知情報
  notification_type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL, -- 'email', 'line'
  recipient VARCHAR(255) NOT NULL, -- メールアドレス or LINE user ID
  -- 送信状況
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT,
  -- 関連データ（参照用）
  related_id UUID, -- job_post_id, completion_report_id, evaluation_id など
  related_type VARCHAR(50), -- 'job_post', 'completion_report', 'evaluation' など
  -- メタ
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 案件担当者テーブル（元請けユーザーと案件の関連）
CREATE TABLE IF NOT EXISTS job_post_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_post_id UUID NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(job_post_id, user_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_subcontractor ON users(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON users(line_user_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_job_post_managers_job_post ON job_post_managers(job_post_id);
CREATE INDEX IF NOT EXISTS idx_job_post_managers_user ON job_post_managers(user_id);
