# トラブルシューティング: API が 0 件の現場を返す問題

## 現状

現在、ダンドリワーク API との接続は成功していますが、現場データが 0 件返ってきています。

```
[Test Connection] Connection successful
[Test Connection] Sites count: 0
[Sync] Fetched 0 sites
```

## デバッグログの追加完了

`src/lib/dandori-work-api.ts` の `getSites()` メソッドに詳細なデバッグログを追加しました。

次回の同期実行時に、以下の情報がコンソールに表示されます：
- API の完全なレスポンス構造
- レスポンスの形式（配列、オブジェクト等）
- データがどのキーに含まれているか

## 次のステップ

### 1. ブラウザをリロード

最新のコードを読み込むため、ブラウザをリロードしてください：
- **ハードリロード推奨**: `Cmd + Shift + R` (Mac) または `Ctrl + Shift + R` (Windows)

### 2. 同期を実行

1. http://localhost:3003/contractor/integrations/dandori-work にアクセス
2. 「今すぐ同期実行」ボタンをクリック
3. ブラウザの開発者ツールを開く（F12 または右クリック→「検証」）
4. 「Console」タブを確認

### 3. ログを確認

以下のログが表示されるはずです：

```
[DandoriWork API] Full response: {...}
[DandoriWork API] Response is an array, returning directly
または
[DandoriWork API] Found X sites in response.sites
または
[DandoriWork API] Found data in response.data
または
[DandoriWork API] Unexpected response format: [keys]
```

**サーバーログ**も確認してください（ターミナル）：
```
npm run dev を実行しているターミナルに同じログが表示されます
```

## 考えられる原因

### 1. API に実際にデータが存在しない

**確認方法**:
- ダンドリワークの管理画面にログイン
- 指定したプレイスコードに現場が登録されているか確認
- 現場が「公開」状態になっているか確認

### 2. レスポンス形式が想定と異なる

**現在対応している形式**:
```typescript
// パターン1: 配列で直接返される
[{ site_code: "...", site_name: "..." }, ...]

// パターン2: sites プロパティ内に配列
{ sites: [{ site_code: "...", site_name: "..." }, ...] }

// パターン3: data プロパティ内に配列
{ data: [{ site_code: "...", site_name: "..." }, ...] }
```

**実際の形式が異なる場合**:
デバッグログに表示された実際の形式を基に、コードを調整します。

### 3. API エンドポイントの URL が間違っている

**使用中のエンドポイント**:
```
GET https://api.dandoli.jp/api/co/places/{place_code}/sites
```

**確認事項**:
- ベース URL は正しいか: `https://api.dandoli.jp/api`
- プレイスコードは正しいか
- エンドポイントパスは仕様書と一致しているか

### 4. API の権限・スコープが不足

**可能性**:
- 発行された API キーが現場一覧取得の権限を持っていない
- プレイスコードに対するアクセス権限がない

**確認方法**:
- ダンドリワーク管理画面で API キーの権限を確認
- 別のプレイスコードで試してみる

### 5. ページネーションやクエリパラメータが必要

**可能性**:
- API がデフォルトで 0 件返す仕様で、クエリパラメータが必要
- 例: `?limit=100&offset=0` など

**確認方法**:
- API 仕様書を再確認
- デバッグログでレスポンスに pagination 情報があるか確認

## デバッグ情報の収集

次回実行時に以下の情報を収集してください：

### ブラウザコンソール
```
開発者ツール (F12) → Console タブ
「DandoriWork API」で検索
```

### サーバーログ
```
npm run dev を実行しているターミナル
「DandoriWork API」で検索
```

### API 設定
```
- API キー: 最初の数文字のみ（セキュリティのため全文は不要）
- プレイスコード: (例) "ABC123"
- ベース URL: (例) "https://api.dandoli.jp/api"
```

### ダンドリワーク管理画面
```
- 登録されている現場数
- 現場の状態（公開/非公開）
- API キーの権限設定
```

## 修正が必要な場合

デバッグログを確認後、以下のいずれかの対応を行います：

### レスポンス形式の調整
`src/lib/dandori-work-api.ts:154-180` の `getSites()` メソッドを修正

### エンドポイントの変更
`src/lib/dandori-work-api.ts:156` のエンドポイント URL を修正

### クエリパラメータの追加
`src/lib/dandori-work-api.ts:156` にクエリパラメータを追加

### 認証方式の確認
`src/lib/dandori-work-api.ts:54-60` の認証ヘッダーを確認

## 連絡事項

次回の同期実行時に、以下の情報を共有してください：

1. **ブラウザコンソールのログ**（特に `[DandoriWork API]` で始まる行）
2. **サーバーターミナルのログ**
3. **ダンドリワーク管理画面で確認した現場数**
4. **API 仕様書に記載されているレスポンス例**（可能であれば）

これらの情報があれば、正確な原因を特定し、適切な修正を行えます。

---

## 参考: API クライアントの主要コード

### getSites() メソッド（デバッグログ追加済み）

```typescript
async getSites(placeCode?: string): Promise<DandoriWorkSite[]> {
  const code = placeCode || this.config.placeCode;
  const endpoint = `/co/places/${code}/sites`;

  try {
    const response = await this.request<any>(endpoint);
    console.log('[DandoriWork API] Full response:', JSON.stringify(response, null, 2));

    // レスポンス形式を確認
    if (Array.isArray(response)) {
      console.log('[DandoriWork API] Response is an array, returning directly');
      return response;
    } else if (response.sites) {
      console.log(`[DandoriWork API] Found ${response.sites.length} sites in response.sites`);
      return response.sites;
    } else if (response.data) {
      console.log(`[DandoriWork API] Found data in response.data`);
      return response.data;
    } else {
      console.warn('[DandoriWork API] Unexpected response format:', Object.keys(response));
      return [];
    }
  } catch (error) {
    console.error('Failed to get sites:', error);
    throw new Error(`現場一覧の取得に失敗しました: ${(error as Error).message}`);
  }
}
```

### 現在の実装ファイル

- **API クライアント**: `src/lib/dandori-work-api.ts`
- **同期 API**: `src/app/api/dandori-work/sync/route.ts`
- **接続テスト API**: `src/app/api/dandori-work/test-connection/route.ts`
- **管理 UI**: `src/app/contractor/integrations/dandori-work/page.tsx`

---

**最終更新**: 2025-11-10
**ステータス**: デバッグログ追加完了、次回同期実行待ち
