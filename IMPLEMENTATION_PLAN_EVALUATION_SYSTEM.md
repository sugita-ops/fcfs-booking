# 協力業者評価機能 実装計画書

**作成日**: 2025-12-11
**バージョン**: 1.0
**対象システム**: ダンドリブッキング

---

## 1. 機能概要

### 1.1 目的
建設現場における元請けと協力業者（下請け）間の業務評価・管理システムを構築し、以下を実現する：
- 工事完了報告と元請けによる評価入力
- 協力業者の施工実績の集計・検索
- 指名発注による効率的な業者選定
- 協力業者からの月次情報提供

### 1.2 主要機能一覧

| 機能 | 概要 |
|------|------|
| マルチテナント基盤 | プレイス（元請け）単位でのデータ分離 |
| 工事完了報告 | 協力業者から元請けへの完了通知 |
| 評価入力 | 5段階評価（工期/安全/品質/金額）+ コメント |
| 業者検索・集計 | 評価データに基づく業者検索 |
| 指名発注 | 選択した業者のみへの案件通知 |
| 月次情報入力 | 協力業者の空き状況・キャパシティ登録 |
| CSVインポート | 業者情報・評価データの一括登録 |
| 管理画面 | サービス提供側の運用管理 |

---

## 2. 実装フェーズ

### Phase F: マルチテナント基盤整備（最優先）
### Phase A: 工事完了報告 + 評価入力
### Phase B: 協力業者検索・集計画面
### Phase C: 指名発注機能
### Phase D: 協力業者の月次情報入力
### Phase E: CSVインポート/エクスポート
### Phase G: サービス提供側管理画面

---

## 3. データベース設計

### 3.1 ER図（概念）

```
┌─────────────────┐       ┌─────────────────┐
│     tenants     │       │   subcontractors │
│  (プレイス/元請け)│       │  (協力業者マスタ)  │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │ 1:N                     │ M:N
         ▼                         ▼
┌─────────────────┐       ┌─────────────────────┐
│ tenant_users    │       │ tenant_subcontractors│
│ (テナントユーザー) │       │   (招待関係)         │
└─────────────────┘       └──────────┬──────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    job_slots    │       │   evaluations   │       │ monthly_reports │
│   (工事スロット)  │       │     (評価)      │       │   (月次情報)    │
└────────┬────────┘       └─────────────────┘       └─────────────────┘
         │
         ▼
┌─────────────────┐
│ completion_     │
│ reports         │
│  (完了報告)      │
└─────────────────┘
```

### 3.2 テーブル定義

#### tenants（テナント/プレイス/元請け）
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,                    -- テナント名（会社名）
  code VARCHAR(50) UNIQUE NOT NULL,              -- テナントコード（place_code）
  address TEXT,                                  -- 住所
  phone VARCHAR(20),                             -- 電話番号
  email VARCHAR(255),                            -- メールアドレス
  status VARCHAR(20) DEFAULT 'active',           -- active/suspended/deleted
  settings JSONB DEFAULT '{}',                   -- テナント設定
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### tenant_users（テナントユーザー）
```sql
CREATE TABLE tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,                     -- admin/manager/member
  password_hash VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);
```

#### subcontractors（協力業者マスタ - 全テナント共通）
```sql
CREATE TABLE subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,              -- 専用ID（CSV用）
  company_name VARCHAR(255) NOT NULL,            -- 会社名
  representative_name VARCHAR(255),              -- 代表者名
  address TEXT,                                  -- 住所
  phone VARCHAR(20),                             -- 電話番号
  email VARCHAR(255) UNIQUE,                     -- メールアドレス
  trades TEXT[],                                 -- 対応工種（配列）
  certifications TEXT[],                         -- 保有資格（配列）
  service_areas JSONB,                           -- 施工エリア
  -- {
  --   "prefectures": ["東京都", "神奈川県"],
  --   "cities": ["新宿区", "渋谷区"]
  -- }
  password_hash VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',           -- active/suspended/deleted
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### tenant_subcontractors（テナント-協力業者 招待関係）
```sql
CREATE TABLE tenant_subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  subcontractor_id UUID REFERENCES subcontractors(id),
  invited_at TIMESTAMP DEFAULT NOW(),
  invited_by UUID REFERENCES tenant_users(id),
  status VARCHAR(20) DEFAULT 'active',           -- active/suspended/removed
  notes TEXT,                                    -- メモ
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, subcontractor_id)
);
```

#### projects（プロジェクト）
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  start_date DATE,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'planning',         -- planning/in_progress/completed/on_hold
  budget DECIMAL(15,2),
  manager_id UUID REFERENCES tenant_users(id),
  external_id VARCHAR(255),                      -- ダンドリワーク等の外部ID
  source VARCHAR(50),                            -- manual/dandori-work
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### job_posts（案件定義）
```sql
CREATE TABLE job_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  project_id UUID REFERENCES projects(id),
  title VARCHAR(255) NOT NULL,
  trade VARCHAR(100) NOT NULL,                   -- 工種
  description TEXT,
  unit_price DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'JPY',
  start_date DATE,
  end_date DATE,
  recruitment_type VARCHAR(20) DEFAULT 'open',   -- open（通常募集）/nominated（指名募集）
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### job_slots（工事スロット）
```sql
CREATE TABLE job_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  job_post_id UUID REFERENCES job_posts(id),
  work_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'available',        -- available/applied/assigned/in_progress/completed/cancelled
  assigned_subcontractor_id UUID REFERENCES subcontractors(id),
  assigned_at TIMESTAMP,
  assigned_by UUID REFERENCES tenant_users(id),  -- 元請けが選択した場合
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### slot_applications（スロット応募）
```sql
CREATE TABLE slot_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_slot_id UUID REFERENCES job_slots(id),
  subcontractor_id UUID REFERENCES subcontractors(id),
  applied_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending',          -- pending/selected/rejected/withdrawn
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(job_slot_id, subcontractor_id)
);
```

#### nominated_subcontractors（指名業者）
```sql
CREATE TABLE nominated_subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_post_id UUID REFERENCES job_posts(id),
  subcontractor_id UUID REFERENCES subcontractors(id),
  nominated_at TIMESTAMP DEFAULT NOW(),
  nominated_by UUID REFERENCES tenant_users(id),
  notified_at TIMESTAMP,                         -- 通知送信日時
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(job_post_id, subcontractor_id)
);
```

#### completion_reports（完了報告）
```sql
CREATE TABLE completion_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_slot_id UUID REFERENCES job_slots(id) UNIQUE,
  subcontractor_id UUID REFERENCES subcontractors(id),
  completion_date DATE NOT NULL,
  summary TEXT,                                  -- 作業内容サマリー
  photo_urls TEXT[],                             -- 写真URL（Phase 4以降）最大10枚
  reported_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending',          -- pending/confirmed/rejected
  confirmed_at TIMESTAMP,
  confirmed_by UUID REFERENCES tenant_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### evaluations（評価）
```sql
CREATE TABLE evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  completion_report_id UUID REFERENCES completion_reports(id) UNIQUE,
  subcontractor_id UUID REFERENCES subcontractors(id),
  job_slot_id UUID REFERENCES job_slots(id),

  -- 5段階評価 (1-5)
  schedule_rating INT CHECK (schedule_rating BETWEEN 1 AND 5),  -- 工期
  safety_rating INT CHECK (safety_rating BETWEEN 1 AND 5),      -- 安全
  quality_rating INT CHECK (quality_rating BETWEEN 1 AND 5),    -- 品質
  cost_rating INT CHECK (cost_rating BETWEEN 1 AND 5),          -- 金額/コスパ

  comment TEXT,                                  -- フリーテキストコメント
  evaluated_by UUID REFERENCES tenant_users(id),
  evaluated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 集計用インデックス
CREATE INDEX idx_evaluations_tenant_subcontractor
  ON evaluations(tenant_id, subcontractor_id);
CREATE INDEX idx_evaluations_subcontractor
  ON evaluations(subcontractor_id);
```

#### monthly_reports（協力業者 月次情報）
```sql
CREATE TABLE monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id UUID REFERENCES subcontractors(id),
  report_month DATE NOT NULL,                    -- 対象月（月初日を格納）

  -- 更新情報
  trades TEXT[],                                 -- 対応可能工種（複数）
  service_areas JSONB,                           -- 施工可能エリア
  -- {
  --   "prefectures": ["東京都", "神奈川県"],
  --   "cities": ["新宿区", "渋谷区", "横浜市"]
  -- }

  availability_start DATE,                       -- 空き期間（開始）
  availability_end DATE,                         -- 空き期間（終了）
  certifications TEXT[],                         -- 保有資格

  -- 施工キャパシティ
  capacity JSONB,
  -- {
  --   "teams": 3,           -- 組数
  --   "workers_per_team": 4, -- 1組あたり人数
  --   "notes": "繁忙期は2組まで"
  -- }

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(subcontractor_id, report_month)
);
```

#### notifications（通知）
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type VARCHAR(20) NOT NULL,           -- tenant_user/subcontractor
  recipient_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,                     -- new_slot/nominated/completion_confirmed/evaluation_received
  title VARCHAR(255) NOT NULL,
  body TEXT,
  data JSONB,                                    -- 関連データ（job_slot_id等）
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient
  ON notifications(recipient_type, recipient_id, read_at);
```

#### csv_import_logs（CSVインポート履歴）
```sql
CREATE TABLE csv_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  import_type VARCHAR(50) NOT NULL,              -- subcontractors/evaluations
  file_name VARCHAR(255),
  total_rows INT,
  success_count INT,
  error_count INT,
  errors JSONB,                                  -- エラー詳細
  imported_by UUID REFERENCES tenant_users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3.3 管理画面用テーブル

#### admin_users（システム管理者）
```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,                     -- super_admin/admin/support
  password_hash VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### master_trades（工種マスタ）
```sql
CREATE TABLE master_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(100),                         -- 大分類
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### master_areas（エリアマスタ）
```sql
CREATE TABLE master_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefecture VARCHAR(50) NOT NULL,
  city VARCHAR(100),
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(prefecture, city)
);
```

---

## 4. 画面一覧

### 4.1 協力業者側画面

| 画面ID | 画面名 | パス | 概要 |
|--------|--------|------|------|
| S-01 | ダッシュボード | `/subcontractor` | 案件一覧・応募（既存を拡張） |
| S-02 | 予約履歴 | `/subcontractor/claims` | 受注済み案件一覧（既存） |
| S-03 | 完了報告入力 | `/subcontractor/claims/[id]/complete` | **新規** 完了報告フォーム |
| S-04 | 自社評価確認 | `/subcontractor/evaluations` | **新規** 受けた評価一覧 |
| S-05 | 月次情報入力 | `/subcontractor/monthly-report` | **新規** 空き状況等の入力 |
| S-06 | 自社情報設定 | `/subcontractor/settings` | 会社情報編集（既存を拡張） |
| S-07 | 通知一覧 | `/subcontractor/notifications` | 通知確認（既存を拡張） |

### 4.2 元請け側画面

| 画面ID | 画面名 | パス | 概要 |
|--------|--------|------|------|
| C-01 | ダッシュボード | `/contractor` | 概要表示（既存を拡張） |
| C-02 | プロジェクト管理 | `/contractor/projects` | プロジェクト一覧（既存） |
| C-03 | 工事スロット管理 | `/contractor/slots` | スロット一覧（既存を拡張） |
| C-04 | スロット作成 | `/contractor/slots/new` | **新規** 通常/指名募集選択 |
| C-05 | 応募者一覧 | `/contractor/slots/[id]/applications` | **新規** 応募業者選択 |
| C-06 | 完了報告確認 | `/contractor/completion-reports` | **新規** 完了報告一覧 |
| C-07 | 評価入力 | `/contractor/completion-reports/[id]/evaluate` | **新規** 評価フォーム |
| C-08 | 協力業者検索 | `/contractor/subcontractors` | **新規** 業者検索・集計 |
| C-09 | 業者詳細 | `/contractor/subcontractors/[id]` | **新規** 評価履歴・詳細 |
| C-10 | 招待業者管理 | `/contractor/subcontractors/invited` | **新規** 招待済み業者一覧 |
| C-11 | CSVインポート | `/contractor/import` | **新規** CSV取込画面 |
| C-12 | API連携 | `/contractor/integrations` | 外部連携（既存） |

### 4.3 管理画面（サービス提供側）

| 画面ID | 画面名 | パス | 概要 |
|--------|--------|------|------|
| A-01 | 管理ダッシュボード | `/admin` | システム概要（既存を拡張） |
| A-02 | テナント管理 | `/admin/tenants` | **新規** テナント一覧/追加/編集 |
| A-03 | テナント詳細 | `/admin/tenants/[id]` | **新規** 利用状況確認 |
| A-04 | 協力業者マスタ | `/admin/subcontractors` | **新規** 全業者管理 |
| A-05 | ユーザー管理 | `/admin/users` | **新規** 全ユーザー一覧 |
| A-06 | 工種マスタ | `/admin/master/trades` | **新規** 工種マスタ管理 |
| A-07 | エリアマスタ | `/admin/master/areas` | **新規** エリアマスタ管理 |
| A-08 | システム設定 | `/admin/settings` | **新規** グローバル設定 |
| A-09 | 監査ログ | `/admin/audit` | 操作ログ（既存） |

---

## 5. API一覧

### 5.1 認証 API

| メソッド | エンドポイント | 概要 |
|----------|--------------|------|
| POST | `/api/auth/login` | ログイン |
| POST | `/api/auth/logout` | ログアウト |
| GET | `/api/auth/me` | 現在のユーザー情報取得 |

### 5.2 テナント API

| メソッド | エンドポイント | 概要 |
|----------|--------------|------|
| GET | `/api/tenants` | テナント一覧（管理者用） |
| POST | `/api/tenants` | テナント作成（管理者用） |
| GET | `/api/tenants/[id]` | テナント詳細 |
| PATCH | `/api/tenants/[id]` | テナント更新 |
| DELETE | `/api/tenants/[id]` | テナント削除（論理削除） |

### 5.3 協力業者 API

| メソッド | エンドポイント | 概要 |
|----------|--------------|------|
| GET | `/api/subcontractors` | 協力業者検索（テナント招待済みのみ） |
| POST | `/api/subcontractors` | 協力業者新規登録 |
| GET | `/api/subcontractors/[id]` | 協力業者詳細 |
| PATCH | `/api/subcontractors/[id]` | 協力業者更新 |
| POST | `/api/subcontractors/invite` | 協力業者招待 |
| DELETE | `/api/subcontractors/[id]/invite` | 招待解除 |

### 5.4 工事スロット API

| メソッド | エンドポイント | 概要 |
|----------|--------------|------|
| GET | `/api/slots` | スロット一覧 |
| POST | `/api/slots` | スロット作成（通常/指名募集） |
| GET | `/api/slots/[id]` | スロット詳細 |
| PATCH | `/api/slots/[id]` | スロット更新 |
| DELETE | `/api/slots/[id]` | スロット削除 |
| POST | `/api/slots/[id]/apply` | スロット応募（協力業者） |
| POST | `/api/slots/[id]/assign` | 業者選択・割当（元請け） |

### 5.5 完了報告 API

| メソッド | エンドポイント | 概要 |
|----------|--------------|------|
| GET | `/api/completion-reports` | 完了報告一覧 |
| POST | `/api/completion-reports` | 完了報告作成 |
| GET | `/api/completion-reports/[id]` | 完了報告詳細 |
| POST | `/api/completion-reports/[id]/confirm` | 完了確認（元請け） |

### 5.6 評価 API

| メソッド | エンドポイント | 概要 |
|----------|--------------|------|
| GET | `/api/evaluations` | 評価一覧 |
| POST | `/api/evaluations` | 評価作成 |
| GET | `/api/evaluations/[id]` | 評価詳細 |
| GET | `/api/evaluations/summary` | 評価集計（業者別） |
| GET | `/api/subcontractors/[id]/evaluations` | 特定業者の評価一覧 |

### 5.7 月次情報 API

| メソッド | エンドポイント | 概要 |
|----------|--------------|------|
| GET | `/api/monthly-reports` | 月次情報一覧 |
| POST | `/api/monthly-reports` | 月次情報作成/更新 |
| GET | `/api/monthly-reports/current` | 自社の最新月次情報 |

### 5.8 CSV API

| メソッド | エンドポイント | 概要 |
|----------|--------------|------|
| POST | `/api/import/subcontractors` | 協力業者CSVインポート |
| POST | `/api/import/evaluations` | 評価CSVインポート |
| GET | `/api/export/subcontractors` | 協力業者CSVエクスポート |
| GET | `/api/export/evaluations` | 評価CSVエクスポート |

### 5.9 通知 API

| メソッド | エンドポイント | 概要 |
|----------|--------------|------|
| GET | `/api/notifications` | 通知一覧 |
| PATCH | `/api/notifications/[id]/read` | 既読マーク |
| POST | `/api/notifications/mark-all-read` | 全件既読 |

### 5.10 マスタ API（管理者用）

| メソッド | エンドポイント | 概要 |
|----------|--------------|------|
| GET | `/api/admin/trades` | 工種マスタ一覧 |
| POST | `/api/admin/trades` | 工種マスタ追加 |
| PATCH | `/api/admin/trades/[id]` | 工種マスタ更新 |
| GET | `/api/admin/areas` | エリアマスタ一覧 |
| POST | `/api/admin/areas` | エリアマスタ追加 |

---

## 6. 主要フロー詳細

### 6.1 工事スロット作成〜受注フロー

```
┌─────────────────────────────────────────────────────────────────┐
│ 元請け: 工事スロット作成                                          │
├─────────────────────────────────────────────────────────────────┤
│ 1. POST /api/slots                                              │
│    - recruitment_type: "open" or "nominated"                    │
│    - nominated_ids: [...] (指名の場合)                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┴───────────────────┐
         │                                       │
         ▼                                       ▼
┌─────────────────────┐               ┌─────────────────────┐
│ 【通常募集】          │               │ 【指名募集】          │
│ マッチする招待済み業者  │               │ 指名業者のみに通知    │
│ 全員に通知            │               │                     │
└──────────┬──────────┘               └──────────┬──────────┘
           │                                     │
           └───────────────┬─────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ 協力業者: 応募                                                   │
├─────────────────────────────────────────────────────────────────┤
│ POST /api/slots/[id]/apply                                      │
│ - status: "applied"                                             │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 元請け: 業者選択                                                 │
├─────────────────────────────────────────────────────────────────┤
│ POST /api/slots/[id]/assign                                     │
│ - subcontractor_id: 選択した業者ID                               │
│ - slot.status → "assigned"                                      │
│ - 他の応募者: rejected                                           │
│ - 他業者の画面から案件消える                                       │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 完了報告〜評価フロー

```
┌─────────────────────────────────────────────────────────────────┐
│ 協力業者: 完了報告                                               │
├─────────────────────────────────────────────────────────────────┤
│ POST /api/completion-reports                                    │
│ - job_slot_id                                                   │
│ - completion_date                                               │
│ - summary                                                       │
│ - photo_urls (Phase 4以降)                                       │
│                                                                 │
│ → slot.status: "in_progress" → "completed"                      │
│ → 元請けに通知                                                    │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 元請け: 確認 & 評価入力                                          │
├─────────────────────────────────────────────────────────────────┤
│ 1. POST /api/completion-reports/[id]/confirm                    │
│    - completion_report.status → "confirmed"                     │
│                                                                 │
│ 2. POST /api/evaluations                                        │
│    - schedule_rating (1-5)                                      │
│    - safety_rating (1-5)                                        │
│    - quality_rating (1-5)                                       │
│    - cost_rating (1-5)                                          │
│    - comment                                                    │
│                                                                 │
│ → 協力業者に評価完了通知                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. CSVフォーマット

### 7.1 協力業者CSVインポート

```csv
専用ID,会社名,代表者名,住所,電話番号,メールアドレス,工種,保有資格,施工エリア（都道府県）,施工エリア（市区町村）
SUB001,株式会社山田工務店,山田太郎,東京都新宿区西新宿1-1-1,03-1234-5678,yamada@example.com,"電気工事,配管工事","第一種電気工事士,給水装置工事主任技術者","東京都,神奈川県","新宿区,渋谷区,横浜市"
SUB002,鈴木建設,鈴木一郎,大阪府大阪市北区梅田1-1-1,06-1234-5678,suzuki@example.com,基礎工事,一級建築士,大阪府,大阪市
```

**インポートルール:**
- 専用IDが既存 → 更新
- 専用IDが新規 → 新規登録
- 工種/資格/エリアはカンマ区切りで複数指定可

### 7.2 評価CSVインポート

```csv
専用ID,案件ID,工期評価,安全評価,品質評価,金額評価,コメント,評価日
SUB001,SLOT001,5,4,5,4,丁寧な作業でした,2024-12-01
SUB001,SLOT002,4,5,4,5,安全管理が徹底していた,2024-12-15
```

---

## 8. 実装順序と詳細

### Phase F: マルチテナント基盤整備

**目的**: Supabase/PostgreSQLによるマルチテナント基盤構築

**作業内容**:
1. Supabaseプロジェクトセットアップ
2. 上記テーブル作成（マイグレーション）
3. Row Level Security (RLS) 設定
4. 認証システム実装（Supabase Auth）
5. 既存localStorage → DB移行
6. 基本CRUD API実装

**成果物**:
- DB接続設定 (`src/lib/supabase.ts`)
- 認証コンテキスト (`src/contexts/AuthContext.tsx`)
- 基本APIエンドポイント

### Phase A: 工事完了報告 + 評価入力

**作業内容**:
1. completion_reports テーブル使用
2. evaluations テーブル使用
3. 完了報告入力画面 (S-03)
4. 完了報告一覧画面 (C-06)
5. 評価入力画面 (C-07)
6. 評価確認画面 (S-04)
7. 関連API実装
8. 通知連携

### Phase B: 協力業者検索・集計画面

**作業内容**:
1. 評価集計クエリ実装
2. 業者検索画面 (C-08)
3. 業者詳細画面 (C-09)
4. 招待業者管理画面 (C-10)
5. 検索条件: 名称、工種、エリア、評価、資格

### Phase C: 指名発注機能

**作業内容**:
1. job_posts.recruitment_type 拡張
2. nominated_subcontractors テーブル使用
3. スロット作成画面に指名選択追加 (C-04)
4. 応募者一覧・選択画面 (C-05)
5. 指名通知機能

### Phase D: 協力業者の月次情報入力

**作業内容**:
1. monthly_reports テーブル使用
2. 月次情報入力画面 (S-05)
3. 元請け側での閲覧機能
4. 自社情報設定画面拡張 (S-06)

### Phase E: CSVインポート/エクスポート

**作業内容**:
1. CSVパーサー実装
2. インポート画面 (C-11)
3. バリデーション・エラーハンドリング
4. エクスポート機能
5. インポート履歴表示

### Phase G: サービス提供側管理画面

**作業内容**:
1. 管理者認証
2. テナント管理画面 (A-02, A-03)
3. 協力業者マスタ画面 (A-04)
4. ユーザー管理画面 (A-05)
5. マスタ管理画面 (A-06, A-07)
6. システム設定画面 (A-08)

---

## 9. 技術的考慮事項

### 9.1 マルチテナント設計

- **データ分離**: `tenant_id` による行レベル分離
- **RLS**: Supabase Row Level Security で自動フィルタ
- **認証**: JWT に tenant_id を含める

### 9.2 パフォーマンス

- 評価集計: マテリアライズドビュー or キャッシュ検討
- 検索: 適切なインデックス設計
- ページネーション: カーソルベース推奨

### 9.3 セキュリティ

- 入力バリデーション（Zod使用）
- XSS対策
- CSRF対策
- レート制限

---

## 10. 今後の検討事項

1. **写真アップロード** (Phase 4以降)
   - Vercel Blob or Supabase Storage
   - 画像最適化

2. **リアルタイム通知**
   - Supabase Realtime
   - WebSocket

3. **レポート機能**
   - PDF出力
   - 評価サマリーレポート

4. **モバイルアプリ対応**
   - React Native検討
   - PWA強化

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-12-11 | 1.0 | 初版作成 |
