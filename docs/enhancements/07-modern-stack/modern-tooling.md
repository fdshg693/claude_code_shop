# Modern Tooling（モダンツール）

## 概要

最新のツールを導入して、開発速度とコード品質を向上させます。

## 1. Biome（ESLint + Prettier 代替）

### 特徴

- ESLintとPrettierを1つのツールに統合
- 非常に高速（Rustで書かれている）
- 設定が簡単

### インストール

```bash
npm install -D @biomejs/biome
```

### 設定

```json
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/1.5.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noExplicitAny": "error"
      },
      "style": {
        "useConst": "error",
        "noVar": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingComma": "es5",
      "semicolons": "always"
    }
  }
}
```

### package.jsonスクリプト

```json
{
  "scripts": {
    "lint": "biome check .",
    "lint:fix": "biome check --apply .",
    "format": "biome format --write ."
  }
}
```

### VSCode設定

```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": true,
    "source.organizeImports.biome": true
  }
}
```

## 2. Vitest（Jest 代替）

### 特徴

- 非常に高速
- ViteのHMRを活用
- Jest互換API
- ESM/TypeScriptネイティブサポート

### インストール

```bash
npm install -D vitest @vitest/ui
```

### 設定

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.stories.tsx',
        'src/**/*.test.{ts,tsx}',
        'src/types/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### package.jsonスクリプト

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

### マイグレーション

Jest → Vitest はほぼ互換性があります：

```typescript
// ✅ そのまま動く
import { describe, it, expect, vi } from 'vitest';

describe('MyComponent', () => {
  it('should render', () => {
    expect(true).toBe(true);
  });
});

// Jestのmockもそのまま
const mockFn = vi.fn();
vi.mock('@/services/api');
```

## 3. Turbopack（Webpack 代替）

Next.js 13+で利用可能な高速バンドラー：

### 使用方法

```json
// package.json
{
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build --turbo"
  }
}
```

### 特徴

- Rustで書かれた高速バンドラー
- Webpackより10倍高速
- HMRが非常に速い
- Next.jsに最適化

## 4. Bun（Node.js 代替）

### 特徴

- 非常に高速なランタイム
- パッケージマネージャー内蔵
- テストランナー内蔵
- TypeScript/JSXネイティブサポート

### インストール

```bash
curl -fsSL https://bun.sh/install | bash
```

### 使用方法

```bash
# パッケージインストール
bun install

# スクリプト実行
bun run dev

# テスト実行
bun test

# ファイル実行
bun run index.ts
```

### package.json

```json
{
  "scripts": {
    "dev": "bun --hot run dev.ts",
    "build": "bun run build.ts",
    "test": "bun test"
  }
}
```

## 5. pnpm（npm 代替）

### 特徴

- ディスク容量を節約
- インストールが高速
- 厳密な依存関係管理
- Monorepoサポート

### インストール

```bash
npm install -g pnpm
```

### 使用方法

```bash
# インストール
pnpm install

# パッケージ追加
pnpm add react

# Dev依存関係
pnpm add -D typescript

# スクリプト実行
pnpm run dev
```

### Workspace設定

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

## 6. OXC（Babel/SWC 代替）

超高速なJavaScript/TypeScriptツールチェーン：

### 特徴

- パーサー、リンター、フォーマッター、バンドラー
- Rustで書かれている
- SWCより3倍高速

まだ開発中ですが、今後有望なツールです。

## 7. Mise（asdf 代替）

複数言語のバージョン管理ツール：

### インストール

```bash
curl https://mise.run | sh
```

### 使用方法

```bash
# Node.jsをインストール
mise use node@20

# プロジェクト固有のバージョン
mise use node@20.10.0

# 確認
mise ls
```

### .mise.toml

```toml
[tools]
node = "20.10.0"
```

## ツール比較表

### Linter/Formatter

| ツール | 速度 | 設定の複雑さ | エコシステム | 推奨度 |
|--------|------|-------------|-------------|--------|
| **Biome** | ⭐⭐⭐⭐⭐ | シンプル | 成長中 | ⭐⭐⭐⭐ |
| **ESLint + Prettier** | ⭐⭐⭐ | 複雑 | 非常に豊富 | ⭐⭐⭐⭐⭐ |

### テストランナー

| ツール | 速度 | 互換性 | DX | 推奨度 |
|--------|------|--------|-----|--------|
| **Vitest** | ⭐⭐⭐⭐⭐ | Jest互換 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Jest** | ⭐⭐⭐ | 標準 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

### バンドラー

| ツール | 速度 | 成熟度 | 設定 | 推奨度 |
|--------|------|--------|------|--------|
| **Turbopack** | ⭐⭐⭐⭐⭐ | 発展途上 | 自動 | ⭐⭐⭐⭐ |
| **Vite** | ⭐⭐⭐⭐ | 成熟 | 簡単 | ⭐⭐⭐⭐⭐ |
| **Webpack** | ⭐⭐ | 非常に成熟 | 複雑 | ⭐⭐⭐ |

### パッケージマネージャー

| ツール | 速度 | ディスク使用量 | 機能 | 推奨度 |
|--------|------|---------------|------|--------|
| **pnpm** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Bun** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **npm** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Yarn** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

## 推奨する構成

### 保守的（安定重視）

```
- ESLint + Prettier
- Jest
- Webpack / Vite
- npm / yarn
```

### バランス型（推奨）

```
- Biome
- Vitest
- Next.js（Turbopack有効化）
- pnpm
```

### 最先端（パフォーマンス重視）

```
- Biome
- Vitest
- Turbopack
- Bun / pnpm
```

## マイグレーション戦略

### 段階的な導入

1. **パッケージマネージャー**: npm → pnpm（影響小）
2. **テストランナー**: Jest → Vitest（互換性高）
3. **Linter/Formatter**: ESLint+Prettier → Biome（影響中）
4. **バンドラー**: Webpack → Turbopack（Next.jsの場合）

### リスクとリターン

| ツール | リスク | 導入コスト | パフォーマンス向上 |
|--------|--------|-----------|-------------------|
| **Biome** | 低 | 小 | 大 |
| **Vitest** | 低 | 小〜中 | 大 |
| **pnpm** | 低 | 小 | 中 |
| **Turbopack** | 中 | 小 | 大 |
| **Bun** | 中〜高 | 中 | 大 |

## メリット

1. **開発速度**: ビルド・テストが高速化
2. **開発体験**: HMRが速くストレスフリー
3. **リソース節約**: ディスク・メモリ使用量削減
4. **モダンな機能**: 最新のECMAScript機能

## デメリット

1. **成熟度**: 新しいツールはバグの可能性
2. **移行コスト**: 既存プロジェクトの移行が必要
3. **学習コスト**: 新しいツールの学習
4. **エコシステム**: プラグインが少ない場合も

## 導入の推奨度

**⭐⭐⭐⭐ (高)**

特に新規プロジェクトでは積極的に採用すべきです。

- **必須**: pnpm または Bun
- **推奨**: Vitest
- **検討**: Biome（設定が簡単な場合）

## 参考資料

- [Biome](https://biomejs.dev/)
- [Vitest](https://vitest.dev/)
- [Turbopack](https://turbo.build/pack)
- [Bun](https://bun.sh/)
- [pnpm](https://pnpm.io/)
- [Mise](https://mise.jdx.dev/)
