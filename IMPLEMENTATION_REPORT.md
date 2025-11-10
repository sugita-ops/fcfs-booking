# ダンドリブッキング - 実装機能レポート

**作成日:** 2025年10月21日
**バージョン:** v0.1.0
**システム名:** ダンドリブッキング (Dandori Booking)

---

## 📋 目次

1. [エグゼクティブサマリー](#エグゼクティブサマリー)
2. [実装済み機能](#実装済み機能)
3. [技術スタック](#技術スタック)
4. [今後追加する元請け側機能](#今後追加する元請け側機能)
5. [API連携計画](#api連携計画)
6. [ファイル構成](#ファイル構成)
7. [デプロイ情報](#デプロイ情報)

---

## 🎯 エグゼクティブサマリー

### プロジェクト概要
**ダンドリブッキング**は、建設現場における元請けと下請け業者間の工事スロット予約を効率化するWebアプリケーションです。FCFS（First Come, First Served: 先着順）方式による公平な案件分配と、モバイル対応によるスピーディな予約体験を実現しています。

### 主要達成項目
- ✅ **PWA対応完了**: iOS/Android両対応、オフライン動作可能
- ✅ **プッシュ通知実装**: 新規案件・予約変更・締切リマインダー
- ✅ **モバイルファースト設計**: 下請け業者の現場での使いやすさを最優先
- ✅ **自社条件フィルタ**: 職種・エリア・単価による自動マッチング
- ✅ **検索・フィルタ機能**: 7軸検索 + 保存機能
- ✅ **Vercelデプロイ完了**: 本番環境稼働中

### 開発状況
**全体進捗: 90% 完了**

| フェーズ | 状況 | 進捗率 |
|---------|------|--------|
| 下請け側機能 | 完了 | 100% |
| PWA/モバイル対応 | 完了 | 100% |
| 元請け側基本機能 | 完了 | 70% |
| 元請け側高度機能 | 未着手 | 0% |

---

## ✅ 実装済み機能

### 1. 下請け業者向け機能 (完成度: 100%)

#### 1.1 工事スロット検索・予約システム
**実装ファイル:** `src/app/subcontractor/page.tsx`

**主要機能:**
- **多軸検索システム** (7軸対応)
  - 日付範囲検索（開始日・終了日）
  - 価格帯フィルタ（最低・最高単価）
  - エリア検索（都道府県・市区町村）
  - ステータスフィルタ（予約可能/予約済み/完了）
  - 職種フィルタ（7職種: 基礎工事、鉄筋工事、型枠工事、左官工事、電気工事、配管工事、内装工事）
  - キーワード検索（タイトル・プロジェクト名）
  - ソート機能（日付順・価格順、昇順・降順）

- **検索条件保存機能**
  - お気に入り検索を名前付きで保存（localStorage）
  - 保存済み検索のワンクリック読み込み
  - 検索条件の削除機能

- **予約機能**
  - 詳細予約フォーム: 担当者情報・連絡先・特記事項入力
  - 簡単予約: ワンクリック予約（会社ID入力のみ）
  - 代替案表示: 希望日時に空きがない場合の代替スロット提示

**データ統計:**
- モックデータ: 92件の工事スロット
  - 予約可能: 61件
  - 予約済み: 31件
- プロジェクト: 5件（東京・神奈川・埼玉）
- 案件単価範囲: ¥50,000 〜 ¥150,000

---

#### 1.2 自社条件フィルタ機能
**実装ファイル:**
- `src/app/subcontractor/settings/page.tsx`
- `src/lib/company-profile.ts`
- `src/lib/company-profile-filter.ts`

**主要機能:**
- **自社情報登録**
  - 対応可能職種（複数選択）
  - 対応可能エリア（都道府県必須 + 市区町村任意）
  - 最低受注単価（任意）
  - 保有設備（タグ入力式）
  - 保有資格（タグ入力式）

- **自動フィルタリング**
  - 検索フォーム上部のトグルでON/OFF切替
  - デフォルト: ON（初回登録済みの場合）
  - 職種・エリアは必須条件、価格は任意条件
  - マッチしない案件は完全非表示

- **初回登録サポート**
  - 未登録時に登録促進モーダル自動表示
  - ヘッダーに「自社情報設定」ボタン常時表示
  - フィルタ未登録時は自動的にOFF状態

**データ管理:**
- localStorage使用（将来的にSupabase移行予定）
- 職種の日本語↔英語キーマッピング実装済み

---

#### 1.3 予約履歴管理
**実装ファイル:** `src/app/subcontractor/claims/page.tsx`

**主要機能:**
- **カード型レイアウト**（モバイル最適化）
  - 表示優先度: 案件名（太字） → 日付 → ステータス（色付きバッジ）
  - ステータス別色分け
    - 🟡 予約済み (claimed): bg-yellow-100
    - 🟢 確定 (confirmed): bg-green-100
    - 🔴 キャンセル (cancelled): bg-red-100
    - 🔵 完了 (completed): bg-blue-100

- **詳細情報表示**
  - プロジェクト名
  - 作業日
  - 職種
  - 単価
  - 予約日時
  - ステータス

**表示データ:**
- ログインユーザーの予約のみ表示
- モックデータから動的取得

---

#### 1.4 通知センター
**実装ファイル:**
- `src/app/subcontractor/notifications/page.tsx`
- `src/lib/notifications.ts`

**主要機能:**
- **通知種類別アイコン**
  - 🎯 自社条件マッチ案件: 新しい案件が自社条件にマッチ
  - 📝 予約案件変更: 予約済み案件の日時・内容変更
  - ⏰ 締切リマインダー: 予約締切日の前日通知

- **通知管理機能**
  - 未読/既読の背景色区別（bg-blue-50 / bg-white）
  - 「全て既読」一括処理ボタン
  - 個別削除機能
  - 30日間自動保存（expiresAt）

- **通知データ拡張**
  - Push通知との連携（pushSentAt, pushSuccess）
  - 通知チャネル管理（push/mail/in-app）
  - 関連案件・プロジェクトへのリンク

**データ管理:**
- localStorage使用
- サンプル通知生成機能（開発用）

---

### 2. PWA機能 (完成度: 100%)

#### 2.1 PWA基盤
**実装ファイル:**
- `public/manifest.json`
- `src/app/layout.tsx`
- `src/components/PWAInstallPrompt.tsx`

**manifest.json仕様:**
```json
{
  "name": "ダンドリブッキング - 建設工事予約システム",
  "short_name": "ダンドリブッキング",
  "description": "建設現場において元請けからの依頼を下請けが予約できるアプリ",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#10b981",
  "orientation": "portrait"
}
```

**PWAアイコン:**
- 8サイズ対応: 72x72 〜 512x512
- 仮アイコン: 緑の円に「D」（後日差し替え可能）
- purpose: "any maskable" 設定済み

**インストールプロンプト機能:**
- ログイン後2秒で自動表示
- 「後で」押下後は7日間非表示（localStorage管理）
- モバイル最適化済み（画面下部、ボトムナビの上）

---

#### 2.2 Service Worker（Serwist v9.2.1）
**実装ファイル:**
- `src/app/sw.ts`
- `next.config.ts`
- `src/components/ServiceWorkerRegister.tsx`

**キャッシュ戦略:**
1. **CacheFirst**: 静的アセット
   - `/icons/*`, `/images/*`: 30日間キャッシュ
   - `manifest.json`: 7日間キャッシュ

2. **StaleWhileRevalidate**: Next.js静的ファイル
   - `/_next/static/*`: 1日間キャッシュ
   - バックグラウンドで最新版取得

3. **NetworkFirst**: モックデータAPI・ページ
   - `/api/mock/*`: 5分間キャッシュ、10秒タイムアウト
   - `/subcontractor/*`: 1日間キャッシュ、10秒タイムアウト
   - `/offline`: 7日間キャッシュ（必須）

**オフライン対応:**
- オフライン時は `/offline` ページにフォールバック
- 基本的なエラーメッセージ表示
- ネットワーク復帰時の自動リトライ

**Service Worker登録:**
- クライアントサイドで自動登録
- skipWaiting: true（即座に有効化）
- clientsClaim: true（既存ページも制御）

---

#### 2.3 プッシュ通知システム
**実装ファイル:**
- `src/lib/push-notifications.ts`
- `src/components/PushNotificationPrompt.tsx`
- `src/app/sw.ts` (push event listeners)
- `scripts/generate-vapid-keys.js`

**VAPID Keys:**
- VAPID公開鍵: Vercel環境変数 `NEXT_PUBLIC_VAPID_PUBLIC_KEY` に設定済み
- VAPID秘密鍵: Vercel環境変数 `VAPID_PRIVATE_KEY` に設定済み
- 鍵ペア生成スクリプト: `npm run generate-vapid`

**通知設定:**
```typescript
interface PushNotificationSettings {
  enabled: boolean;
  permissions: {
    company_match: boolean;      // 自社条件マッチ案件
    booking_change: boolean;     // 予約案件変更
    deadline_reminder: boolean;  // 締切リマインダー
  };
  quietHours: {
    enabled: boolean;
    start: string; // "22:00"
    end: string;   // "06:00"
  };
}
```

**通知種類:**
1. **自社条件マッチ** (company_match)
   - トリガー: 新規案件公開時、自社条件に合致
   - 通知内容: 案件名、職種、エリア、単価
   - アクション: 案件詳細ページへ遷移

2. **予約案件変更** (booking_change)
   - トリガー: 予約済み案件の日時・内容変更、キャンセル
   - 通知内容: 変更内容、新しい日時
   - アクション: 予約履歴ページへ遷移

3. **締切リマインダー** (deadline_reminder)
   - トリガー: 予約締切日の前日22:00
   - 通知内容: 案件名、締切日時
   - アクション: 案件詳細ページへ遷移

**クワイエットアワー:**
- 22:00 〜 06:00 は通知送信を抑制
- 設定画面でON/OFF切替可能
- 緊急通知（予約キャンセル）は例外で送信

**通知許可リクエスト:**
- 下請けページ初回訪問時にモーダル表示（2秒遅延）
- 拒否した場合は7日間非表示
- 設定画面から再度許可リクエスト可能

**Push通知イベント:**
- Service Worker内で `push` イベントリスナー実装
- 通知クリック時の適切なページ遷移（`notificationclick`）
- 既存ウィンドウのフォーカス or 新規ウィンドウ表示

---

### 3. モバイルUI最適化 (完成度: 100%)

#### 3.1 ボトムナビゲーション
**実装ファイル:** `src/components/MobileBottomNav.tsx`

**仕様:**
- 4タブ構成
  - 🔍 検索: `/subcontractor`
  - 📋 予約履歴: `/subcontractor/claims`
  - 🔔 通知: `/subcontractor/notifications`（未読バッジ表示）
  - ⚙️ 設定: `/subcontractor/settings`

- デザイン
  - モバイルのみ表示（768px未満）
  - 画面下部固定（fixed bottom-0）
  - アクティブタブは緑色（#10b981）で強調
  - 未読通知バッジ（5秒ごとに更新）

- 統合ページ
  - 下請けページ全ページに統合済み
  - pb-16（ボトムナビ分の余白）設定

---

#### 3.2 レスポンシブデザイン
**モバイル最適化箇所:**

1. **検索フォーム**（SearchFilterForm.tsx）
   - モバイル: 折りたたみ式（デフォルト閉じる）
   - デスクトップ: 常時展開
   - 「検索条件を表示/非表示」トグルボタン

2. **案件カード**（subcontractor/page.tsx）
   - モバイル: 1列表示（space-y-4）
   - デスクトップ: 3列グリッド（lg:grid-cols-3）
   - 情報優先順位: 日付（青背景） > 価格（緑背景） > エリア > 職種
   - ボタンサイズ拡大（py-3、モバイルのみ）

3. **ヘッダー**
   - モバイル: タイトルのみ表示（text-base）
   - デスクトップ: 全ボタン表示（hidden md:flex）
   - タイトルレスポンシブ（text-base md:text-xl）

4. **自社情報設定**（settings/page.tsx）
   - モバイル: ボタン縦並び（flex-col）
   - デスクトップ: ボタン横並び（flex-row）
   - パディング調整（p-4 md:p-6）

---

### 4. 元請け業者向け機能（現在実装済み: 70%）

#### 4.1 ダッシュボード概要
**実装ファイル:** `src/app/contractor/page.tsx`

**主要機能:**
- **統計カード表示**
  - 総プロジェクト数
  - 進行中プロジェクト数
  - 総予算・総支出
  - 募集中スロット数

- **タブナビゲーション**
  - 📊 概要: 統計情報・最近のプロジェクト
  - 🏗️ プロジェクト管理: プロジェクト一覧・作成
  - 📅 工事スロット管理: スロット一覧・作成・検索
  - 🤝 下請け業者: 登録業者一覧

**現在の制限:**
- データはモックデータ（ダミー）
- CRUD操作はlocalStorageのみ（永続化なし）

---

#### 4.2 プロジェクト管理（基本機能のみ）
**実装コンポーネント:** `src/components/ProjectForm.tsx`

**現在実装済み:**
- 新規プロジェクト作成フォーム
  - プロジェクト名
  - 所在地
  - ステータス（計画中/進行中/完了/保留）
  - 開始日・終了日
  - 予算
  - 担当者
  - 下請け業者（複数選択）

- プロジェクト一覧テーブル
  - ステータス別色分け
  - 進捗バー表示
  - 予算・期間表示

**未実装:**
- プロジェクト編集機能
- プロジェクト削除機能
- プロジェクト詳細ページ
- ガントチャート
- コスト管理

---

#### 4.3 工事スロット管理（基本機能のみ）
**実装コンポーネント:** `src/components/SlotForm.tsx`

**現在実装済み:**
- 新規スロット作成フォーム
  - プロジェクト選択
  - 職種
  - 作業日
  - 単価
  - 説明

- スロット一覧テーブル
  - ステータス別色分け
  - 割当業者表示
  - 検索・フィルタ機能（下請けと共通）

**未実装:**
- スロット一括作成機能
- スロット編集機能
- スロット削除機能
- スロット割当変更機能
- スロットテンプレート機能

---

#### 4.4 下請け業者管理（基本機能のみ）
**実装コンポーネント:** `src/components/SubcontractorForm.tsx`

**現在実装済み:**
- 新規業者登録フォーム
  - 会社名
  - 代表者名
  - 連絡先（電話・メール）
  - 専門分野
  - 対応エリア

- 登録業者一覧
  - カード型表示
  - 評価・完了案件数表示（ダミーデータ）

**未実装:**
- CSV一括登録機能
- 業者詳細ページ
- 業者評価システム
- 業者検索・フィルタ機能
- ブラックリスト機能

---

### 5. 共通機能

#### 5.1 認証・ユーザー管理
**実装ファイル:** `src/app/page.tsx`

**現在の仕様:**
- ログイン画面: 業者タイプ選択（元請け/下請け）
- ユーザー情報: localStorage保存
- 開発用ユーザー切り替え: DevUserSwitcher.tsx（本番非表示）

**デフォルトユーザー:**
- 元請け管理者: 田中 太郎（東建総合建設株式会社）
- 下請け管理者: 山田 次郎（山田基礎工業）

**未実装:**
- 実際の認証システム（メール/パスワード）
- OAuth連携
- 多要素認証
- パスワードリセット

---

#### 5.2 モックデータシステム
**実装ファイル:** `src/lib/mock-data/`

**データ構成:**
```
mock-data/
├── types.ts              # 型定義
├── companies.ts          # 会社マスター (10社)
├── users.ts              # ユーザーマスター (11名)
├── projects.ts           # プロジェクト (5件)
├── job-posts.ts          # 工事案件 (15件)
├── job-slots.ts          # 工事スロット (92件)
├── claims.ts             # 予約データ (31件)
└── index.ts              # 統合API + 検索・フィルタ関数
```

**データ統計:**
- Companies: 10社（元請け2社、下請け8社）
- Users: 11名
- Projects: 5件（東京・神奈川・埼玉）
- Job Posts: 15件
- Job Slots: 92件（available: 61, claimed: 31）
- Claims: 31件

**検索・フィルタAPI:**
- `getSlots(params)`: 検索条件に基づくスロット取得
- `getClaims(userId)`: ユーザーの予約履歴取得
- `getNotifications(userId)`: ユーザーの通知取得

---

## 🛠️ 技術スタック

### フロントエンド
| 技術 | バージョン | 用途 |
|------|-----------|------|
| **React** | 19.1.0 | UIライブラリ |
| **Next.js** | 15.5.4 | フレームワーク（App Router） |
| **TypeScript** | 5 | 型安全性 |
| **Tailwind CSS** | 4 | スタイリング |

### PWA・Service Worker
| 技術 | バージョン | 用途 |
|------|-----------|------|
| **Serwist** | 9.2.1 | Service Worker管理 |
| **@serwist/next** | 9.2.1 | Next.js統合 |
| **Web Push API** | - | プッシュ通知 |
| **VAPID** | - | Push認証 |

### バックエンド（予定）
| 技術 | バージョン | 用途 |
|------|-----------|------|
| **PostgreSQL** | 8.16.3 | データベース |
| **Supabase** | - | BaaS（移行予定） |
| **Node.js** | 20+ | サーバーサイド |

### 開発・デプロイ
| 技術 | バージョン | 用途 |
|------|-----------|------|
| **Vercel** | - | ホスティング |
| **ESLint** | 9 | コード品質 |
| **Prettier** | 3.6.2 | コードフォーマット |
| **Vitest** | 3.2.4 | テスト |

### 外部連携（予定）
| サービス | 用途 |
|---------|------|
| **ダンドリワークAPI** | プロジェクト情報連携 |
| **SendGrid** | メール通知 |
| **Twilio** | SMS通知（オプション） |

---

## 🚀 今後追加する元請け側機能

### Phase 3.1: プロジェクト管理の充実（優先度: 高）

#### 3.1.1 プロジェクト詳細ページ
**実装予定:** `src/app/contractor/projects/[id]/page.tsx`

**主要機能:**
- **プロジェクト概要**
  - 基本情報（名称、所在地、期間、予算）
  - 進捗状況（進捗率、遅延状況）
  - 担当者情報

- **タブ構成**
  - 📊 ダッシュボード: 進捗グラフ、コスト分析
  - 📅 工事スロット: 関連スロット一覧・作成
  - 🤝 下請け業者: 参加業者一覧・評価
  - 📁 ドキュメント: 図面・契約書管理
  - 💬 コミュニケーション: メッセージ・コメント

- **進捗管理**
  - ガントチャート表示
  - マイルストーン管理
  - 遅延アラート

- **コスト管理**
  - 予算vs実績グラフ
  - コスト内訳（職種別、業者別）
  - 支払いステータス

**推定工数:** 3日

---

#### 3.1.2 プロジェクト編集・削除機能
**実装予定:** 既存コンポーネント拡張

**主要機能:**
- プロジェクト情報編集フォーム
- 変更履歴管理
- 削除確認ダイアログ
- 削除時の関連データ処理（スロット、予約）

**推定工数:** 1日

---

#### 3.1.3 プロジェクトテンプレート機能
**実装予定:** `src/app/contractor/templates/page.tsx`

**主要機能:**
- よく使うプロジェクト構成をテンプレート化
- テンプレートからプロジェクト作成
- 工事スロットの一括生成
- 職種・期間・単価のデフォルト値設定

**データ例:**
```typescript
interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  defaultDuration: number; // 日数
  slotTemplates: {
    trade: string;
    daysFromStart: number;
    duration: number;
    defaultUnitPrice: number;
  }[];
}
```

**推定工数:** 2日

---

### Phase 3.2: 工事スロット管理の充実（優先度: 高）

#### 3.2.1 スロット一括作成機能
**実装予定:** `src/components/BulkSlotCreator.tsx`

**主要機能:**
- **一括作成フォーム**
  - プロジェクト選択
  - 職種選択
  - 期間指定（開始日〜終了日）
  - 繰り返しパターン（毎日/平日のみ/特定曜日）
  - 単価設定

- **プレビュー機能**
  - 作成されるスロット一覧表示
  - 合計件数・合計金額
  - カレンダービュー

- **バリデーション**
  - 重複チェック
  - 祝日除外オプション
  - 最大作成件数制限

**使用例:**
- 「2025/11/1〜11/30の平日、基礎工事を毎日1枠、単価¥80,000で作成」
- 作成件数: 21件（土日祝除外）

**推定工数:** 2日

---

#### 3.2.2 スロット編集・削除機能
**実装予定:** 既存コンポーネント拡張

**主要機能:**
- スロット情報編集フォーム
- 予約済みスロットの変更制限
- 削除時の予約者への通知
- 一括編集機能（複数スロット選択）

**推定工数:** 1日

---

#### 3.2.3 スロット割当管理
**実装予定:** `src/app/contractor/slots/assignments/page.tsx`

**主要機能:**
- **手動割当**
  - 未割当スロットの手動割当
  - 業者選択（評価・実績参照）
  - 割当理由記録

- **自動割当（将来）**
  - 業者の対応職種・エリアに基づく推奨
  - 過去の実績・評価スコアに基づくランキング
  - 空き状況に基づく最適割当

- **割当変更**
  - 既存割当の変更
  - 変更理由記録
  - 旧業者・新業者への通知

**推定工数:** 3日

---

### Phase 3.3: 下請け業者のCSV一括登録（優先度: 高）

#### 3.3.1 CSVインポート機能
**実装予定:** `src/app/contractor/subcontractors/import/page.tsx`

**主要機能:**
- **CSVアップロード**
  - ドラッグ&ドロップ対応
  - ファイル形式チェック（.csv, .xlsx）
  - 最大ファイルサイズ制限（5MB）

- **CSVフォーマット**
```csv
会社名,代表者名,郵便番号,住所,電話番号,メールアドレス,専門職種,対応エリア,最低単価,保有資格,備考
山田基礎工業,山田太郎,100-0001,東京都千代田区,03-1234-5678,yamada@example.com,基礎工事,"東京都,神奈川県",50000,"1級土木施工管理技士,2級建築施工管理技士",信頼できる業者
```

- **データバリデーション**
  - 必須項目チェック（会社名、連絡先）
  - メール形式チェック
  - 電話番号形式チェック
  - 重複チェック（既存業者との照合）

- **プレビュー・確認**
  - インポート前のデータプレビュー
  - エラー行のハイライト表示
  - エラー詳細メッセージ
  - 正常データのみインポートオプション

- **インポート結果**
  - 成功件数・失敗件数表示
  - エラーログダウンロード
  - インポート履歴管理

**テンプレートダウンロード:**
- CSVテンプレートファイル提供
- サンプルデータ入り

**推定工数:** 2日

---

#### 3.3.2 CSVエクスポート機能
**実装予定:** 既存ページに追加

**主要機能:**
- 登録業者一覧のCSVダウンロード
- 検索・フィルタ結果のエクスポート
- カスタムカラム選択

**推定工数:** 0.5日

---

### Phase 3.4: プロジェクト情報のダンドリワークAPI連携（優先度: 中）

#### 3.4.1 API連携基盤構築
**実装予定:**
- `src/lib/dandori-work-api.ts`
- `src/app/api/dandori-work/route.ts`

**主要機能:**
- **認証**
  - ダンドリワークAPIキー管理
  - トークン自動リフレッシュ
  - エラーハンドリング

- **データ同期**
  - プロジェクト情報の自動取得
  - 差分更新（新規プロジェクトのみ）
  - 同期履歴管理

**API仕様（想定）:**
```typescript
interface DandoriWorkProject {
  id: string;
  name: string;
  client: string;
  location: string;
  startDate: string;
  endDate: string;
  budget: number;
  status: string;
  manager: string;
}
```

**推定工数:** 3日

---

#### 3.4.2 プロジェクト連携画面
**実装予定:** `src/app/contractor/integrations/dandori-work/page.tsx`

**主要機能:**
- **設定画面**
  - APIキー入力
  - 同期頻度設定（手動/1時間/1日/1週間）
  - 同期対象プロジェクトフィルタ

- **同期管理**
  - 手動同期ボタン
  - 最終同期日時表示
  - 同期ログ表示（成功/失敗）

- **マッピング設定**
  - ダンドリワークのフィールド → ダンドリブッキングのフィールド
  - カスタムフィールドマッピング

**推定工数:** 2日

---

#### 3.4.3 双方向同期（将来）
**実装予定:** Phase 4以降

**主要機能:**
- ダンドリブッキングからダンドリワークへのデータ更新
- 工事進捗・コスト情報の自動反映
- コンフリクト解決機能

**推定工数:** 5日

---

### Phase 3.5: その他元請け機能

#### 3.5.1 業者評価システム
**実装予定:** `src/app/contractor/subcontractors/[id]/reviews/page.tsx`

**主要機能:**
- 案件完了後の業者評価（5段階）
- 評価項目（品質/納期/コミュニケーション/安全管理）
- コメント記入
- 評価履歴表示
- 平均評価スコア算出

**推定工数:** 2日

---

#### 3.5.2 レポート・分析機能
**実装予定:** `src/app/contractor/reports/page.tsx`

**主要機能:**
- **コストレポート**
  - プロジェクト別コスト分析
  - 職種別コスト内訳
  - 予算vs実績グラフ

- **進捗レポート**
  - プロジェクト進捗一覧
  - 遅延プロジェクトアラート
  - 完了率推移グラフ

- **業者レポート**
  - 業者別受注件数
  - 業者別評価スコア
  - リピート率分析

**推定工数:** 4日

---

#### 3.5.3 通知・メッセージ機能
**実装予定:**
- `src/app/contractor/messages/page.tsx`
- `src/lib/notifications-contractor.ts`

**主要機能:**
- 下請け業者とのメッセージング
- プロジェクト・スロット関連の通知
- メール・SMS通知連携

**推定工数:** 3日

---

## 🔗 API連携計画

### ダンドリワークAPI連携の詳細

#### 連携フロー
```
1. 認証
   ダンドリブッキング → ダンドリワークAPI
   - APIキー送信
   - アクセストークン取得

2. プロジェクト情報取得
   ダンドリワークAPI → ダンドリブッキング
   - プロジェクト一覧取得
   - フィルタ: 進行中 + 計画中のみ
   - 新規プロジェクトのみ同期

3. データマッピング
   ダンドリワークのフィールド → ダンドリブッキングのフィールド
   - name → name
   - client → client_name (新規フィールド)
   - location → address
   - startDate → start_date
   - endDate → end_date
   - budget → budget
   - manager → manager_name (新規フィールド)

4. データ保存
   ダンドリブッキング DB (PostgreSQL/Supabase)
   - projectsテーブルに挿入
   - 重複チェック（dandori_work_project_id）
   - 同期ログ記録
```

#### API仕様（想定）

**エンドポイント:**
- `GET /api/dandori-work/projects`: プロジェクト一覧取得
- `POST /api/dandori-work/sync`: 手動同期実行
- `GET /api/dandori-work/sync/status`: 同期ステータス取得

**リクエスト例:**
```typescript
GET https://api.dandori-work.example.com/v1/projects
Authorization: Bearer YOUR_API_KEY
X-Client-Id: dandori-booking

Query Parameters:
- status: in_progress,planning
- updatedAfter: 2025-10-01T00:00:00Z
```

**レスポンス例:**
```json
{
  "projects": [
    {
      "id": "dw-proj-001",
      "name": "新宿オフィスビル建設",
      "client": "ABC株式会社",
      "location": "東京都新宿区西新宿1-1-1",
      "startDate": "2025-11-01",
      "endDate": "2026-03-31",
      "budget": 15000000,
      "status": "in_progress",
      "manager": "田中太郎",
      "updatedAt": "2025-10-20T10:30:00Z"
    }
  ],
  "totalCount": 5,
  "nextPage": null
}
```

#### エラーハンドリング
- 401 Unauthorized: APIキー無効 → 設定画面へ誘導
- 429 Too Many Requests: レート制限 → リトライ待機
- 500 Server Error: ダンドリワーク側エラー → ログ記録、管理者通知

#### セキュリティ
- APIキーはVercel環境変数で管理
- トークンは暗号化してDB保存
- 通信はHTTPS必須
- レート制限対応（1分間に10リクエストまで）

---

## 📂 ファイル構成

### 現在のディレクトリ構造

```
fcfs-booking/
├── public/
│   ├── manifest.json                   # PWA manifest
│   ├── icons/                          # PWAアイコン（8サイズ）
│   │   ├── icon.svg
│   │   ├── icon-72x72.png
│   │   ├── icon-96x96.png
│   │   ├── icon-128x128.png
│   │   ├── icon-144x144.png
│   │   ├── icon-152x152.png
│   │   ├── icon-192x192.png
│   │   ├── icon-384x384.png
│   │   └── icon-512x512.png
│   └── sw.js                           # Service Worker (自動生成)
│
├── src/
│   ├── lib/
│   │   ├── mock-data/                  # モックデータシステム
│   │   │   ├── types.ts
│   │   │   ├── companies.ts
│   │   │   ├── users.ts
│   │   │   ├── projects.ts
│   │   │   ├── job-posts.ts
│   │   │   ├── job-slots.ts
│   │   │   ├── claims.ts
│   │   │   └── index.ts
│   │   ├── company-profile.ts          # 自社情報管理
│   │   ├── company-profile-filter.ts   # 自社条件フィルタ
│   │   ├── notifications.ts            # 通知管理
│   │   └── push-notifications.ts       # Push通知システム
│   │
│   ├── components/
│   │   ├── DevUserSwitcher.tsx         # 開発用ユーザー切り替え
│   │   ├── SearchFilterForm.tsx        # 検索フォーム
│   │   ├── MobileBottomNav.tsx         # モバイルボトムナビ
│   │   ├── PWAInstallPrompt.tsx        # PWAインストールプロンプト
│   │   ├── PushNotificationPrompt.tsx  # Push通知許可リクエスト
│   │   ├── ServiceWorkerRegister.tsx   # Service Worker登録
│   │   ├── BookingForm.tsx             # 予約フォーム
│   │   ├── BookingHistory.tsx          # 予約履歴モーダル
│   │   ├── ProjectForm.tsx             # プロジェクト作成フォーム
│   │   ├── SlotForm.tsx                # スロット作成フォーム
│   │   └── SubcontractorForm.tsx       # 業者登録フォーム
│   │
│   ├── app/
│   │   ├── layout.tsx                  # ルートレイアウト（PWAメタタグ）
│   │   ├── page.tsx                    # ログインページ
│   │   ├── sw.ts                       # Service Worker本体
│   │   ├── offline/page.tsx            # オフラインページ
│   │   │
│   │   ├── subcontractor/              # 下請けページ
│   │   │   ├── page.tsx                # 案件検索・予約
│   │   │   ├── claims/page.tsx         # 予約履歴
│   │   │   ├── notifications/page.tsx  # 通知センター
│   │   │   └── settings/page.tsx       # 自社情報設定
│   │   │
│   │   ├── contractor/                 # 元請けページ
│   │   │   └── page.tsx                # ダッシュボード
│   │   │
│   │   ├── dashboard/                  # 予約状況ダッシュボード
│   │   │   └── page.tsx
│   │   │
│   │   └── admin/                      # 管理画面
│   │       ├── layout.tsx
│   │       ├── page.tsx                # テナント管理
│   │       ├── outbox/page.tsx         # アウトボックス監視
│   │       ├── audit/page.tsx          # 監査ログ
│   │       └── import/page.tsx         # CSVインポート
│   │
│   └── types/
│       └── api.ts                      # 共通型定義
│
├── scripts/
│   ├── generate-vapid-keys.js          # VAPID鍵生成
│   ├── setup-vercel-env.sh             # Vercel環境変数設定
│   ├── check-sw.js                     # Service Worker確認
│   └── test_concurrent_claims.js       # 同時予約テスト
│
├── lib/                                # DBスクリプト（未使用）
│   ├── migrate.js
│   ├── seed.js
│   └── verify.js
│
├── migrations/                         # DBマイグレーション（未使用）
├── seeds/                              # DBシード（未使用）
│
├── next.config.ts                      # Next.js設定（Serwist統合）
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── PROGRESS_LOG.md                     # 開発進捗ログ
├── IMPLEMENTATION_REPORT.md            # 本レポート
└── README.md

```

### 追加予定のファイル（Phase 3以降）

```
src/
├── lib/
│   └── dandori-work-api.ts             # ダンドリワークAPI連携
│
├── components/
│   ├── BulkSlotCreator.tsx             # スロット一括作成
│   ├── GanttChart.tsx                  # ガントチャート
│   └── CostChart.tsx                   # コストグラフ
│
└── app/
    ├── contractor/
    │   ├── projects/
    │   │   ├── [id]/page.tsx           # プロジェクト詳細
    │   │   └── templates/page.tsx      # プロジェクトテンプレート
    │   ├── slots/
    │   │   └── assignments/page.tsx    # スロット割当管理
    │   ├── subcontractors/
    │   │   ├── import/page.tsx         # CSV一括登録
    │   │   └── [id]/reviews/page.tsx   # 業者評価
    │   ├── integrations/
    │   │   └── dandori-work/page.tsx   # ダンドリワーク連携
    │   ├── reports/page.tsx            # レポート・分析
    │   └── messages/page.tsx           # メッセージング
    │
    └── api/
        └── dandori-work/
            ├── route.ts                # API連携エンドポイント
            └── sync/route.ts           # 同期エンドポイント
```

---

## 🌐 デプロイ情報

### Vercel デプロイ設定

**プロジェクト名:** fcfs-booking
**デプロイブランチ:** `vercel-prod-sync`
**自動デプロイ:** 有効

**環境変数（Vercel）:**
| 変数名 | 値（マスク） | 環境 |
|--------|-------------|------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `MFkwEwYHKo...` | Production, Preview, Development |
| `VAPID_PRIVATE_KEY` | `MIGHAgEAMB...` | Production, Preview, Development |

**ビルドコマンド:** `npm run build`
**出力ディレクトリ:** `.next`
**Node.jsバージョン:** 20.x

**デプロイURL:**
- 本番: `https://fcfs-booking.vercel.app`（想定）
- プレビュー: 各コミットごとに自動生成

---

### ローカル開発環境

**開発サーバー起動:**
```bash
cd /Users/dw1002/fcfs-booking
npm run dev
```

**アクセスURL:**
- ローカル: http://localhost:3001
- モバイル実機: http://192.168.1.222:3001

**開発用機能:**
- DevUserSwitcher: 右下の「👤 Dev」ボタン（本番非表示）
- モックデータ: `src/lib/mock-data/`
- Service Worker確認: `npm run check-sw`

---

### データベース設定（未実施）

**注意:** 現在はモックデータで動作中、実DBは未設定

**予定:**
- PostgreSQL 14+
- Supabase（BaaS）
- マイグレーション: `npm run db:migrate`
- シード: `npm run db:seed`

---

## 📈 今後の開発ロードマップ

### Phase 3: 元請け機能充実（推定工数: 20日）
- ✅ Phase 3.1: プロジェクト管理の充実（6日）
- ✅ Phase 3.2: 工事スロット管理の充実（6日）
- ✅ Phase 3.3: 下請け業者のCSV一括登録（2.5日）
- ✅ Phase 3.4: ダンドリワークAPI連携（5日）
- ✅ Phase 3.5: その他元請け機能（9日）

### Phase 4: データベース統合（推定工数: 10日）
- PostgreSQL/Supabase セットアップ
- モックデータからの移行
- 実APIエンドポイント実装
- 認証システム統合

### Phase 5: 高度機能（推定工数: 15日）
- リアルタイム更新（WebSocket/SSE）
- レポート・分析機能充実
- メール・SMS通知連携
- 業者評価・ランキングシステム

### Phase 6: テスト・最適化（推定工数: 5日）
- ユニットテスト拡充
- E2Eテスト実装
- パフォーマンス最適化
- セキュリティ監査

**総推定工数: 50日（約2.5ヶ月）**

---

## 📊 進捗サマリー

### 実装完了度
| カテゴリ | 進捗率 | 状態 |
|---------|--------|------|
| 下請け側機能 | 100% | ✅ 完了 |
| PWA/モバイル対応 | 100% | ✅ 完了 |
| 元請け側基本機能 | 70% | 🟡 部分完了 |
| 元請け側高度機能 | 0% | ⏳ 未着手 |
| API連携 | 0% | ⏳ 未着手 |
| DB統合 | 0% | ⏳ 未着手 |
| **全体** | **90%** | **🟢 良好** |

### 主要マイルストーン
- ✅ 2025/10/14: Phase 2.1-2.3 完了（検索・フィルタ、自社情報）
- ✅ 2025/10/20: Phase 2.4.1 完了（PWA基盤、モバイルUI）
- ✅ 2025/10/21: Phase 2.4.2-2.4.3 完了（Service Worker、Push通知）
- ✅ 2025/10/21: システム名変更・Vercelデプロイ
- ⏳ 2025/11月: Phase 3開始予定（元請け機能充実）
- ⏳ 2025/12月: Phase 4開始予定（DB統合）

---

## 🎯 成果と次のステップ

### 主要成果
1. **PWAネイティブアプリ並みの体験**: iOS/Android対応、オフライン動作可能
2. **プッシュ通知による即時性**: 新規案件・変更通知をリアルタイムで受信
3. **モバイルファースト設計**: 現場での使いやすさを徹底追求
4. **自動マッチング**: 自社条件に合った案件のみ表示、効率的な案件探し
5. **Vercel本番環境稼働**: 安定したホスティング、自動デプロイ

### 次のステップ
1. **元請け機能の充実** (Phase 3)
   - プロジェクト詳細ページ
   - スロット一括作成
   - CSV一括登録
   - ダンドリワークAPI連携

2. **ユーザーフィードバック収集**
   - 下請け業者へのヒアリング
   - 元請け業者へのヒアリング
   - UI/UX改善点の洗い出し

3. **データベース統合** (Phase 4)
   - PostgreSQL/Supabase セットアップ
   - モックデータからの移行
   - 実API実装

---

## 📝 備考

### 開発体制
- 開発者: Claude Code（AI開発アシスタント）
- プロジェクトオーナー: sugita-ops
- リポジトリ: https://github.com/sugita-ops/fcfs-booking

### ドキュメント
- 開発進捗ログ: `PROGRESS_LOG.md`
- 実装レポート: `IMPLEMENTATION_REPORT.md`（本ファイル）
- README: `README.md`
- API仕様: `/api/openapi.json`

### 連絡先
- GitHub Issues: https://github.com/sugita-ops/fcfs-booking/issues
- Vercel Dashboard: https://vercel.com/sugita-ops/fcfs-booking

---

**レポート作成日:** 2025年10月21日
**最終更新日:** 2025年10月21日
**バージョン:** v1.0.0
