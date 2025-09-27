# フェーズ2：早い者勝ちAPI ガイド

## 概要

建築現場受注システムの核心機能である「早い者勝ち（FCFS）」受注確定APIと代替候補提示APIの実装です。

## 実装機能

### 🎯 POST /api/claims（原子的受注確定）

**目的**: job_slotsの1枠をFCFSで確定。二重確定は409でブロック。

**エンドポイント**: `POST /api/claims`

**認証**: Bearer JWT（tenant_idを含む）

**リクエスト**:
```json
{
  "slotId": "550e8400-e29b-41d4-a716-446655440601",
  "companyId": "550e8400-e29b-41d4-a716-446655440302",
  "requestId": "req_12345_67890"
}
```

**成功レスポンス (200 OK)**:
```json
{
  "slot": {
    "id": "550e8400-e29b-41d4-a716-446655440601",
    "status": "claimed",
    "work_date": "2024-11-05"
  },
  "claim": {
    "id": "claim_uuid",
    "company_id": "550e8400-e29b-41d4-a716-446655440302",
    "user_id": "550e8400-e29b-41d4-a716-446655440201",
    "claimed_at": "2024-09-27T07:30:15.123Z"
  }
}
```

**競合エラー (409 Conflict)**:
```json
{
  "code": "ALREADY_CLAIMED",
  "message": "This slot has been claimed by someone else."
}
```

### 🔍 GET /api/alternatives（代替候補取得）

**目的**: 409時に提示する候補を返す。

**エンドポイント**: `GET /api/alternatives?slotId={uuid}&days={number}`

**パラメータ**:
- `slotId`: 対象スロットID（必須）
- `days`: 検索範囲日数（デフォルト: 3）

**レスポンス**:
```json
{
  "alternatives": [
    {
      "slot_id": "550e8400-e29b-41d4-a716-446655440602",
      "work_date": "2024-11-06",
      "job_post": {
        "id": "550e8400-e29b-41d4-a716-446655440501",
        "title": "5階内装仕上げ工事",
        "trade": "interior"
      }
    }
  ]
}
```

## 主要SQL文

### FCFS原子的UPDATE

```sql
UPDATE job_slots
SET
  claimed_by_company = $1,
  claimed_by_user = $2,
  claimed_at = now(),
  status = 'claimed',
  updated_at = now()
WHERE
  id = $3
  AND tenant_id = $4
  AND status = 'available'
RETURNING
  id, job_post_id, work_date, status, claimed_at;
```

### 代替候補検索

```sql
SELECT
  js.id as slot_id,
  js.work_date,
  jp.id as job_post_id,
  jp.title,
  jp.trade
FROM job_slots js
JOIN job_posts jp ON js.job_post_id = jp.id
WHERE
  jp.project_id = $1
  AND jp.trade = $2
  AND js.status = 'available'
  AND js.id != $3
  AND js.work_date BETWEEN
    ($4::date - INTERVAL '1 day' * $6) AND
    ($4::date + INTERVAL '1 day' * $6)
  AND js.tenant_id = $5
ORDER BY
  js.work_date ASC,
  js.created_at DESC
LIMIT 3;
```

## トランザクション境界

### /api/claims処理フロー

```
BEGIN
├── 1. 冪等性チェック（request_id重複確認）
├── 2. 原子的UPDATE（条件付きスロット確定）
├── 3. claims テーブル INSERT
├── 4. integration_outbox INSERT（DW連携用）
├── 5. audit_logs INSERT（監査記録）
COMMIT
```

**重要**: 全ての操作が単一トランザクション内で実行され、1つでも失敗すれば全てロールバック。

## curl動作確認例

### 環境設定

```bash
# 開発用JWT（テスト用）
export DEV_JWT="dev-token"
export API_BASE="http://localhost:3000"

# テストデータのUUID
export SLOT_ID="550e8400-e29b-41d4-a716-446655440601"
export COMPANY_ID="550e8400-e29b-41d4-a716-446655440302"
```

### 成功例：初回クレーム

```bash
curl -X POST $API_BASE/api/claims \
  -H "Authorization: Bearer $DEV_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "slotId": "'$SLOT_ID'",
    "companyId": "'$COMPANY_ID'",
    "requestId": "req_'$(date +%s)'"
  }'
```

**期待される出力**:
```json
{
  "slot": {
    "id": "550e8400-e29b-41d4-a716-446655440601",
    "status": "claimed",
    "work_date": "2024-11-05"
  },
  "claim": {
    "id": "claim_generated_uuid",
    "company_id": "550e8400-e29b-41d4-a716-446655440302",
    "user_id": "550e8400-e29b-41d4-a716-446655440201",
    "claimed_at": "2024-09-27T07:30:15.123Z"
  }
}
```

### 競合例：2回目のクレーム

```bash
curl -X POST $API_BASE/api/claims \
  -H "Authorization: Bearer $DEV_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "slotId": "'$SLOT_ID'",
    "companyId": "'$COMPANY_ID'",
    "requestId": "req_'$(date +%s)'"
  }'
```

**期待される出力**:
```json
{
  "code": "ALREADY_CLAIMED",
  "message": "This slot has been claimed by someone else."
}
```

### 冪等性例：同一requestId

```bash
REQUEST_ID="req_idempotency_test"

# 1回目
curl -X POST $API_BASE/api/claims \
  -H "Authorization: Bearer $DEV_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "slotId": "'$SLOT_ID'",
    "companyId": "'$COMPANY_ID'",
    "requestId": "'$REQUEST_ID'"
  }'

# 2回目（同一結果を返す）
curl -X POST $API_BASE/api/claims \
  -H "Authorization: Bearer $DEV_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "slotId": "'$SLOT_ID'",
    "companyId": "'$COMPANY_ID'",
    "requestId": "'$REQUEST_ID'"
  }'
```

### 代替候補取得

```bash
curl "$API_BASE/api/alternatives?slotId=$SLOT_ID&days=3" \
  -H "Authorization: Bearer $DEV_JWT"
```

**期待される出力**:
```json
{
  "alternatives": [
    {
      "slot_id": "550e8400-e29b-41d4-a716-446655440602",
      "work_date": "2024-11-06",
      "job_post": {
        "id": "550e8400-e29b-41d4-a716-446655440501",
        "title": "5階内装仕上げ工事",
        "trade": "interior"
      }
    },
    {
      "slot_id": "550e8400-e29b-41d4-a716-446655440603",
      "work_date": "2024-11-07",
      "job_post": {
        "id": "550e8400-e29b-41d4-a716-446655440501",
        "title": "5階内装仕上げ工事",
        "trade": "interior"
      }
    }
  ]
}
```

## エラーパターン

| HTTPステータス | コード | 説明 | 対処法 |
|---|---|---|---|
| 400 | VALIDATION_ERROR | リクエストボディ不正 | スキーマ確認 |
| 401 | UNAUTHORIZED | 認証失敗 | JWTトークン確認 |
| 403 | FORBIDDEN | アクセス権限なし | tenant_id確認 |
| 404 | NOT_FOUND | リソース不存在 | slotId確認 |
| 409 | ALREADY_CLAIMED | 既にクレーム済み | 代替候補取得 |
| 422 | VALIDATION_ERROR | パラメータ形式不正 | UUID形式確認 |
| 500 | INTERNAL_ERROR | サーバーエラー | ログ確認 |

## テスト実行

```bash
# 全テスト実行
npm test

# 特定テスト実行
npm test -- claims.test.ts

# 並行処理テストのみ
npm test -- --grep "concurrent"
```

## RLS動作確認

```sql
-- 正しいテナント設定
SELECT set_test_tenant('550e8400-e29b-41d4-a716-446655440001'::uuid);
SELECT COUNT(*) FROM job_slots; -- 3件表示される

-- 間違ったテナント設定
SELECT set_test_tenant('550e8400-e29b-41d4-a716-446655440999'::uuid);
SELECT COUNT(*) FROM job_slots; -- 0件表示される

-- テストコンテキストクリア
SELECT clear_test_tenant();
```

## 監査ログ確認

```sql
SELECT
  action,
  target_table,
  target_id,
  payload,
  created_at
FROM audit_logs
WHERE action = 'claim'
ORDER BY created_at DESC
LIMIT 5;
```

## Integration Outbox確認

```sql
SELECT
  event_name,
  status,
  payload,
  created_at
FROM integration_outbox
WHERE event_name = 'claim.confirmed'
ORDER BY created_at DESC
LIMIT 5;
```