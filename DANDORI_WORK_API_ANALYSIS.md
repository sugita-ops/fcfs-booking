# ダンドリワーク API 連携仕様分析

## API基本情報

- **API名**: ダンドリワーク連携用 API仕様
- **OpenAPI Version**: 3.0.2
- **API Version**: 1.5.0
- **Base URL**: `https://api.dandoli.jp/api`
- **認証方式**: Bearer Token (HTTP Authentication)

## エンドポイント一覧

### 現場（Sites）管理

| Method | Endpoint | 概要 |
|--------|----------|------|
| GET | `/co/places/{place_code}/sites` | 現場一覧の取得 |
| GET | `/co/places/{place_code}/sites/count` | 現場数取得 |
| PUT | `/co/places/{place_code}/sites/{site_code}` | 現場情報・更新（現場コード指定） |
| GET | `/co/places/{place_code}/sites/{site_code}/site_crews` | 現場参加者取得 |

### 現場資料（Documents）

| Method | Endpoint | 概要 |
|--------|----------|------|
| GET | `/co/places/{place_code}/sites/{site_code}/documents` | 現場資料情報の取得 |
| GET | `/co/places/{place_code}/sites/{site_code}/documents/{uuid}/download` | 現場資料取得 |

### 現場写真（Photos）

| Method | Endpoint | 概要 |
|--------|----------|------|
| GET | `/co/places/{place_code}/sites/{site_code}/site_photos` | 現場写真情報取得 |
| GET | `/co/places/{place_code}/sites/{site_code}/site_photos/{uuid}/download` | 現場写真取得 |
| GET | `/co/places/{place_code}/sites/{site_code}/site_photos/{uuid}/download_thumb` | 現場写真取得（サムネイル） |

### 設定（Settings）

| Method | Endpoint | 概要 |
|--------|----------|------|
| GET | `/co/places/{place_code}/settings/site_types` | プレイス設定-現場種類 取得 |

## データスキーマ

### Site（現場）オブジェクト

推定されるフィールド:

```typescript
interface DandoriWorkSite {
  site_code: string;          // 現場コード
  site_name?: string;         // 現場名
  start_date: string;         // 開始日（ISO 8601形式）
  end_date: string;           // 終了日（ISO 8601形式）
  address: string;            // 住所
  status: number;             // ステータス（数値コード）
  place_code: string;         // プレイスコード（親組織）
  // その他のフィールドは実際のAPIレスポンスから判明
}
```

## 認証

- **Type**: HTTP Bearer Authentication
- **Header**: `Authorization: Bearer {token}`
- **Token取得方法**: ユーザーから提供される検証環境の情報による

## ダンドリブッキングとのデータマッピング

### ダンドリワーク → ダンドリブッキング

| ダンドリワーク | ダンドリブッキング | 備考 |
|----------------|-------------------|------|
| `site_code` | `id` | プロジェクトID（一意識別子） |
| `site_name` | `name` | プロジェクト名 |
| `address` | `location` | 現場所在地 |
| `start_date` | `startDate` | プロジェクト開始日 |
| `end_date` | `endDate` | プロジェクト終了日 |
| `status` | - | ステータスコードは別途マッピングが必要 |
| `place_code` | - | テナント識別に使用可能 |

## 実装方針

### Phase 3.4.1: API連携基盤構築

#### 1. API Client Library
- **ファイル**: `src/lib/dandori-work-api.ts`
- **機能**:
  - Bearer Token認証
  - HTTP Client (fetch wrapper)
  - エラーハンドリング
  - レート制限対応
  - リトライロジック

#### 2. API Route Handlers
- **ファイル**: `src/app/api/dandori-work/route.ts`
- **エンドポイント**:
  - `GET /api/dandori-work/projects` - プロジェクト一覧取得
  - `POST /api/dandori-work/sync` - 同期実行
  - `GET /api/dandori-work/sync-status` - 同期状態確認

#### 3. データ同期ロジック
- **同期モード**: 差分同期（新規プロジェクトのみ）
- **同期間隔**: 手動トリガー or スケジュール実行（将来）
- **衝突解決**: ダンドリワークの データを優先

#### 4. 管理UI
- **ファイル**: `src/app/contractor/integrations/dandori-work/page.tsx`
- **機能**:
  - API Key設定
  - Place Code設定
  - 同期実行ボタン
  - 同期履歴表示
  - 同期ログ表示

## セキュリティ考慮事項

1. **API Token管理**:
   - 環境変数またはlocalStorageに保存
   - 暗号化推奨（将来の実装）

2. **データ検証**:
   - APIレスポンスの型チェック
   - 不正なデータの除外

3. **エラーハンドリング**:
   - ネットワークエラー
   - 認証エラー
   - APIレート制限エラー

## 次のステップ

1. ✅ API仕様の分析完了
2. ⏳ API Client Library実装
3. ⏳ 同期ロジック実装
4. ⏳ 管理UI実装
5. ⏳ テスト・検証

## 注意事項

- 現在の仕様はHTML仕様書からの推定です
- 実際のAPIレスポンス構造は実装中に確認が必要
- 検証環境のAPIキーが必要
