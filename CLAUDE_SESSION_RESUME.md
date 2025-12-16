# Claude セッション復帰ファイル

**最終更新**: 2025-11-27
**目的**: Claude Code再起動後にこのファイルを読み込むだけで開発を100%再開できる

---

## クイックスタート

```bash
cd /Users/dw1002/fcfs-booking
npm run dev
```

開発サーバー: http://localhost:3000

---

## プロジェクト概要

**プロジェクト名**: ダンドリブッキング (Dandori Booking)
**リポジトリ**: https://github.com/sugita-ops/fcfs-booking
**本番URL**: https://fcfs-booking.vercel.app

**概要**: 建設現場における元請けと下請け業者間の工事スロット予約システム。先着順（FCFS）方式による公平な案件分配。

---

## 現在の状態

### Git状態
- **ブランチ**: `vercel-prod-sync`
- **最新コミット**: `3a95534` - "feat: Phase 3.4 - ダンドリワーク API 連携実装"
- **未コミット**: `.claude/`, `DEVELOPMENT_SESSION_2025-11-10.md`

### 進捗状況: 92%完了

| フェーズ | 状況 | 進捗 |
|---------|------|------|
| Phase 1: 基礎機能 | ✅完了 | 100% |
| Phase 2.1: 先着順予約ロジック | ✅完了 | 100% |
| Phase 2.2: 代替案提案システム | ✅完了 | 100% |
| Phase 2.3: サービスワーカー・PWA | ✅完了 | 100% |
| Phase 2.4: 検索・フィルター機能 | ✅完了 | 100% |
| Phase 3.1: 予約履歴・詳細フォーム | ✅完了 | 100% |
| Phase 3.2: Push通知 | ✅完了 | 100% |
| Phase 3.3: 自社条件マッチング | ✅完了 | 100% |
| Phase 3.4: ダンドリワークAPI連携 | ✅完了 | 100% |
| Phase 3.5: その他元請け機能 | ⏳未着手 | 0% |
| Phase 4: データベース移行 | ⏳未着手 | 0% |
| Phase 5: 高度な機能 | ⏳未着手 | 0% |

---

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript 5
- **UI**: React 19 + Tailwind CSS 4
- **PWA**: Serwist 9.2.1
- **デプロイ**: Vercel
- **データ**: 現在localStorage（Phase 4でSupabase/PostgreSQL移行予定）

---

## 主要ファイル構成

```
src/
├── app/
│   ├── page.tsx                    # ログイン画面
│   ├── contractor/                 # 元請けダッシュボード
│   │   ├── page.tsx
│   │   └── integrations/
│   │       └── dandori-work/page.tsx  # ダンドリワーク連携画面
│   ├── subcontractor/              # 下請け画面
│   │   ├── page.tsx               # 案件検索・予約
│   │   ├── claims/page.tsx        # 予約履歴
│   │   ├── notifications/page.tsx # 通知
│   │   └── settings/page.tsx      # 自社情報設定
│   ├── api/
│   │   └── dandori-work/          # ダンドリワークAPI
│   │       ├── sync/route.ts
│   │       └── test-connection/route.ts
│   └── sw.ts                       # Service Worker
├── lib/
│   ├── dandori-work-api.ts         # ダンドリワークAPIクライアント
│   ├── mock-data/                  # モックデータ
│   ├── notifications.ts
│   └── push-notifications.ts
├── components/
│   ├── MobileBottomNav.tsx
│   ├── SearchFilterForm.tsx
│   └── ...
└── types/
    └── dandori-work.ts             # ダンドリワーク型定義
```

---

## 前回のセッション（2025-11-10）で完了したこと

### Phase 3.4: ダンドリワークAPI連携
1. **APIクライアント実装** (`src/lib/dandori-work-api.ts`)
   - Bearer Token認証
   - 自動リトライ（最大3回、指数バックオフ）
   - タイムアウト処理（30秒）

2. **APIエンドポイント**
   - `/api/dandori-work/sync` - 同期実行
   - `/api/dandori-work/test-connection` - 接続テスト

3. **管理UI** (`src/app/contractor/integrations/dandori-work/page.tsx`)
   - API設定（APIキー、プレイスコード、ベースURL）
   - 接続テスト機能
   - 手動同期実行
   - 同期履歴表示

4. **ビルドエラー修正**
   - Next.js 15でlocalStorage使用時のSSGエラー
   - `export const dynamic = 'force-dynamic'` を追加

---

## 既知の問題・要確認事項

### 1. ダンドリワークAPI 0件問題
**症状**: 接続成功するが `sitesCount: 0`

**確認方法**:
```
ブラウザコンソールで確認:
[DandoriWork API] Full response: {...}
```

**原因の可能性**:
- APIレスポンス形式が想定と異なる
- テスト環境に現場データが未登録
- プレイスコードが正しくない

**修正箇所**: `src/lib/dandori-work-api.ts` の `getSites()` メソッド

### 2. ローカルビルドエラー
`npm run build` がローカルで失敗する場合があるが、Vercelでは成功する（Next.js 15の既知の問題）

---

## 次にやるべきこと（優先順位順）

### 即時対応
1. **ダンドリワークAPI動作確認**
   - 実際のAPIキー・プレイスコードでテスト
   - レスポンス形式の確認・調整

2. **本番デプロイ**（API確認後）
   ```bash
   git checkout main
   git merge vercel-prod-sync
   git push origin main
   ```

### Phase 3.5: その他元請け機能
- レポート機能
- 高度な検索・フィルター
- データエクスポート（CSV, Excel）

### Phase 4: データベース移行
- Supabaseセットアップ
- localStorage → PostgreSQL移行
- 認証システム統合

---

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド（ローカルでエラーが出てもVercelでは成功する）
npm run build

# VAPID鍵生成（Push通知用）
npm run generate-vapid

# 複数サーバーが起動している場合
lsof -i :3000
kill -9 [PID]
```

---

## 環境変数（Vercel設定済み）

| 変数名 | 用途 |
|--------|------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Push通知公開鍵 |
| `VAPID_PRIVATE_KEY` | Push通知秘密鍵 |

---

## 関連ドキュメント

| ファイル | 内容 |
|----------|------|
| `IMPLEMENTATION_REPORT.md` | プロジェクト全体の実装状況 |
| `DANDORI_WORK_API_ANALYSIS.md` | ダンドリワークAPI仕様分析 |
| `PHASE_3.4_IMPLEMENTATION_COMPLETE.md` | Phase 3.4完了レポート |
| `TROUBLESHOOTING_API_ZERO_SITES.md` | API 0件問題のトラブルシューティング |
| `DEVELOPMENT_SESSION_2025-11-10.md` | 2025-11-10セッション詳細記録 |

---

## Claudeへの指示

このファイルを読んだら、以下を確認してください：

1. 現在のブランチが `vercel-prod-sync` であること
2. 開発サーバーが起動可能であること
3. ユーザーが何をしたいか確認すること

**質問例**:
- 「ダンドリワークAPIの動作確認をしますか？」
- 「本番デプロイを進めますか？」
- 「Phase 3.5の開発を始めますか？」
- 「他に優先したいタスクはありますか？」

---

**このファイルは開発セッション終了時に更新してください**
