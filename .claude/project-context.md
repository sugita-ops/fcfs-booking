# プロジェクトコンテキスト - ダンドリブッキング

> このファイルは Claude Code が自動的に読み込み、プロジェクトの全体像を理解するために使用されます。
> **最終更新**: 2025-12-16

---

## 🎯 プロジェクト概要

| 項目 | 内容 |
|------|------|
| プロジェクト名 | ダンドリブッキング (FCFS Booking System) |
| 目的 | 建設業界向けの先着順工事スロット予約・協力業者評価システム |
| 技術スタック | Next.js 16.0.10, React 19.2.3, TypeScript 5, Tailwind CSS 4, Supabase |
| 本番URL | https://fcfs-booking.vercel.app |
| リポジトリ | https://github.com/sugita-ops/fcfs-booking |

---

## 📂 プロジェクト構造

```
fcfs-booking/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # ログイン画面（旧版）
│   │   ├── v2/                         # ★ 新版 Supabase 対応
│   │   │   ├── page.tsx                # v2 ログイン/ロール選択
│   │   │   ├── contractor/             # 元請け向け
│   │   │   │   ├── dashboard/          # ダッシュボード
│   │   │   │   ├── job-posts/          # 案件管理
│   │   │   │   ├── subcontractors/     # 協力業者一覧・詳細
│   │   │   │   ├── completion-reports/ # 完了報告確認
│   │   │   │   ├── evaluations/        # 評価管理
│   │   │   │   └── settings/           # 設定
│   │   │   └── subcontractor/          # 協力業者向け
│   │   │       ├── dashboard/          # ダッシュボード
│   │   │       ├── job-posts/          # 案件一覧
│   │   │       ├── completion-reports/ # 完了報告
│   │   │       └── settings/           # 設定
│   │   ├── contractor/                 # 旧版元請け画面
│   │   ├── subcontractor/              # 旧版協力業者画面
│   │   ├── admin/                      # 管理画面
│   │   └── api/
│   │       ├── v2/                     # ★ 新版 API (Supabase)
│   │       │   ├── job-slots/          # 工事スロット API
│   │       │   ├── subcontractors/     # 協力業者 API
│   │       │   ├── completion-reports/ # 完了報告 API
│   │       │   ├── evaluations/        # 評価 API
│   │       │   ├── monthly-reports/    # 月次報告 API
│   │       │   ├── notifications/      # 通知 API
│   │       │   └── master/             # マスタデータ API
│   │       └── (旧版API群)
│   ├── components/                     # React コンポーネント
│   ├── contexts/
│   │   └── AuthContext.tsx             # ★ Supabase 認証コンテキスト
│   ├── lib/
│   │   ├── supabase/                   # ★ Supabase クライアント
│   │   │   ├── client.ts               # ブラウザ用
│   │   │   ├── server.ts               # サーバー用
│   │   │   └── demo-client.ts          # デモ用ダミークライアント
│   │   ├── notifications/              # 通知サービス
│   │   │   ├── email-service.ts        # Resend メール
│   │   │   ├── line-service.ts         # LINE 通知
│   │   │   └── notification-service.ts # 統合サービス
│   │   ├── api-utils.ts                # API ユーティリティ
│   │   └── (旧版ライブラリ群)
│   └── types/
│       └── database.ts                 # ★ Supabase 型定義
├── supabase/
│   └── migrations/                     # ★ DBマイグレーション
│       ├── 001_initial_schema.sql      # 初期スキーマ
│       ├── 002_row_level_security.sql  # RLS設定
│       ├── 003_seed_data.sql           # シードデータ
│       ├── 004_disable_rls_for_demo.sql# デモ用RLS無効化
│       ├── 005_seed_monthly_reports.sql# 月次報告シード
│       ├── 006_notification_schema.sql # 通知スキーマ
│       └── 007_seed_users.sql          # ユーザーシード
├── public/
│   ├── sw.js                           # Service Worker (PWA)
│   └── icons/                          # PWA アイコン
└── .claude/
    └── project-context.md              # このファイル
```

---

## 🗄️ データベーススキーマ (Supabase PostgreSQL)

### 主要テーブル

| テーブル | 説明 |
|----------|------|
| `tenants` | 元請け会社（テナント） |
| `tenant_users` | 元請け会社のユーザー |
| `subcontractors` | 協力業者 |
| `tenant_subcontractors` | テナント-協力業者の関係 |
| `projects` | プロジェクト（現場） |
| `job_posts` | 案件定義 |
| `job_slots` | 工事スロット（日別の作業枠） |
| `slot_applications` | スロットへの応募 |
| `nominated_subcontractors` | 指名業者 |
| `completion_reports` | 完了報告 |
| `evaluations` | 評価（5段階×4項目） |
| `monthly_reports` | 月次情報 |
| `notifications` | 通知 |
| `master_trades` | 工種マスタ |
| `master_areas` | エリアマスタ |

### 工事スロットのステータスフロー

```
available → applied → assigned → in_progress → completed
                 ↓
            cancelled
```

### 評価項目（5段階）
- `schedule_rating`: 工程遵守
- `safety_rating`: 安全管理
- `quality_rating`: 品質
- `cost_rating`: コスト

---

## 🔐 認証システム

### AuthContext の仕組み

```typescript
// src/contexts/AuthContext.tsx
type UserType = 'tenant_user' | 'subcontractor' | 'admin' | null;

interface UserProfile {
  type: UserType;
  tenantUser?: TenantUser & { tenant?: Tenant };
  subcontractor?: Subcontractor;
  adminUser?: AdminUser;
}
```

### ログインフロー
1. `/v2` でロール選択（元請け or 協力業者）
2. Supabase Auth でメール/パスワード認証
3. `auth_user_id` で `tenant_users` or `subcontractors` を検索
4. プロファイル取得後、対応するダッシュボードへリダイレクト

### 便利フック
- `useAuth()`: 認証状態全体
- `useTenantUser()`: 元請けユーザー情報
- `useSubcontractor()`: 協力業者情報
- `useTenantId()`: テナントID

---

## 🌐 URL パス一覧

### v2（新版・Supabase対応）

#### 元請け向け
| URL | 画面名 |
|-----|--------|
| `/v2` | ログイン/ロール選択 |
| `/v2/contractor/dashboard` | ダッシュボード |
| `/v2/contractor/job-posts` | 案件管理 |
| `/v2/contractor/job-posts/[id]/applications` | 応募者一覧 |
| `/v2/contractor/subcontractors` | 協力業者一覧 |
| `/v2/contractor/subcontractors/[id]` | 協力業者詳細（評価履歴） |
| `/v2/contractor/completion-reports` | 完了報告確認 |
| `/v2/contractor/evaluations` | 評価管理 |
| `/v2/contractor/settings` | 設定 |

#### 協力業者向け
| URL | 画面名 |
|-----|--------|
| `/v2/subcontractor/dashboard` | ダッシュボード |
| `/v2/subcontractor/job-posts` | 案件一覧・応募 |
| `/v2/subcontractor/completion-reports` | 完了報告 |
| `/v2/subcontractor/settings` | 設定 |

### 旧版（localStorage ベース）
- `/contractor` - 元請けダッシュボード
- `/subcontractor` - 協力業者ダッシュボード
- `/admin` - 管理画面

---

## 🔧 API エンドポイント (v2)

| エンドポイント | メソッド | 説明 |
|---------------|----------|------|
| `/api/v2/job-slots` | GET | 工事スロット一覧取得 |
| `/api/v2/job-slots/[id]/apply` | POST | スロットに応募 |
| `/api/v2/job-slots/[id]/assign` | POST | スロットを業者に割当 |
| `/api/v2/subcontractors` | GET | 協力業者一覧 |
| `/api/v2/subcontractors/[id]` | GET | 協力業者詳細 |
| `/api/v2/subcontractors/[id]/evaluations` | GET | 業者の評価履歴 |
| `/api/v2/completion-reports` | GET/POST | 完了報告 CRUD |
| `/api/v2/completion-reports/[id]/confirm` | POST | 完了報告承認/差戻し |
| `/api/v2/evaluations` | GET/POST | 評価 CRUD |
| `/api/v2/evaluations/summary` | GET | 評価サマリー |
| `/api/v2/monthly-reports` | GET/POST | 月次報告 |
| `/api/v2/notifications/send` | POST | 通知送信 |
| `/api/v2/master/trades` | GET | 工種マスタ |
| `/api/v2/master/areas` | GET | エリアマスタ |

---

## 🚀 環境変数

### 必須
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### オプション
```env
RESEND_API_KEY=re_xxx             # メール送信
RESEND_FROM_EMAIL=noreply@xxx.com
LINE_CHANNEL_ACCESS_TOKEN=xxx     # LINE通知
NEXT_PUBLIC_VAPID_PUBLIC_KEY=xxx  # Push通知
VAPID_PRIVATE_KEY=xxx
```

---

## 📋 開発ワークフロー

### ブランチ戦略
- `main`: 本番デプロイ（Vercel自動デプロイ）
- `vercel-prod-sync`: 開発ブランチ

### 開発コマンド
```bash
npm run dev          # 開発サーバー起動
npm run build        # ビルド
npm run type-check   # 型チェック
npm run lint         # ESLint
npm run test         # Vitest テスト
```

### デプロイフロー
1. `vercel-prod-sync` で開発
2. 動作確認後 `main` にマージ
3. Vercel が自動デプロイ

---

## ⚠️ 既知の注意事項

### Next.js 16 対応済み
- `turbopack: {}` を next.config.mjs に追加
- `jsx: "react-jsx"` を tsconfig.json に設定
- `useSearchParams` は必ず `<Suspense>` で囲む
- Google Fonts は削除（システムフォント使用）

### Resend メールサービス
- ビルド時にAPIキーがなくてもエラーにならないよう遅延初期化
- `getResendClient()` で初めてアクセス時に初期化

### デモモード
- Supabase 接続なしでも動作するよう `demo-client.ts` あり
- RLSは `004_disable_rls_for_demo.sql` で無効化可能

---

## 🎯 次回開発時のクイックスタート

1. このファイルを読む
2. `npm run dev` で開発サーバー起動
3. `http://localhost:3000/v2` でログイン画面確認
4. Supabase ダッシュボードでデータ確認

---

## 📊 実装進捗

| フェーズ | 内容 | 状態 |
|---------|------|------|
| Phase 1 | 基礎機能 | ✅ 完了 |
| Phase 2 | 先着順予約・PWA | ✅ 完了 |
| Phase 3 | ダンドリワーク連携 | ✅ 完了 |
| Phase 4 | Supabase 移行 | ✅ 完了 |
| Phase 5 | 評価システム | ✅ 完了 |
| Phase 6 | カレンダー表示 | ⏳ 未実装 |

---

**最終更新**: 2025-12-16
**Next.js**: 16.0.10
**React**: 19.2.3
**npm audit**: 0 vulnerabilities
