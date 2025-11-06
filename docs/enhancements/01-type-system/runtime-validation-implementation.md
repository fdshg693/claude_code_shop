# Runtime Validation with io-ts - Implementation Guide

## 概要

このドキュメントは、`runtime-validation.md` に基づいて io-ts ライブラリを使用したランタイムバリデーションの実装を説明します。

## インストール済みライブラリ

```bash
npm install io-ts fp-ts
```

- **io-ts**: TypeScript のランタイムバリデーションライブラリ
- **fp-ts**: 関数型プログラミングユーティリティ（io-ts の依存関係）

## 実装内容

### 1. スキーマ定義

#### Product Schema (`frontend/src/schemas/product.schema.ts`)

```typescript
import * as t from 'io-ts';
import { ProductId, CategoryId, Price, Quantity } from '../types/branded';

// カスタムCodecでBranded Typesと統合
const ProductIdCodec = new t.Type<ProductId, number, unknown>(/*...*/);
const PriceCodec = new t.Type<Price, number, unknown>(/*...*/);

// Productスキーマ
export const ProductSchema = t.type({
  id: ProductIdCodec,
  name: stringWithMinMax(1, 200, 'ProductName'),
  price: PriceCodec,
  // ...
});

export type Product = t.TypeOf<typeof ProductSchema>;
```

**特徴:**
- Branded Types との統合により、型安全性を保持
- カスタムバリデーション（文字列長、URL、日時形式など）
- Create/Update 用のスキーマも定義

#### Order Schema (`frontend/src/schemas/order.schema.ts`)

```typescript
export const OrderStatusSchema = t.union([
  t.literal('pending'),
  t.literal('confirmed'),
  t.literal('shipped'),
  t.literal('delivered'),
  t.literal('cancelled'),
]);

export const OrderSchema = t.type({
  id: OrderIdCodec,
  status: OrderStatusSchema,
  order_items: t.array(OrderItemSchema),
  // ...
});
```

**特徴:**
- Enum 型を literal の union として定義
- ネストされたオブジェクト（OrderItem）のバリデーション

#### User Schema (`frontend/src/schemas/user.schema.ts`)

```typescript
// メールアドレスバリデーション
const emailString = new t.Type<string, string, unknown>(/*...*/);

// パスワード強度バリデーション（8文字以上、大文字・小文字・数字を含む）
const passwordString = new t.Type<string, string, unknown>(/*...*/);

export const UserCreateSchema = t.intersection([
  t.type({
    email: emailString,
    name: stringWithMinMax(2, 100, 'UserName'),
    password: passwordString,
  }),
  t.partial({ role: UserRoleSchema }),
]);
```

**特徴:**
- カスタムバリデーション（メールアドレス、パスワード強度）
- パスワード確認のための追加バリデーション関数

### 2. 環境変数のバリデーション (`frontend/src/config/env.ts`)

```typescript
import * as t from 'io-ts';
import { isRight } from 'fp-ts/Either';
import { PathReporter } from 'io-ts/PathReporter';

const EnvSchema = t.type({
  NODE_ENV: t.union([
    t.literal('development'),
    t.literal('production'),
    t.literal('test'),
  ]),
  NEXT_PUBLIC_API_URL: urlString,
  NEXT_PUBLIC_APP_URL: urlString,
  DATABASE_URL: t.union([urlString, t.undefined]),
});

export const env = validateEnv(); // アプリ起動時に検証
```

**特徴:**
- アプリケーション起動時に環境変数を検証
- 不正な環境変数がある場合は起動を停止

### 3. バリデーションユーティリティ (`frontend/src/utils/validation.ts`)

```typescript
import * as t from 'io-ts';
import { Result, ok, err } from '@/types/result';

// io-tsの結果をResultパターンに変換
export function validate<T, O = T, I = unknown>(
  codec: t.Type<T, O, I>,
  data: I
): Result<T, ValidationError> {
  const result = codec.decode(data);

  if (isRight(result)) {
    return ok(result.right);
  } else {
    return err({
      type: 'ValidationError',
      errors: PathReporter.report(result),
    });
  }
}

// 配列のバリデーション
export function validateArray<T>(codec: t.Type<T>, data: unknown[]): Result<T[]> {
  return validate(t.array(codec), data);
}

// 開発環境でのみバリデーション（パフォーマンス最適化）
export function validateInDev<T>(codec: t.Type<T>, data: unknown): T {
  if (process.env.NODE_ENV === 'development') {
    return validateOrThrow(codec, data);
  }
  return data as T; // 本番環境では型アサーションのみ
}
```

**特徴:**
- io-ts と neverthrow の Result パターンを統合
- 便利なヘルパー関数を提供
- パフォーマンス最適化のための機能

### 4. Product Service の更新 (`frontend/src/services/productService.ts`)

```typescript
import { ProductSchema, ProductCreateSchema } from '@/schemas/product.schema';
import { validate, validateArray } from '@/utils/validation';

export async function fetchProduct(
  id: ProductId
): Promise<Result<Product, ProductError>> {
  try {
    const response = await axios.get(`${API_BASE_URL}/products/${id}`);

    // ✅ io-tsでランタイムバリデーション
    const validationResult = validate(ProductSchema, response.data);

    if (validationResult.isErr()) {
      console.error('Product validation error:', validationResult.error.errors);
      return err({ /* ... */ });
    }

    return ok(validationResult.value);
  } catch (error) {
    // ...
  }
}
```

**特徴:**
- すべての API レスポンスをバリデーション
- 入力データ（Create/Update）もバリデーション
- Result パターンとシームレスに統合

## メリット

### 1. 実行時の型安全性

```typescript
// APIが意図しない形式を返しても検出できる
const result = await fetchProduct(ProductId(1));

if (result.isOk()) {
  // result.value は完全にバリデーション済み
  console.log(result.value.price); // ✅ 型安全
}
```

### 2. Branded Types との統合

```typescript
// Branded Typesとシームレスに統合
const ProductIdCodec = new t.Type<ProductId, number, unknown>(
  'ProductId',
  isProductId,
  (input, context) => {
    // バリデーション + Branded Type への変換
    if (!isValid(input)) return t.failure(input, context);
    return t.success(ProductId(input));
  },
  (id) => id as number
);
```

### 3. 詳細なエラーメッセージ

```typescript
// バリデーション失敗時の詳細なエラー
[
  "Invalid value undefined supplied to : { id: ProductId, name: ProductName, ... }/name: ProductName",
  "Invalid value -100 supplied to : { id: ProductId, price: Price, ... }/price: Price"
]
```

### 4. Result パターンとの統合

```typescript
// neverthrow の Result パターンと完全に統合
const result = validate(ProductSchema, data);

result
  .map((product) => ({ ...product, discounted: product.price * 0.9 }))
  .mapErr((error) => console.error(error.errors));
```

## io-ts vs Zod の比較

| 項目 | io-ts | Zod |
|------|-------|-----|
| **バンドルサイズ** | 小さい（約 6KB） | 大きい（約 14KB） |
| **パフォーマンス** | 高速 | やや遅い |
| **型推論** | 関数型スタイル | オブジェクト指向スタイル |
| **学習曲線** | やや急（fp-ts の知識が必要） | 緩やか |
| **エコシステム** | fp-ts と統合 | React Hook Form などと統合 |
| **エラーメッセージ** | 技術的 | ユーザーフレンドリー |

## パフォーマンス最適化

### 1. 開発環境でのみバリデーション

```typescript
const product = validateInDev(ProductSchema, apiResponse);
// 本番環境ではバリデーションをスキップ
```

### 2. サンプリングバリデーション

```typescript
// 大量データの最初の10件のみバリデーション
const result = validateSample(ProductSchema, largeArray, 10);
```

## 使用例

### API レスポンスのバリデーション

```typescript
const response = await axios.get('/api/products/1');
const result = validate(ProductSchema, response.data);

if (result.isOk()) {
  console.log('Valid product:', result.value);
} else {
  console.error('Validation errors:', result.error.errors);
}
```

### フォーム入力のバリデーション

```typescript
const handleSubmit = (data: unknown) => {
  const result = validate(ProductCreateSchema, data);

  if (result.isErr()) {
    setErrors(result.error.errors);
    return;
  }

  await createProduct(result.value);
};
```

### 環境変数へのアクセス

```typescript
import { env } from '@/config/env';

// ✅ 型安全かつバリデーション済み
console.log(env.NEXT_PUBLIC_API_URL);
```

## 今後の拡張

- [ ] Category スキーマの実装
- [ ] Cart スキーマの実装
- [ ] Order Service の実装
- [ ] User Service の実装
- [ ] フォームバリデーションの統合（React Hook Form など）
- [ ] OpenAPI スキーマからの自動生成

## 参考資料

- [io-ts - GitHub](https://github.com/gcanti/io-ts)
- [fp-ts - GitHub](https://github.com/gcanti/fp-ts)
- [io-ts Documentation](https://gcanti.github.io/io-ts/)
- [neverthrow - GitHub](https://github.com/supermacro/neverthrow)
