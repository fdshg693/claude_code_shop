# Git Hooks（Gitフック）

## 概要

Gitフックを使って、コミット前に自動的にコード品質チェックを実行します。

## 提案: Husky + lint-staged

### インストール

```bash
npm install -D husky lint-staged
npx husky install
```

### package.json設定

```json
{
  "scripts": {
    "prepare": "husky install"
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

### Huskyフック設定

#### pre-commit

```bash
npx husky add .husky/pre-commit "npx lint-staged"
```

`.husky/pre-commit`:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

#### commit-msg

```bash
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit ${1}'
```

#### pre-push

```bash
npx husky add .husky/pre-push "npm run type-check && npm test"
```

`.husky/pre-push`:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 Running type check..."
npm run type-check

echo "🧪 Running tests..."
npm test -- --run

echo "✅ Pre-push checks passed!"
```

### Conventional Commits

#### インストール

```bash
npm install -D @commitlint/cli @commitlint/config-conventional
```

#### commitlint.config.js

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新機能
        'fix',      // バグ修正
        'docs',     // ドキュメント
        'style',    // スタイル修正
        'refactor', // リファクタリング
        'perf',     // パフォーマンス改善
        'test',     // テスト追加・修正
        'chore',    // ビルド・雑務
        'revert',   // revert
      ],
    ],
    'subject-case': [0],
  },
};
```

### コミットメッセージ例

```bash
# ✅ Good
git commit -m "feat: add product search functionality"
git commit -m "fix: resolve cart total calculation bug"
git commit -m "docs: update README with setup instructions"

# ❌ Bad
git commit -m "update code"
git commit -m "WIP"
git commit -m "Fixed bug"
```

## 段階的な導入

### レベル1: 基本的なフォーマット

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["prettier --write"]
  }
}
```

### レベル2: Lint + Format

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

### レベル3: 型チェック追加

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "bash -c 'npm run type-check'"
    ]
  }
}
```

### レベル4: テスト追加

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "bash -c 'npm run type-check'",
      "vitest related --run"
    ]
  }
}
```

## メリット

1. **品質保証**: 問題のあるコードがコミットされない
2. **自動化**: 手動チェックを忘れない
3. **チーム統一**: 全員が同じチェックを受ける
4. **早期発見**: CIを待たずに問題を検出

## デメリット

1. **コミット時間**: チェックに時間がかかる
2. **開発体験**: 厳しすぎるとストレス
3. **スキップの誘惑**: `--no-verify`で回避できてしまう

## 導入の推奨度

**⭐⭐⭐⭐⭐ (非常に高い)**

チーム開発では必須のツールです。

## トラブルシューティング

### Huskyが動かない場合

```bash
# Huskyを再インストール
rm -rf .husky
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

### 一時的にスキップしたい場合

```bash
git commit --no-verify -m "WIP: work in progress"
```

ただし、**通常は使用しないこと**を推奨します。

## 参考資料

- [Husky](https://typicode.github.io/husky/)
- [lint-staged](https://github.com/okonet/lint-staged)
- [Commitlint](https://commitlint.js.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
