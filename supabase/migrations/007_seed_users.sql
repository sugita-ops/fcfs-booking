-- Phase D: ユーザーシードデータ

-- 元請け側ユーザー
-- ダンドリ建設
INSERT INTO users (id, tenant_id, name, email, phone, role, is_primary) VALUES
  ('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '田中 太郎', 'tanaka@dandori.example.com', '090-1111-1111', 'admin', true),
  ('c1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', '鈴木 花子', 'suzuki@dandori.example.com', '090-1111-1112', 'manager', false),
  ('c1111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', '佐々木 一郎', 'sasaki@dandori.example.com', '090-1111-1113', 'member', false);

-- 東京総合建設
INSERT INTO users (id, tenant_id, name, email, phone, role, is_primary) VALUES
  ('c2222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', '山本 次郎', 'yamamoto@tokyo-kensetsu.example.com', '090-2222-2221', 'admin', true),
  ('c2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '中村 美咲', 'nakamura@tokyo-kensetsu.example.com', '090-2222-2222', 'manager', false);

-- 協力業者側ユーザー（代表者のみ）
INSERT INTO users (id, subcontractor_id, name, email, phone, role, is_primary) VALUES
  ('d1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', '山田 電気', 'yamada@yamada-denki.example.com', '090-3111-1111', 'admin', true),
  ('d2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', '佐藤 配管', 'sato@sato-haikan.example.com', '090-3222-2222', 'admin', true),
  ('d3333333-3333-3333-3333-333333333333', 'a3333333-3333-3333-3333-333333333333', '高橋 内装', 'takahashi@takahashi-naisou.example.com', '090-3333-3333', 'admin', true),
  ('d4444444-4444-4444-4444-444444444444', 'a4444444-4444-4444-4444-444444444444', '伊藤 塗装', 'ito@ito-tosou.example.com', '090-3444-4444', 'admin', true),
  ('d5555555-5555-5555-5555-555555555555', 'a5555555-5555-5555-5555-555555555555', '渡辺 基礎', 'watanabe@watanabe-kiso.example.com', '090-3555-5555', 'admin', true);

-- デフォルト通知設定（全ユーザー）
-- 協力業者向け通知
INSERT INTO notification_settings (user_id, notification_type, email_enabled, line_enabled)
SELECT id, 'nominated', true, true FROM users WHERE subcontractor_id IS NOT NULL;

INSERT INTO notification_settings (user_id, notification_type, email_enabled, line_enabled)
SELECT id, 'application_approved', true, true FROM users WHERE subcontractor_id IS NOT NULL;

INSERT INTO notification_settings (user_id, notification_type, email_enabled, line_enabled)
SELECT id, 'report_rejected', true, true FROM users WHERE subcontractor_id IS NOT NULL;

INSERT INTO notification_settings (user_id, notification_type, email_enabled, line_enabled)
SELECT id, 'evaluation_received', true, true FROM users WHERE subcontractor_id IS NOT NULL;

INSERT INTO notification_settings (user_id, notification_type, email_enabled, line_enabled)
SELECT id, 'new_job_post', true, true FROM users WHERE subcontractor_id IS NOT NULL;

-- 元請け向け通知
INSERT INTO notification_settings (user_id, notification_type, email_enabled, line_enabled)
SELECT id, 'application_received', true, true FROM users WHERE tenant_id IS NOT NULL;

INSERT INTO notification_settings (user_id, notification_type, email_enabled, line_enabled)
SELECT id, 'report_submitted', true, true FROM users WHERE tenant_id IS NOT NULL;

-- 案件担当者の設定（テスト用）
-- 案件j1111111はダンドリ建設の田中さんと鈴木さんが担当
INSERT INTO job_post_managers (job_post_id, user_id) VALUES
  ('j1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111'),
  ('j1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111112');

-- 案件j2222222はダンドリ建設の佐々木さんが担当
INSERT INTO job_post_managers (job_post_id, user_id) VALUES
  ('j2222222-2222-2222-2222-222222222222', 'c1111111-1111-1111-1111-111111111113');
