# インフラ設計

## 開発環境構成

### Docker Compose構成

```yaml
services:
  - frontend (Next.js)
  - backend (FastAPI)
  - postgres (PostgreSQL)
  - redis (Redis)
  - nginx (リバースプロキシ)
```

### コンテナ構成図

```
┌─────────────────────────────────────┐
│         Nginx (Port 80)             │
│         Reverse Proxy               │
└─────────┬───────────────────┬───────┘
          │                   │
    ┌─────▼──────┐     ┌─────▼──────┐
    │ Frontend   │     │  Backend   │
    │ (Next.js)  │     │ (FastAPI)  │
    │ Port 3000  │     │ Port 8000  │
    └────────────┘     └─────┬──────┘
                             │
                    ┌────────┴────────┐
                    │                 │
              ┌─────▼──────┐   ┌─────▼──────┐
              │ PostgreSQL │   │   Redis    │
              │ Port 5432  │   │ Port 6379  │
              └────────────┘   └────────────┘
```

## 環境変数

### Backend (.env)
```
DATABASE_URL=postgresql://user:pass@postgres:5432/eshop
REDIS_URL=redis://redis:6379/0
SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=30
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost/api/v1
```

## ポート構成
- **80**: Nginx (外部アクセス)
- **3000**: Frontend (内部)
- **8000**: Backend (内部)
- **5432**: PostgreSQL (内部)
- **6379**: Redis (内部)

## ディレクトリ構成

```
project-root/
├── backend/              Pythonバックエンド
│   ├── app/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/             Node.jsフロントエンド
│   ├── src/
│   ├── package.json
│   └── Dockerfile
├── nginx/                Nginx設定
│   └── nginx.conf
├── docker-compose.yml    Docker Compose設定
└── docs/                 設計ドキュメント
```

## データ永続化
- PostgreSQLデータ: `./data/postgres`
- Redisデータ: メモリのみ（再起動時クリア）

## 起動コマンド

```bash
# 開発環境起動
docker-compose up -d

# ログ確認
docker-compose logs -f

# 停止
docker-compose down

# データベースマイグレーション
docker-compose exec backend alembic upgrade head
```

## 本番環境（参考）
- **Frontend**: Vercel / AWS Amplify
- **Backend**: AWS ECS / Google Cloud Run
- **Database**: AWS RDS (PostgreSQL)
- **Cache**: AWS ElastiCache (Redis)
- **CDN**: CloudFront / Cloudflare
