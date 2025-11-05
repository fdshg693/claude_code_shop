# データモデル設計

## 主要エンティティ

### User（ユーザー）
```
- id (PK)
- email (unique)
- password_hash
- name
- role (customer / admin)
- created_at
- updated_at
```

### Product（商品）
```
- id (PK)
- name
- description
- price
- stock_quantity
- category_id (FK)
- image_url
- is_active
- created_at
- updated_at
```

### Category（カテゴリ）
```
- id (PK)
- name
- description
- parent_id (FK, self-reference)
```

### Order（注文）
```
- id (PK)
- user_id (FK)
- total_amount
- status (pending / confirmed / shipped / delivered / cancelled)
- shipping_address
- created_at
- updated_at
```

### OrderItem（注文明細）
```
- id (PK)
- order_id (FK)
- product_id (FK)
- quantity
- unit_price
- subtotal
```

### Cart（カート）※Redis
```
- user_id (Key)
- items: [
    {
      product_id,
      quantity,
      added_at
    }
  ]
- expires_at
```

## エンティティ関係図（簡易）

```
User ──< Order ──< OrderItem >── Product
                                    │
                                    │
                                    ▼
                                 Category
```

## インデックス戦略
- User: email (unique)
- Product: category_id, is_active
- Order: user_id, status, created_at
- OrderItem: order_id, product_id
