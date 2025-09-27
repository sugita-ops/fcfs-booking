# Database Setup Example

## 実行コマンドと期待される結果

### 1. 環境変数設定

```bash
# .env.localファイルを作成
cp .env.example .env.local

# データベース接続を設定 (例：ローカルPostgreSQL)
DATABASE_URL="postgresql://username:password@localhost:5432/fcfs_booking"
```

### 2. マイグレーション実行

```bash
npm run db:migrate
```

**期待される出力:**
```
🚀 Starting database migrations...
📁 Found 2 migration files
🔄 Executing 001_initial_schema.sql...
✅ Successfully executed 001_initial_schema.sql
🔄 Executing 002_rls_policies.sql...
✅ Successfully executed 002_rls_policies.sql
🎉 All migrations completed successfully!
```

### 3. シードデータ投入

```bash
npm run db:seed
```

**期待される出力:**
```
🌱 Starting database seeding...
📁 Found 1 seed files
🌱 Executing 001_initial_data.sql...
✅ Successfully executed 001_initial_data.sql
🎉 All seeds completed successfully!
```

### 4. データベース検証

```bash
npm run db:verify
```

**期待される出力:**
```
🔍 Starting database verification...

📊 Table Counts:
   tenants: 1 records
   users: 4 records
   companies: 2 records
   memberships: 4 records
   qualifications: 2 records
   projects: 1 records
   job_posts: 1 records
   job_slots: 3 records

🏢 Tenant Validation:
   ✅ Tenant found: テスト建設株式会社 (dandori mode)

🏗️  Company Relationships:
   テスト建設株式会社 (General Contractor): 2 members, trades: general_construction
   山田内装工業 (Subcontractor): 2 members, trades: interior,drywall,flooring

📋 Available Job Slots:
   2024-11-05 (Slot 1): 5階内装仕上げ工事 - 28,000 JPY [available]
   2024-11-06 (Slot 1): 5階内装仕上げ工事 - 28,000 JPY [available]
   2024-11-07 (Slot 1): 5階内装仕上げ工事 - 28,000 JPY [available]

🔒 RLS Testing:
   With correct tenant_id: 3 slots visible
   With wrong tenant_id: 0 slots visible

🔗 Foreign Key Validation:
   job_slots -> job_posts: 3 valid links
   job_posts -> projects: 1 valid links
   memberships -> companies: 4 valid links

📇 Index Verification:
   Found 8 custom indexes:
   - idx_audit_logs_tenant_time on audit_logs
   - idx_claims_request_id on claims
   - idx_companies_tenant_trades on companies
   - idx_integration_outbox_pending on integration_outbox
   - idx_job_posts_tenant_published_dates on job_posts
   - idx_job_slots_open on job_slots
   - idx_job_slots_work_date on job_slots
   - idx_memberships_tenant_role on memberships
   - idx_users_email on users

✅ Database verification completed successfully!
```

## 手動検証クエリサンプル

### RLS動作確認

```sql
-- テナントコンテキスト設定
SELECT set_test_tenant('550e8400-e29b-41d4-a716-446655440001'::uuid);

-- データ参照（正常に表示される）
SELECT name FROM companies;

-- 別テナントに切り替え
SELECT set_test_tenant('550e8400-e29b-41d4-a716-446655440999'::uuid);

-- データ参照（何も表示されない）
SELECT name FROM companies;

-- テストコンテキストクリア
SELECT clear_test_tenant();
```

### FCFS用スロット確認

```sql
-- 利用可能なスロット一覧
SELECT
  js.id,
  js.work_date,
  js.status,
  jp.title,
  jp.unit_price
FROM job_slots js
JOIN job_posts jp ON js.job_post_id = jp.id
WHERE js.status = 'available'
ORDER BY js.work_date;
```

### 会社と権限確認

```sql
-- 会社ごとのユーザー数と権限
SELECT
  c.name as company_name,
  c.is_gc,
  COUNT(m.id) as member_count,
  string_agg(DISTINCT m.role, ', ') as roles
FROM companies c
LEFT JOIN memberships m ON c.id = m.company_id
GROUP BY c.id, c.name, c.is_gc
ORDER BY c.is_gc DESC;
```