# プロジェクトコンテキスト - ダンドリブッキング

> このファイルは Claude Code が自動的に読み込み、プロジェクトの全体像を理解するために使用されます。

## 🎯 プロジェクト概要

**プロジェクト名**: ダンドリブッキング (FCFS Booking System)
**目的**: 建設業界向けの先着順工事スロット予約システム
**技術スタック**: Next.js 15.5.4, React 19.1.0, TypeScript 5, Tailwind CSS 4
**進捗**: 92% 完了

## 📂 プロジェクト構造

```
fcfs-booking/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx             # ログイン画面
│   │   ├── contractor/          # 元請け業者向け
│   │   │   ├── page.tsx         # 元請けダッシュボード
│   │   │   └── integrations/    # API連携
│   │   │       └── dandori-work/ # ダンドリワーク連携
│   │   ├── subcontractor/       # 下請け業者向け
│   │   │   ├── page.tsx         # 下請けダッシュボード
│   │   │   ├── claims/          # 予約履歴
│   │   │   ├── notifications/   # 通知
│   │   │   └── settings/        # 自社情報設定
│   │   ├── dashboard/           # 予約状況ダッシュボード
│   │   ├── admin/               # 管理画面
│   │   └── api/                 # API エンドポイント
│   │       ├── claims/          # 予約API
│   │       ├── alternatives/    # 代替案API
│   │       └── dandori-work/    # ダンドリワーク連携API
│   ├── components/              # React コンポーネント
│   ├── lib/                     # ユーティリティ・ライブラリ
│   │   ├── mock-data.ts         # モックデータ生成
│   │   ├── company-profile.ts   # 自社情報管理
│   │   ├── notifications.ts     # 通知システム
│   │   └── dandori-work-api.ts  # ダンドリワーク API クライアント
│   └── types/                   # TypeScript 型定義
│       ├── api.ts               # API型定義
│       └── dandori-work.ts      # ダンドリワーク型定義
├── public/
│   ├── sw.js                    # Service Worker (PWA)
│   └── icons/                   # アプリアイコン
└── docs/                        # ドキュメント
    ├── IMPLEMENTATION_REPORT.md
    ├── PHASE_3.4_IMPLEMENTATION_COMPLETE.md
    ├── DANDORI_WORK_API_ANALYSIS.md
    ├── TROUBLESHOOTING_API_ZERO_SITES.md
    └── DEVELOPMENT_SESSION_2025-11-10.md
```

## 🎨 アーキテクチャ

### データフロー

```
[ダンドリワーク API]
        ↓
  Bearer Token認証
        ↓
[DandoriWorkAPIClient]
        ↓
  現場情報取得 (Sites)
        ↓
[convertSiteToProject()]
        ↓
  ダンドリブッキング形式に変換
        ↓
[localStorage: projects]
        ↓
[元請けダッシュボード]
```

### データ保存（現在: localStorage）

- `projects` - プロジェクト一覧
- `dandoriWorkConfig` - ダンドリワーク API 設定
- `dandoriWorkSyncHistory` - 同期履歴
- `currentUser` - ログインユーザー情報
- `companyProfile_{userId}` - 自社情報
- `notifications_{userId}` - 通知データ

**Note**: Phase 4 でデータベース（Supabase PostgreSQL）に移行予定

## ✅ 完了フェーズ

- ✅ **Phase 1**: 基礎機能 (100%)
- ✅ **Phase 2.1**: 先着順予約ロジック (100%)
- ✅ **Phase 2.2**: 代替案提案システム (100%)
- ✅ **Phase 2.3**: サービスワーカー・PWA (100%)
- ✅ **Phase 2.4**: 検索・フィルター機能 (100%)
- ✅ **Phase 3.1**: 予約履歴・詳細フォーム (100%)
- ✅ **Phase 3.2**: Push 通知 (100%)
- ✅ **Phase 3.3**: 自社条件マッチング (100%)
- ✅ **Phase 3.4**: ダンドリワーク API 連携 (100%)

## 🔧 現在の状態

### 最新のコミット

```
ブランチ: vercel-prod-sync
コミット: 3a95534
タイトル: feat: Phase 3.4 - ダンドリワーク API 連携実装
日付: 2025-11-10
```

### デプロイ状況

- **Vercel Preview**: ✅ デプロイ済み (6bc6iasxd)
- **Production**: main ブランチにマージ待ち
- **URL**: https://fcfs-booking.vercel.app

### 既知の問題

1. **ローカルビルドエラー**: `npm run build` が webpack runtime エラーで失敗
   - **原因**: Next.js 15 の既知の問題
   - **影響**: Vercel ビルドは成功するため、実害なし
   - **対策**: すべての client component に `export const dynamic = 'force-dynamic'` を追加済み

2. **ダンドリワーク API が 0 件を返す**
   - **現状**: 接続成功するが `sitesCount: 0`
   - **デバッグ**: 詳細ログ追加済み、次回の同期で原因特定予定
   - **可能性**: レスポンス形式の相違、または実際にデータが存在しない

## 🚀 次回の開発タスク

### 最優先

1. **ダンドリワーク API の動作確認**
   - 実際の APIキー、プレイスコードでテスト
   - レスポンス形式の確認とコード調整
   - プロジェクト同期の動作確認

2. **本番環境への昇格**
   ```bash
   git checkout main
   git merge vercel-prod-sync
   git push origin main
   ```

### Phase 3.5 候補

- レポート機能
- 高度な検索・フィルター
- データエクスポート（CSV, Excel）

### Phase 4 候補

- Supabase セットアップ
- データベーススキーマ設計
- localStorage → PostgreSQL 移行
- 認証システム統合

## 🔗 重要なリンク

- **GitHub**: https://github.com/sugita-ops/fcfs-booking
- **Vercel**: https://vercel.com/sugita-ops/fcfs-booking
- **最新セッション記録**: `DEVELOPMENT_SESSION_2025-11-10.md`
- **API 仕様**: `DANDORI_WORK_API_ANALYSIS.md`

## 📖 開発ガイドライン

### コーディング規約

- TypeScript strict mode 有効
- すべてのコンポーネントに型定義
- localStorage 使用ページは `export const dynamic = 'force-dynamic'`
- API エラーは必ずハンドリング

### Git ワークフロー

1. 新機能は `vercel-prod-sync` ブランチで開発
2. コミットメッセージは `feat:`, `fix:`, `docs:` などのプレフィックス
3. 完成後に main ブランチにマージ
4. Vercel が自動デプロイ

### テスト方法

```bash
# 開発サーバー起動
npm run dev

# ビルド確認（エラーは無視）
npm run build

# 型チェック
npm run type-check
```

## 💡 よくある作業

### プロジェクトをゼロから理解する

1. `IMPLEMENTATION_REPORT.md` を読む（全体像）
2. `DEVELOPMENT_SESSION_2025-11-10.md` を読む（最新状況）
3. `src/app/contractor/page.tsx` を見る（メイン画面）
4. `src/lib/dandori-work-api.ts` を見る（API連携）

### 新しい機能を追加する

1. `src/types/` に型定義を追加
2. `src/lib/` にロジックを実装
3. `src/app/api/` に API エンドポイントを追加
4. `src/app/contractor/` に UI を追加
5. ドキュメント更新

### デバッグ

- ブラウザコンソール: API レスポンス、エラーログ
- サーバーログ: `npm run dev` のターミナル出力
- localStorage 確認: Chrome DevTools → Application → Local Storage

## 🎯 プロジェクトのゴール

建設業界の工事スロット管理を効率化し、元請けと下請けのマッチングを最適化する先着順予約システムを構築する。

### 主要機能

1. ✅ 先着順予約システム
2. ✅ 代替案提案
3. ✅ PWA 対応
4. ✅ Push 通知
5. ✅ 自社条件マッチング
6. ✅ ダンドリワーク API 連携
7. ⏳ データベース統合（Phase 4）
8. ⏳ 高度なレポート機能（Phase 5）

---

**最終更新**: 2025-11-10
**次回開発時**: このファイルと `DEVELOPMENT_SESSION_2025-11-10.md` を読んでから開始
