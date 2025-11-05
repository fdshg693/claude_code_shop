# Linting & Formatting（リント・フォーマット）

## 概要

ESLintとPrettierを導入し、コードスタイルを統一し、潜在的なバグを早期に発見します。

## 現状の課題

- コードスタイルが統一されていない
- 潜在的なバグに気づきにくい
- コードレビューで本質的でない指摘が増える

## 提案: ESLint + Prettierの導入

### インストール

```bash
# ESLint
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin

# Prettier
npm install -D prettier eslint-config-prettier eslint-plugin-prettier

# React/Next.js用
npm install -D eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y

# Import順序整理
npm install -D eslint-plugin-import eslint-plugin-unused-imports
```

### 設定ファイル

#### .eslintrc.json

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    },
    "project": "./tsconfig.json"
  },
  "env": {
    "browser": true,
    "es2022": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "next/core-web-vitals",
    "prettier"
  ],
  "plugins": [
    "@typescript-eslint",
    "react",
    "react-hooks",
    "jsx-a11y",
    "import",
    "unused-imports"
  ],
  "rules": {
    // TypeScript
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { "prefer": "type-imports" }
    ],

    // Import
    "import/order": [
      "error",
      {
        "groups": [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
          "object",
          "type"
        ],
        "pathGroups": [
          {
            "pattern": "@/**",
            "group": "internal",
            "position": "before"
          }
        ],
        "newlines-between": "always",
        "alphabetize": {
          "order": "asc",
          "caseInsensitive": true
        }
      }
    ],
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "warn",
      {
        "vars": "all",
        "varsIgnorePattern": "^_",
        "args": "after-used",
        "argsIgnorePattern": "^_"
      }
    ],

    // React
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",

    // General
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "prefer-const": "error",
    "no-var": "error"
  },
  "settings": {
    "react": {
      "version": "detect"
    },
    "import/resolver": {
      "typescript": {
        "alwaysTryTypes": true,
        "project": "./tsconfig.json"
      }
    }
  }
}
```

#### .prettierrc.json

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf",
  "bracketSpacing": true,
  "jsxSingleQuote": false,
  "jsxBracketSameLine": false
}
```

#### .prettierignore

```
node_modules
.next
out
build
dist
coverage
*.min.js
*.min.css
package-lock.json
yarn.lock
pnpm-lock.yaml
```

### package.jsonスクリプト

```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "type-check": "tsc --noEmit"
  }
}
```

### VSCode設定

`.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": false
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ]
}
```

### 推奨VSCode拡張機能

`.vscode/extensions.json`:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

## 代替案: Biome

ESLint + Prettierの代替として、より高速な[Biome](https://biomejs.dev/)があります：

```bash
npm install -D @biomejs/biome
```

```json
{
  "scripts": {
    "lint": "biome check .",
    "lint:fix": "biome check --apply .",
    "format": "biome format --write ."
  }
}
```

## メリット

1. **コードスタイルの統一**: チーム全体で一貫性
2. **バグの早期発見**: 型チェック以外の問題も検出
3. **コードレビューの効率化**: スタイルの指摘が不要
4. **自動修正**: 多くの問題を自動で修正

## デメリット

1. **初期設定のコスト**: ルール設定に時間がかかる
2. **学習コスト**: ルールの理解が必要
3. **ビルド時間**: Lintチェックで時間がかかる

## 導入の推奨度

**⭐⭐⭐⭐⭐ (非常に高い)**

すべてのプロジェクトで導入すべき基本的なツールです。

## 参考資料

- [ESLint](https://eslint.org/)
- [Prettier](https://prettier.io/)
- [Biome](https://biomejs.dev/)
