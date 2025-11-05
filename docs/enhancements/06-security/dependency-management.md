# Dependency Management（依存関係管理）

## 概要

依存関係のセキュリティリスクを管理し、脆弱性から保護します。

## 1. 定期的なアップデート

### npm outdated で確認

```bash
# 古いパッケージを確認
npm outdated

# 出力例:
# Package        Current  Wanted  Latest
# react          18.2.0   18.2.0  18.3.1
# next           14.0.4   14.0.4  14.1.0
```

### npm update で更新

```bash
# package.jsonの範囲内で更新
npm update

# 特定のパッケージを更新
npm update react react-dom

# 最新バージョンにアップデート（破壊的変更に注意）
npm install react@latest
```

## 2. npm-check-updates の使用

### インストール

```bash
npm install -g npm-check-updates
```

### 使用方法

```bash
# 更新可能なパッケージを表示
ncu

# package.jsonを更新（実行のみ）
ncu -u

# インストール
npm install

# インタラクティブモード
ncu -i

# 特定のパッケージのみ
ncu -u react react-dom
```

## 3. Renovate Bot の導入

GitHubリポジトリで自動的にアップデートPRを作成：

### renovate.json

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:base"],
  "schedule": ["every weekend"],
  "packageRules": [
    {
      "matchUpdateTypes": ["minor", "patch"],
      "automerge": true
    },
    {
      "matchDepTypes": ["devDependencies"],
      "automerge": true
    },
    {
      "matchPackageNames": ["react", "react-dom", "next"],
      "groupName": "core dependencies"
    }
  ],
  "vulnerabilityAlerts": {
    "labels": ["security"],
    "assignees": ["@team"]
  }
}
```

## 4. Dependabot の使用

GitHubの組み込み機能：

### .github/dependabot.yml

```yaml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
      day: 'monday'
      time: '09:00'
    open-pull-requests-limit: 10
    reviewers:
      - 'team-reviewers'
    assignees:
      - 'team-lead'
    labels:
      - 'dependencies'
    commit-message:
      prefix: 'chore'
      include: 'scope'
    ignore:
      # メジャーバージョンアップは手動で
      - dependency-name: 'react'
        update-types: ['version-update:semver-major']
    groups:
      production-dependencies:
        patterns:
          - 'react*'
          - 'next'
        update-types:
          - 'minor'
          - 'patch'
```

## 5. セキュリティスキャン

### npm audit

```bash
# 脆弱性をチェック
npm audit

# JSON形式で出力
npm audit --json

# 自動修正
npm audit fix

# 破壊的変更を含めて修正
npm audit fix --force

# 特定のレベル以上のみ表示
npm audit --audit-level=moderate
```

### Snyk

```bash
# インストール
npm install -D snyk

# 認証
npx snyk auth

# テスト
npx snyk test

# 修正可能な脆弱性を修正
npx snyk fix

# 継続的な監視
npx snyk monitor
```

### package.jsonスクリプト

```json
{
  "scripts": {
    "security-check": "npm audit && snyk test",
    "update-check": "ncu",
    "update-deps": "ncu -u && npm install"
  }
}
```

## 6. Lock File の管理

### package-lock.json の重要性

```bash
# ❌ Bad: lock fileを削除
rm package-lock.json
npm install

# ✅ Good: lock fileを使用
npm ci  # CIでは ci を使用（高速＆再現性）
```

### .gitignore

```
# ✅ package-lock.json をコミット
# package-lock.json を .gitignore に入れない
```

## 7. 不要な依存関係の削除

### depcheck の使用

```bash
# インストール
npm install -D depcheck

# 実行
npx depcheck

# 出力例:
# Unused dependencies
# * lodash
# * moment
#
# Unused devDependencies
# * @types/react
```

### 手動確認

```bash
# 依存関係ツリーを表示
npm ls

# 特定のパッケージがどこで使われているか
npm ls react

# 循環依存のチェック
npx madge --circular --extensions ts,tsx src/
```

## 8. Monorepo での管理

### pnpm workspace

```yaml
# pnpm-workspace.yaml
packages:
  - 'frontend'
  - 'backend'
  - 'shared'
```

```json
// package.json
{
  "dependencies": {
    "shared": "workspace:*"
  }
}
```

### Turborepo

```bash
npm install -D turbo
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "lint": {},
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

## 9. CI/CD でのチェック

### GitHub Actions

```yaml
# .github/workflows/security.yml
name: Security Check

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    # 毎週月曜日の9時
    - cron: '0 9 * * 1'

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run npm audit
        run: npm audit --audit-level=moderate

      - name: Run Snyk
        run: npx snyk test
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

      - name: Check for outdated packages
        run: npx npm-check-updates --errorLevel 2

      - name: Check for unused dependencies
        run: npx depcheck
```

## 10. ベストプラクティス

### package.json のバージョン指定

```json
{
  "dependencies": {
    // ❌ Bad: 完全に固定（セキュリティアップデートを受けられない）
    "react": "18.2.0",

    // ❌ Bad: 最新を常に使用（破壊的変更のリスク）
    "react": "*",
    "react": "latest",

    // ✅ Good: パッチバージョンのみ更新を許可
    "react": "~18.2.0",

    // ✅ Good: マイナーバージョンまで更新を許可
    "react": "^18.2.0"
  }
}
```

### Peer Dependencies の確認

```bash
# peer dependenciesの警告を確認
npm install --legacy-peer-deps  # ❌ 推奨しない
npm install  # ✅ 警告を確認して対応
```

### 定期的なチェック習慣

```bash
# 毎週実行するスクリプト
#!/bin/bash

echo "🔍 Checking for security vulnerabilities..."
npm audit

echo "📦 Checking for outdated packages..."
npx npm-check-updates

echo "🗑️  Checking for unused dependencies..."
npx depcheck

echo "✅ Security check complete!"
```

## チェックリスト

- [ ] package-lock.jsonをコミット
- [ ] 定期的に`npm audit`を実行
- [ ] DependabotまたはRenovateを設定
- [ ] CI/CDでセキュリティチェック
- [ ] 不要な依存関係を削除
- [ ] メジャーバージョンアップは慎重に
- [ ] 本番依存関係を最小限に
- [ ] devDependenciesを適切に分類

## メリット

1. **セキュリティ**: 脆弱性への迅速な対応
2. **安定性**: バグフィックスと改善を受け取る
3. **パフォーマンス**: 最新版の最適化の恩恵
4. **互換性**: 新しいNode.jsバージョンへの対応

## デメリット

1. **破壊的変更**: メジャーアップデートのリスク
2. **時間コスト**: 定期的なアップデートとテスト
3. **依存関係の競合**: バージョン不一致の可能性

## 導入の推奨度

**⭐⭐⭐⭐⭐ (非常に高い)**

依存関係の管理は継続的に行うべき重要なタスクです。

## 参考資料

- [npm audit](https://docs.npmjs.com/cli/v9/commands/npm-audit)
- [Snyk](https://snyk.io/)
- [Renovate](https://docs.renovatebot.com/)
- [Dependabot](https://docs.github.com/en/code-security/dependabot)
- [npm-check-updates](https://github.com/raineorshine/npm-check-updates)
