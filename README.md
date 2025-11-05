# 簡易ESHOPアプリ

簡易的なEコマースアプリケーションの設計・実装プロジェクト

## プロジェクト概要

このプロジェクトは、基本的なEコマース機能を持つWebアプリケーションです。
商品閲覧、カート機能、注文管理などの基本機能を実装します。

## 技術スタック

- **Backend**: Python (FastAPI)
- **Frontend**: Node.js (React + Next.js)
- **Database**: PostgreSQL
- **Cache**: Redis
- **Infrastructure**: Docker + Docker Compose

## 主要機能

1. 商品管理（一覧、詳細、検索）
2. ユーザー認証（登録、ログイン）
3. カート機能
4. 注文機能
5. 管理者機能（商品管理）

## プロジェクト構成

```
.
├── backend/              # Pythonバックエンド
├── frontend/             # Node.jsフロントエンド
├── nginx/                # Nginx設定
├── docker-compose.yml    # Docker Compose設定
└── docs/                 # 設計ドキュメント
    ├── architecture/     # アーキテクチャ設計
    ├── data-model/       # データモデル設計
    ├── api/              # API設計
    ├── frontend/         # フロントエンド設計
    └── infrastructure/   # インフラ設計
```

## 設計ドキュメント

詳細な設計は以下のドキュメントを参照してください：

- [アーキテクチャ概要](./docs/architecture/overview.md)
- [データモデル設計](./docs/data-model/entities.md)
- [API設計](./docs/api/endpoints.md)
- [フロントエンド設計](./docs/frontend/design.md)
- [インフラ設計](./docs/infrastructure/deployment.md)

## セットアップ（予定）

```bash
# リポジトリクローン
git clone <repository-url>
cd claude_code_shop

# 環境変数設定
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Docker Composeで起動
docker-compose up -d

# DBマイグレーション実行
docker-compose exec backend alembic upgrade head

# アプリケーションアクセス
# Frontend: http://localhost
# Backend API: http://localhost/api/v1
# API Docs: http://localhost/api/v1/docs
```

## 開発ステータス

現在は設計フェーズです。実装は今後進めていきます。

## ライセンス

MIT License
