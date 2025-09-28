# FCFS Booking System

建築現場「早い者勝ち」受注システムのMVP実装です。

## 技術スタック

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Supabase互換/RLS対応)
- **Authentication**: JWT (Bearer Token)
- **Validation**: Zod
- **Testing**: Vitest, Testing Library
- **Code Quality**: ESLint, Prettier

## 主要機能

- ✅ マルチテナント対応（RLS）
- ✅ 早い者勝ち（FCFS）受注確定
- ✅ 競合時の代替候補提示
- ✅ ダンドリワーク連携（アウトボックスパターン）
- ✅ 監査ログ完備
- ✅ 並行処理対応

## 開発環境セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env.local
```

`.env.local`を編集してDB接続情報等を設定してください。

### 3. データベースセットアップ

```bash
# マイグレーション実行
npm run db:migrate

# シードデータ投入
npm run db:seed
```

### 4. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 でアプリケーションにアクセスできます。

## 開発用コマンド

### 基本操作
- `npm run dev` - 開発サーバー起動
- `npm run build` - プロダクションビルド
- `npm run start` - プロダクションサーバー起動

### コード品質
- `npm run lint` - ESLintチェック
- `npm run lint:fix` - ESLint自動修正
- `npm run format` - Prettier自動フォーマット
- `npm run format:check` - Prettierチェック
- `npm run type-check` - TypeScript型チェック

### テスト
- `npm test` - テスト実行（Watch Mode）
- `npm run test:run` - テスト実行（一回のみ）
- `npm run test:ui` - テストUI起動

### データベース
- `npm run db:migrate` - マイグレーション実行
- `npm run db:seed` - シードデータ投入
- `npm run db:verify` - データベース接続確認

### アウトボックスワーカー
- `npm run worker:start` - バックグラウンドワーカー起動
- `npm run worker:test` - Webhook疎通テスト
- `npm run test:concurrent` - 並列処理テスト実行

### 管理画面
- 管理画面アクセス: `http://localhost:3000/admin`
- 認証: Bearer トークン（開発時は 'dev-token'）
- 権限: ops_admin のみアクセス可能

## プロジェクト構成

```
fcfs-booking/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # APIエンドポイント
│   │   ├── page.tsx        # ルートページ
│   │   └── layout.tsx      # レイアウト
│   ├── components/         # Reactコンポーネント
│   │   ├── ui/            # 汎用UIコンポーネント
│   │   └── features/      # 機能別コンポーネント
│   ├── lib/               # ユーティリティ
│   └── types/             # TypeScript型定義
├── migrations/            # DBマイグレーション
├── seeds/                # シードデータ
├── tests/                # テストファイル
└── lib/                  # Node.jsスクリプト
```

## API エンドポイント

### 受注管理
- `POST /api/claims` - 受注確定
- `POST /api/cancel-claim` - 受注キャンセル
- `GET /api/alternatives` - 代替候補取得

### 案件管理
- `GET /api/job-posts` - 案件一覧取得

### 管理機能
- `POST /api/admin/tenants` - テナント作成
- `POST /api/admin/invite` - ユーザー招待
- `POST /api/admin/impersonate` - なりすまし

### 連携
- `POST /api/integrations/dw/outbox/emit` - DW連携イベント送信

## テスト

### 並行処理テスト
```bash
# 同一スロットへの10並列POST（成功1・他409）
npm run test:concurrent

# または並列数指定
npm run test:concurrent 20
```

### RLSテスト
```bash
# テナント分離確認
npm test -- --run rls
```

### アウトボックステスト
```bash
# Webhook疎通確認
npm run worker:test

# アウトボックス処理確認
npm test -- --run outbox
```

### OpenAPI仕様
```bash
# スキーマ取得
curl http://localhost:3000/api/openapi.json

# ReDoc表示（Webブラウザで開く）
# https://redoc.ly/redoc/?url=http://localhost:3000/api/openapi.json
```

## デプロイ

### Vercel (推奨)
1. Vercel CLIインストール: `npm i -g vercel`
2. デプロイ: `vercel --prod`

### Docker
```bash
docker build -t fcfs-booking .
docker run -p 3000:3000 fcfs-booking
```

## 運用手順

### 管理画面での操作

#### テナント管理（/admin）
- **統合モード切替**: standalone ⇄ dandori への切り替え
- **有効化/無効化**: テナントの状態変更
- **監査記録**: すべての変更は audit_logs に記録

#### アウトボックス監視（/admin/outbox）
- **タブ切替**: pending / sent / failed でフィルタリング
- **詳細表示**: イベントの payload やリトライ情報を確認
- **再送操作**: 失敗したイベントの手動再送

#### 監査ログ（/admin/audit）
- **期間絞り込み**: デフォルト7日間、カスタム期間設定可能
- **フィルタ**: 実行者、アクション、対象テーブル別
- **詳細表示**: payload の詳細内容を JSON 形式で確認

#### CSVインポート（/admin/import）
- **対応形式**: 会社・ユーザー・プロジェクト
- **テンプレート**: ダウンロード可能な CSV テンプレート
- **検証機能**: インポート前のデータ検証
- **結果表示**: 成功/失敗件数とエラー詳細

### APIでの運用操作

#### 失敗したアウトボックスイベントの確認
```bash
# 失敗イベント一覧取得
curl -H "Authorization: Bearer dev-token" \
     "http://localhost:3000/api/admin/outbox?status=failed"

# 特定イベントの再送
curl -X POST -H "Authorization: Bearer dev-token" \
     "http://localhost:3000/api/admin/outbox/123/requeue"
```

#### テナント設定変更
```bash
# 統合モード変更
curl -X PUT -H "Authorization: Bearer dev-token" \
     -H "Content-Type: application/json" \
     -d '{"integration_mode":"dandori"}' \
     "http://localhost:3000/api/admin/tenants/TENANT_ID"
```

### ヘルスチェック
```bash
curl http://localhost:3000/healthz
```

## 権限制御

### 認証方式
- **JWT Bearer Token**: `Authorization: Bearer <token>` ヘッダー
- **開発用トークン**: `dev-token`（すべての権限を持つ）
- **本番環境**: 適切な JWT トークンを設定

### 権限レベル
- **ops_admin**: 管理画面へのフルアクセス
  - テナント管理
  - アウトボックス監視・再送
  - 監査ログ閲覧
  - CSVインポート
- **sub_admin**: 通常の API アクセス（受注確定・キャンセル等）
- **worker**: 基本的な操作のみ

### 管理画面アクセス制御
```typescript
// 管理画面は ops_admin のみアクセス可能
const authCheck = await fetch('/api/admin/auth-check', {
  headers: { 'Authorization': `Bearer ${token}` }
});

if (!authCheck.ok) {
  // アクセス拒否 → ホーム画面にリダイレクト
}
```

### RLS（Row Level Security）
- **テナント分離**: すべてのデータは tenant_id で分離
- **自動適用**: JWT の tenant_id を使用して自動フィルタリング
- **管理操作**: 管理画面では RLS を適切に設定して全テナント操作可能

## トラブルシューティング

### データベース接続エラー
- `.env.local`のDATABASE_URLを確認
- PostgreSQLサーバーが起動しているか確認

### 型エラー
```bash
npm run type-check
```

### テスト失敗
```bash
npm run test:run -- --reporter=verbose
```

### CIでのテスト失敗
```bash
# CI環境でのログ確認
# GitHub Actionsのログを参照
# テストレポートはArtifactsからダウンロード可能
```

## ライセンス

MIT License
# Force deploy 2025年 9月28日 日曜日 20時00分49秒 JST
# Trigger deploy 2025年 9月28日 日曜日 20時40分04秒 JST
