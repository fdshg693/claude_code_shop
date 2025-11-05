# アーキテクチャ概要

## システム構成

```
┌─────────────────┐
│   Frontend      │  Node.js (React/Next.js)
│   (SPA/SSR)     │
└────────┬────────┘
         │ HTTP/REST
         │
┌────────▼────────┐
│   Backend API   │  Python (FastAPI/Flask)
│                 │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼────┐
│ RDB  │  │ Cache │  PostgreSQL / Redis
└──────┘  └───────┘
```

## 技術スタック

### フロントエンド
- **Framework**: React + Next.js
- **UI Library**: TailwindCSS or Material-UI
- **State Management**: React Context / Zustand
- **HTTP Client**: Axios

### バックエンド
- **Framework**: FastAPI
- **ORM**: SQLAlchemy
- **Validation**: Pydantic
- **Auth**: JWT

### データベース
- **Primary DB**: PostgreSQL (商品、注文、ユーザー情報)
- **Cache**: Redis (セッション、カート情報)

### インフラ
- **Container**: Docker + Docker Compose
- **API Documentation**: OpenAPI (Swagger)

## 主要機能
1. 商品管理（一覧表示、詳細表示、検索）
2. カート機能（追加、削除、数量変更）
3. ユーザー認証（登録、ログイン、ログアウト）
4. 注文機能（注文作成、注文履歴）
5. 管理機能（商品登録・編集・削除）
