# Result Pattern Implementation with neverthrow

このドキュメントでは、neverthrowライブラリを使用したResult Patternの実装について説明します。

## 実装内容

### 1. ライブラリのインストール

```bash
npm install neverthrow
```

### 2. 型定義

#### カスタムエラー型 (`types/errors.ts`)

各ドメインごとにエラー型を定義しました：

```typescript
export type ProductError =
  | { type: 'NotFound'; productId: number }
  | { type: 'OutOfStock'; productId: number; requested: number }
  | { type: 'InvalidPrice'; price: number }
  | { type: 'NetworkError'; message: string };

export type OrderError = ...
export type CartError = ...
export type UserError = ...
export type CategoryError = ...
```

#### Result型ユーティリティ (`types/result.ts`)

neverthrowの機能をre-exportし、便利なヘルパー関数を追加：

```typescript
import { Result, ok, err, ResultAsync } from 'neverthrow';

export type { Result, ResultAsync };
export { ok, err, okAsync, errAsync };

// 型ガード
export const isOk = <T, E>(result: Result<T, E>): result is Result<T, never> => {
  return result.isOk();
};

export const isErr = <T, E>(result: Result<T, E>): result is Result<never, E> => {
  return result.isErr();
};
```

### 3. サービス層の実装

`services/productService.ts`では、全ての関数がResult型を返すように実装：

```typescript
export async function fetchProduct(
  id: ProductId
): Promise<Result<Product, ProductError>> {
  try {
    const response = await axios.get<Product>(`${API_BASE_URL}/products/${id}`);
    const product = response.data;

    if (!product) {
      return err({ type: 'NotFound', productId: id });
    }

    if (product.price < 0) {
      return err({ type: 'InvalidPrice', price: product.price });
    }

    return ok(product);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return err({ type: 'NotFound', productId: id });
    }
    return err({
      type: 'NetworkError',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
```

### 4. Reactコンポーネントでの使用

`components/ProductDetail.tsx`では、Result型を使った型安全なエラーハンドリングを実装：

```typescript
export function ProductDetail({ productId }: ProductDetailProps) {
  const [result, setResult] = useState<Result<Product, ProductError> | null>(null);

  useEffect(() => {
    fetchProduct(productId).then(setResult);
  }, [productId]);

  if (!result) return <div>Loading...</div>;

  // 型安全な成功ケースの処理
  if (isOk(result)) {
    const product = result.value; // Product型
    return <div>{product.name}</div>;
  }

  // 型安全なエラー処理
  const error = result.error; // ProductError型
  switch (error.type) {
    case 'NotFound':
      return <div>商品が見つかりません (ID: {error.productId})</div>;
    case 'NetworkError':
      return <div>ネットワークエラー: {error.message}</div>;
    // 他のエラーケース...
  }
}
```

## 使用例

### 基本的な使用方法

```typescript
// サービスから商品を取得
const result = await fetchProduct(productId);

// 型ガードを使った処理
if (isOk(result)) {
  console.log('商品名:', result.value.name);
} else {
  console.error('エラー:', result.error.type);
}
```

### neverthrowのmatchメソッドを使用

```typescript
const result = await fetchProduct(productId);

result.match(
  // 成功時
  (product) => {
    console.log('商品名:', product.name);
  },
  // エラー時
  (error) => {
    console.error('エラー:', error.type);
  }
);
```

### mapを使った値の変換

```typescript
const result = await fetchProduct(productId);

const nameResult = result.map((product) => product.name);
// Result<string, ProductError>
```

### andThenを使った連鎖処理

```typescript
const result = await fetchProduct(productId);

const stockResult = result.andThen((product) => {
  if (product.stock_quantity > 0) {
    return ok(product);
  }
  return err({ type: 'OutOfStock', productId: product.id, requested: 1 });
});
```

### ResultAsyncを使った非同期処理

```typescript
import { fromPromise } from '@/types/result';

export function fetchProductAsync(id: ProductId): ResultAsync<Product, ProductError> {
  return fromPromise(
    axios.get<Product>(`${API_BASE_URL}/products/${id}`).then((res) => res.data),
    (error): ProductError => ({
      type: 'NetworkError',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  );
}

// 使用例
const result = await fetchProductAsync(productId);
```

## メリット

1. **型安全性**: エラーの型が明確で、TypeScriptの型チェックが効く
2. **強制的なエラー処理**: Result型を返すため、呼び出し側でエラーを無視できない
3. **自己文書化**: 関数シグネチャから発生しうるエラーが分かる
4. **テストしやすさ**: 例外ではなく値なのでテストが容易
5. **関数合成**: `map`、`andThen`などでエラー処理を連鎖できる

## ベストプラクティス

### 1. エラー型は具体的に定義する

```typescript
// ❌ 悪い例
type Error = string;

// ✅ 良い例
type ProductError =
  | { type: 'NotFound'; productId: number }
  | { type: 'OutOfStock'; productId: number; requested: number };
```

### 2. ビジネスロジック内でバリデーションを行う

```typescript
export async function createProduct(
  data: ProductCreate
): Promise<Result<Product, ProductError>> {
  // APIを呼ぶ前にバリデーション
  if (data.price < 0) {
    return err({ type: 'InvalidPrice', price: data.price });
  }

  // API呼び出し
  // ...
}
```

### 3. エラーメッセージは詳細に

```typescript
return err({
  type: 'NetworkError',
  message: `Failed to fetch product ${id}: ${error.message}`,
});
```

### 4. match()を使って簡潔に記述

```typescript
// ✅ 簡潔で読みやすい
return result.match(
  (product) => <ProductView product={product} />,
  (error) => <ErrorView error={error} />
);
```

## 他のサービスへの適用

同じパターンを他のサービスにも適用できます：

```typescript
// services/orderService.ts
export async function createOrder(
  data: OrderCreate
): Promise<Result<Order, OrderError>> {
  // 実装...
}

// services/cartService.ts
export async function addToCart(
  productId: ProductId,
  quantity: number
): Promise<Result<Cart, CartError>> {
  // 実装...
}
```

## 参考資料

- [neverthrow公式ドキュメント](https://github.com/supermacro/neverthrow)
- [Railway Oriented Programming](https://fsharpforfunandprofit.com/rop/)
- [Rust Result型ドキュメント](https://doc.rust-lang.org/std/result/)
