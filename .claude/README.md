# .claude/ フォルダについて

このフォルダは **Claude Code** が自動的に読み込むプロジェクトコンテキストを保存しています。

## 📁 ファイル構成

- **project-context.md** - プロジェクト全体の概要、構造、現在の状態
- **README.md** - このファイル（説明）

## 🔄 使い方

### Claude Code を起動したら

Claude Code は自動的にこのフォルダ内のファイルを読み込み、プロジェクトの文脈を理解します。

### 新しいセッションを始める時

```
「開発の続きをやりたい。.claude/project-context.md と最新のセッション記録を見て思い出してくれる？」
```

と伝えれば、Claude が即座にプロジェクトの状態を把握します。

### コンテキストを更新する

開発セッション終了時に：

```
「.claude/project-context.md を最新の状態に更新して」
```

と伝えれば、Claude が自動的に更新します。

## 📝 その他のドキュメント

プロジェクトルートにある重要なドキュメント：

- `DEVELOPMENT_SESSION_YYYY-MM-DD.md` - 各セッションの詳細記録
- `IMPLEMENTATION_REPORT.md` - プロジェクト全体の実装状況
- `PHASE_X.X_IMPLEMENTATION_COMPLETE.md` - 各フェーズの完了レポート

## 💡 ヒント

Claude Code は以下のパターンを自動的に認識します：

- `.claude/` フォルダ内のすべての Markdown ファイル
- `README.md`, `CONTRIBUTING.md` などのルートレベルドキュメント
- `docs/` フォルダ内のドキュメント

重要な情報はこれらの場所に配置することで、Claude が常に最新の状態を把握できます。

---

**作成日**: 2025-11-10
**目的**: Claude Code のセッション間で完全なコンテキスト保持
