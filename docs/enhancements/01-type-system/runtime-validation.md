# Runtime Validation（実行時バリデーション）

## 概要

TypeScriptの型は開発時のみ有効で、実行時には消えてしまいます。外部から受け取るデータ（APIレスポンス、フォーム入力など）の型安全性を保証するために、実行時バリデーションが必要です。

## 現状の課題

現在、APIレスポンスをそのまま型アサーションしています：

```typescript
async function fetchProduct(id: number): Promise<Product> {
  const response = await axios.get(`/api/products/${id}`);
  return response.data as Product; // ❌ 実行時の型チェックなし
}

// 問題: APIが意図しない形式を返しても検出できない
// - 必須フィールドが欠けている
// - 数値が文字列で返される
// - 追加のフィールドがある
```

## 提案: Zodによるスキーマバリデーション

### インストール

```bash
npm install zod
```

### 実装例

#### 基本的なスキーマ定義

```typescript
// schemas/product.schema.ts
import { z } from 'zod';

// Productスキーマ
export const ProductSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  price: z.number().positive(),
  stock_quantity: z.number().int().nonnegative(),
  category_id: z.number().int().positive(),
  image_url: z.string().url().optional(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
});

// スキーマから型を生成
export type Product = z.infer<typeof ProductSchema>;

// Create用スキーマ
export const ProductCreateSchema = ProductSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).extend({
  stock_quantity: z.number().int().nonnegative().default(0),
  is_active: z.boolean().default(true),
});

export type ProductCreate = z.infer<typeof ProductCreateSchema>;

// Update用スキーマ
export const ProductUpdateSchema = ProductSchema.partial().omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type ProductUpdate = z.infer<typeof ProductUpdateSchema>;
```

#### Enum型のスキーマ

```typescript
// schemas/order.schema.ts
import { z } from 'zod';

export const OrderStatusSchema = z.enum([
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
]);

export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const OrderItemSchema = z.object({
  id: z.number().int().positive(),
  order_id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive(),
  subtotal: z.number().positive(),
});

export const OrderSchema = z.object({
  id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  total_amount: z.number().positive(),
  status: OrderStatusSchema,
  shipping_address: z.string().min(10).max(500),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
  order_items: z.array(OrderItemSchema),
});

export type Order = z.infer<typeof OrderSchema>;
```

#### APIレスポンスのバリデーション

```typescript
// services/productService.ts
import { ProductSchema } from '@/schemas/product.schema';
import { Result, Ok, Err } from '@/types/result';

async function fetchProduct(id: number): Promise<Result<Product, ProductError>> {
  try {
    const response = await axios.get(`/api/products/${id}`);

    // Zodでバリデーション
    const parsed = ProductSchema.safeParse(response.data);

    if (!parsed.success) {
      console.error('Validation error:', parsed.error);
      return Err({
        type: 'ValidationError',
        errors: parsed.error.errors
      });
    }

    return Ok(parsed.data); // ✅ 型安全
  } catch (error) {
    return Err({
      type: 'NetworkError',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

#### フォームバリデーション

```typescript
// components/ProductForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProductCreateSchema, ProductCreate } from '@/schemas/product.schema';

export function ProductForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductCreate>({
    resolver: zodResolver(ProductCreateSchema),
  });

  const onSubmit = (data: ProductCreate) => {
    // ✅ dataは完全にバリデーション済み
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}

      <input type="number" {...register('price', { valueAsNumber: true })} />
      {errors.price && <span>{errors.price.message}</span>}

      <button type="submit">送信</button>
    </form>
  );
}
```

#### カスタムバリデーション

```typescript
// schemas/user.schema.ts
import { z } from 'zod';

export const UserCreateSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  name: z.string()
    .min(2, '名前は2文字以上で入力してください')
    .max(100, '名前は100文字以内で入力してください'),
  password: z.string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'パスワードは大文字、小文字、数字を含む必要があります'
    ),
  password_confirm: z.string(),
}).refine(
  (data) => data.password === data.password_confirm,
  {
    message: 'パスワードが一致しません',
    path: ['password_confirm'],
  }
);
```

#### 環境変数のバリデーション

```typescript
// config/env.ts
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  DATABASE_URL: z.string().url().optional(),
});

// 環境変数を検証
export const env = EnvSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  DATABASE_URL: process.env.DATABASE_URL,
});

// 使用例
console.log(env.NEXT_PUBLIC_API_URL); // ✅ 型安全かつバリデーション済み
```

## メリット

1. **実行時の型安全性**: APIレスポンスなど外部データの型を保証
2. **スキーマと型の一元管理**: スキーマから型を生成できる
3. **詳細なエラーメッセージ**: どこがどう間違っているか明確
4. **変換機能**: `transform`で値を変換できる
5. **フォームバリデーション**: React Hook Formと統合可能

## デメリット

1. **バンドルサイズ**: Zodはやや大きい（約14KB gzipped）
2. **パフォーマンス**: 大量のデータのバリデーションは時間がかかる
3. **学習コスト**: ZodのAPIを学ぶ必要がある

## 導入の推奨度

**⭐⭐⭐⭐⭐ (非常に高い)**

外部データを扱う現代のアプリケーションでは必須級の機能です。

## 代替案

### 1. Yup

```typescript
import * as yup from 'yup';

const productSchema = yup.object({
  name: yup.string().required().min(1).max(200),
  price: yup.number().required().positive(),
  // ...
});
```

### 2. io-ts

```typescript
import * as t from 'io-ts';

const Product = t.type({
  id: t.number,
  name: t.string,
  price: t.number,
  // ...
});
```

### 3. ArkType

```typescript
import { type } from 'arktype';

const Product = type({
  id: 'number',
  name: 'string',
  price: 'number>0',
  // ...
});
```

## パフォーマンス最適化

大量のデータをバリデーションする場合：

```typescript
// 配列の最初の数件だけバリデーション
const ProductArraySchema = z.array(ProductSchema).refine(
  (products) => {
    // 最初の10件だけ詳細にバリデーション
    const sample = products.slice(0, 10);
    return sample.every(p => p.price > 0 && p.stock_quantity >= 0);
  }
);

// または、開発環境でのみバリデーション
if (process.env.NODE_ENV === 'development') {
  ProductSchema.parse(data);
} else {
  // 本番環境では軽量なチェックのみ
  if (!data.id || !data.name) throw new Error('Invalid product');
}
```

## 参考資料

- [Zod - GitHub](https://github.com/colinhacks/zod)
- [Zod Documentation](https://zod.dev/)
- [React Hook Form + Zod](https://react-hook-form.com/get-started#SchemaValidation)
