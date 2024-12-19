# 🚀 GitHub Kanban MCP Server：v0.2.0 - 2023-12-21

![](../../assets/release-v0.2.0.svg)

## 主な変更点 / Highlights

製品バージョン `0.2.0` では以下の改善が行われました：

- 🔄 GitHub APIからgh CLIへの完全移行による安定性の向上
- 🏗️ コードベースの大規模リファクタリングによる保守性の改善
- ✨ タスクへのコメント機能の追加
- 📦 依存関係の更新とビルドプロセスの改善

## ✨ 新機能 / New Features

### 💬 タスクコメント機能
- タスクに対してMarkdown形式のコメントを追加できる機能を実装
- 関連Issue: #8

### 🛠️ gh CLIインテグレーション
- GitHub APIの直接利用から`gh` CLIツールを使用する方式に移行
- より安定した認証管理とGitHubとの連携を実現
- 環境変数の設定が不要になり、セットアップが簡素化

## 🔧 改善 / Improvements

### コードベースの改善
- ファイル構造の整理と責務の分離
  - `handlers/`: Issue操作の実装
  - `schemas/`: 入力スキーマの定義
  - `utils/`: 共通ユーティリティ関数
- エラーハンドリングの強化
- 一時ファイル管理の改善

### 依存関係の更新
- `@modelcontextprotocol/sdk`: ^0.1.0 → ^1.0.4
- 開発依存関係の追加と更新
  - Jest、TypeScriptなどのテストツールとビルドツールを追加

## 🐛 バグ修正 / Bug Fixes

- Issue更新時の状態変更処理を修正
- 一時ファイルの管理方法を改善し、リソースリークを防止

## ⚠️ Breaking Changes

このバージョンには以下の破壊的変更が含まれています：

- GitHub APIの直接利用から`gh` CLIへの移行
  - 移行方法: システムに`gh` CLIをインストールし、`gh auth login`で認証を設定してください
- 環境変数の要件変更
  - `GITHUB_TOKEN`、`GITHUB_OWNER`、`GITHUB_REPO`の設定が不要になりました

## 📝 その他の変更 / Other Changes

- READMEの改善とバッジの追加
- `.clinerules`ファイルの追加によるコーディング規約の明確化
- ビルドプロセスの最適化
- `package.json`の説明とキーワードの更新

## 📦 アップグレード方法 / How to Upgrade

```bash
# パッケージマネージャーを使用している場合
npm install @sunwood-ai-labs/github-kanban-mcp-server@latest

# システム要件
gh auth login  # GitHubへの認証を設定
```

## 🙏 謝辞 / Acknowledgements

このリリースに貢献してくださった皆様に感謝いたします。

---
**Full Changelog**: [v0.1.1...v0.2.0](https://github.com/Sunwood-ai-labs/github-kanban-mcp-server/compare/v0.1.1...v0.2.0)
