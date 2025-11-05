# Development Environment（開発環境の標準化）

## 概要

Dev ContainerやDocker Composeを使って、チーム全員が同じ開発環境で作業できるようにします。

## 現状の課題

- 開発環境のセットアップが複雑
- 「自分の環境では動く」問題
- Node.jsやパッケージのバージョン不一致
- 新メンバーのオンボーディングに時間がかかる

## 提案1: Dev Container

### 必要なツール

- Visual Studio Code
- Docker Desktop
- Dev Containers 拡張機能

### セットアップ

#### .devcontainer/devcontainer.json

```json
{
  "name": "ESHOP Development",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:20",
  "features": {
    "ghcr.io/devcontainers/features/git:1": {},
    "ghcr.io/devcontainers/features/github-cli:1": {}
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "ms-vscode.vscode-typescript-next",
        "bradlc.vscode-tailwindcss",
        "steoates.autoimport",
        "christian-kohler.path-intellisense",
        "formulahendry.auto-rename-tag",
        "ms-azuretools.vscode-docker"
      ],
      "settings": {
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "editor.formatOnSave": true,
        "editor.codeActionsOnSave": {
          "source.fixAll.eslint": true
        },
        "typescript.preferences.importModuleSpecifier": "non-relative"
      }
    }
  },
  "forwardPorts": [3000, 6006],
  "postCreateCommand": "npm install",
  "remoteUser": "node"
}
```

#### .devcontainer/docker-compose.yml

バックエンドとデータベースを含む構成：

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    volumes:
      - ../..:/workspaces:cached
    command: sleep infinity
    network_mode: service:db
    environment:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/eshop
      REDIS_URL: redis://localhost:6379

  db:
    image: postgres:15
    restart: unless-stopped
    volumes:
      - postgres-data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: eshop

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    network_mode: service:db

volumes:
  postgres-data:
```

### 使用方法

1. VSCodeでプロジェクトを開く
2. コマンドパレット (Cmd/Ctrl + Shift + P) を開く
3. "Dev Containers: Reopen in Container" を選択
4. コンテナが起動し、開発環境が自動構築される

## 提案2: Docker Compose（Dev Containerなし）

### docker-compose.yml

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    ports:
      - "3000:3000"
      - "6006:6006"
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    command: npm run dev

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/eshop
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload

  db:
    image: postgres:15
    volumes:
      - postgres-data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=eshop
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  adminer:
    image: adminer
    ports:
      - "8080:8080"
    depends_on:
      - db

volumes:
  postgres-data:
```

### frontend/Dockerfile.dev

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 依存関係をキャッシュ
COPY package*.json ./
RUN npm ci

# ソースコードをコピー
COPY . .

EXPOSE 3000 6006

CMD ["npm", "run", "dev"]
```

### 使用方法

```bash
# 起動
docker-compose up

# バックグラウンドで起動
docker-compose up -d

# ログを見る
docker-compose logs -f frontend

# 停止
docker-compose down

# ボリュームも削除
docker-compose down -v
```

## 提案3: asdf でのバージョン管理

Dev Containerを使わない場合、asdfでNode.jsバージョンを統一：

### .tool-versions

```
nodejs 20.10.0
```

### インストール

```bash
# asdf のインストール（macOS）
brew install asdf

# Node.js プラグインを追加
asdf plugin add nodejs

# .tool-versions のバージョンをインストール
asdf install

# 確認
node --version
```

## Makefileでのタスク自動化

### Makefile

```makefile
.PHONY: help install dev build test lint format clean

help: ## ヘルプを表示
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## 依存関係をインストール
	npm install

dev: ## 開発サーバーを起動
	npm run dev

storybook: ## Storybookを起動
	npm run storybook

build: ## ビルド
	npm run build

test: ## テストを実行
	npm test

test-e2e: ## E2Eテストを実行
	npm run test:e2e

lint: ## Lintチェック
	npm run lint

format: ## フォーマット
	npm run format

type-check: ## 型チェック
	npm run type-check

clean: ## ビルドファイルを削除
	rm -rf .next out node_modules

docker-up: ## Dockerコンテナを起動
	docker-compose up -d

docker-down: ## Dockerコンテナを停止
	docker-compose down

docker-logs: ## Dockerログを表示
	docker-compose logs -f

docker-restart: ## Dockerコンテナを再起動
	docker-compose restart
```

### 使用例

```bash
make help        # ヘルプを表示
make install     # インストール
make dev         # 開発サーバー起動
make docker-up   # Docker起動
```

## package.jsonスクリプト整理

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "prepare": "husky install",
    "analyze": "ANALYZE=true npm run build"
  }
}
```

## GitHubテンプレート

### .github/pull_request_template.md

```markdown
## 変更内容

<!-- このPRで何を変更したか -->

## 関連Issue

<!-- 関連するIssueがあればリンク -->
Closes #

## チェックリスト

- [ ] コードが正しく動作することを確認した
- [ ] テストを追加/更新した
- [ ] ドキュメントを更新した
- [ ] Lintエラーがない
- [ ] 型エラーがない

## スクリーンショット

<!-- UIに変更がある場合 -->
```

### .github/ISSUE_TEMPLATE/bug_report.md

```markdown
---
name: Bug Report
about: バグを報告する
---

## バグの説明

<!-- バグの内容を簡潔に -->

## 再現手順

1.
2.
3.

## 期待される動作

<!-- 本来どう動くべきか -->

## 実際の動作

<!-- 実際にどう動いたか -->

## 環境

- OS:
- ブラウザ:
- Node.js バージョン:
```

## メリット

1. **環境の統一**: 全員が同じ環境で開発
2. **オンボーディング高速化**: 新メンバーがすぐに開発開始
3. **トラブルシューティング簡単**: 環境起因の問題を排除
4. **再現性**: 本番環境に近い状態で開発

## デメリット

1. **初期設定**: セットアップに時間がかかる
2. **Docker知識**: 基本的な理解が必要
3. **リソース**: PCのメモリ/CPUを消費

## 導入の推奨度

**⭐⭐⭐⭐⭐ (非常に高い)**

特にチーム開発では必須です。**Dev Container**を推奨します。

## 参考資料

- [Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers)
- [Docker Compose](https://docs.docker.com/compose/)
- [asdf](https://asdf-vm.com/)
