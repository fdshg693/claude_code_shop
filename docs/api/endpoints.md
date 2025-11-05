# API設計

## ベースURL
```
http://localhost:8000/api/v1
```

## エンドポイント一覧

### 認証 (Auth)
```
POST   /auth/register          ユーザー登録
POST   /auth/login             ログイン
POST   /auth/logout            ログアウト
GET    /auth/me                現在のユーザー情報取得
```

### 商品 (Products)
```
GET    /products               商品一覧取得（ページング、検索、フィルタ）
GET    /products/{id}          商品詳細取得
POST   /products               商品登録（管理者のみ）
PUT    /products/{id}          商品更新（管理者のみ）
DELETE /products/{id}          商品削除（管理者のみ）
```

### カテゴリ (Categories)
```
GET    /categories             カテゴリ一覧取得
GET    /categories/{id}        カテゴリ詳細取得
POST   /categories             カテゴリ登録（管理者のみ）
```

### カート (Cart)
```
GET    /cart                   カート情報取得
POST   /cart/items             カートに商品追加
PUT    /cart/items/{product_id} カート商品数量変更
DELETE /cart/items/{product_id} カートから商品削除
DELETE /cart                   カートクリア
```

### 注文 (Orders)
```
GET    /orders                 注文履歴一覧取得
GET    /orders/{id}            注文詳細取得
POST   /orders                 注文作成
PUT    /orders/{id}/status     注文ステータス更新（管理者のみ）
```

## レスポンス形式

### 成功レスポンス
```json
{
  "success": true,
  "data": { ... }
}
```

### エラーレスポンス
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ"
  }
}
```

## 認証方式
- JWT（JSON Web Token）を使用
- Headerに `Authorization: Bearer {token}` を付与
