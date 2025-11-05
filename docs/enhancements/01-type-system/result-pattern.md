# Result Pattern（結果型パターン）

## 概要

Result Patternは、成功と失敗の両方を型安全に表現するパターンです。例外を投げる代わりに、成功または失敗を明示的な値として返します。

## 現状の課題

現在のエラーハンドリングは、try-catchを使った例外ベースです：

```typescript
async function fetchProduct(id: number): Promise<Product> {
  try {
    const response = await axios.get(`/api/products/${id}`);
    return response.data;
  } catch (error) {
    // エラーの型が不明確
    console.error(error);
    throw error; // 呼び出し側で再度try-catchが必要
  }
}
```

**問題点:**
- エラーの型が`unknown`で扱いにくい
- どんなエラーが発生するか型から分からない
- エラーハンドリングを忘れやすい

## 提案: Result型の導入

### 実装例

```typescript
// types/result.ts
export type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

// ヘルパー関数
export const Ok = <T>(value: T): Result<T, never> => ({
  success: true,
  value,
});

export const Err = <E>(error: E): Result<never, E> => ({
  success: false,
  error,
});

// ユーティリティ関数
export const isOk = <T, E>(result: Result<T, E>): result is { success: true; value: T } => {
  return result.success;
};

export const isErr = <T, E>(result: Result<T, E>): result is { success: false; error: E } => {
  return !result.success;
};

// map: 成功値を変換
export const map = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> => {
  if (isOk(result)) {
    return Ok(fn(result.value));
  }
  return result;
};

// mapErr: エラーを変換
export const mapErr = <T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> => {
  if (isErr(result)) {
    return Err(fn(result.error));
  }
  return result;
};

// flatMap: 結果を連鎖
export const flatMap = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> => {
  if (isOk(result)) {
    return fn(result.value);
  }
  return result;
};
```

### カスタムエラー型の定義

```typescript
// types/errors.ts
export type ProductError =
  | { type: 'NotFound'; productId: number }
  | { type: 'OutOfStock'; productId: number; requested: number }
  | { type: 'InvalidPrice'; price: number }
  | { type: 'NetworkError'; message: string };

export type OrderError =
  | { type: 'EmptyCart' }
  | { type: 'InvalidAddress'; reason: string }
  | { type: 'PaymentFailed'; reason: string }
  | { type: 'NetworkError'; message: string };
```

### 使用例

```typescript
// services/productService.ts
import { Result, Ok, Err } from '@/types/result';
import { ProductError } from '@/types/errors';

async function fetchProduct(id: ProductId): Promise<Result<Product, ProductError>> {
  try {
    const response = await axios.get(`/api/products/${id}`);
    const product = response.data;

    if (!product) {
      return Err({ type: 'NotFound', productId: id });
    }

    return Ok(product);
  } catch (error) {
    return Err({
      type: 'NetworkError',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// 呼び出し側
async function displayProduct(id: ProductId) {
  const result = await fetchProduct(id);

  if (isOk(result)) {
    // ✅ result.value はProduct型
    console.log(result.value.name);
  } else {
    // ✅ result.error はProductError型
    switch (result.error.type) {
      case 'NotFound':
        console.error(`Product ${result.error.productId} not found`);
        break;
      case 'NetworkError':
        console.error(`Network error: ${result.error.message}`);
        break;
      // ... 他のエラーケース
    }
  }
}
```

### Reactコンポーネントでの使用例

```typescript
// components/ProductDetail.tsx
import { useEffect, useState } from 'react';
import { Result, isOk } from '@/types/result';
import { Product } from '@/types/product';
import { ProductError } from '@/types/errors';

export function ProductDetail({ productId }: { productId: ProductId }) {
  const [result, setResult] = useState<Result<Product, ProductError> | null>(null);

  useEffect(() => {
    fetchProduct(productId).then(setResult);
  }, [productId]);

  if (!result) return <div>Loading...</div>;

  if (isOk(result)) {
    return (
      <div>
        <h1>{result.value.name}</h1>
        <p>{result.value.description}</p>
        <p>¥{result.value.price}</p>
      </div>
    );
  }

  // エラー表示
  return (
    <div className="error">
      {result.error.type === 'NotFound' && (
        <p>商品が見つかりません</p>
      )}
      {result.error.type === 'NetworkError' && (
        <p>ネットワークエラー: {result.error.message}</p>
      )}
    </div>
  );
}
```

## メリット

1. **型安全なエラーハンドリング**: エラーの型が明確
2. **強制的なエラー処理**: エラーを無視できない
3. **自己文書化**: 関数シグネチャから発生しうるエラーが分かる
4. **関数合成**: `map`、`flatMap`でエラー処理を連鎖できる
5. **テストしやすい**: 例外ではなく値なのでテストが容易

## デメリット

1. **学習コスト**: チームメンバーへの説明が必要
2. **冗長性**: 成功・失敗の両方を毎回チェックする必要がある
3. **既存コードとの統合**: 既存のtry-catchベースのコードとの併用が必要

## 導入の推奨度

**⭐⭐⭐⭐☆ (高)**

特にビジネスロジックが複雑な部分や、エラーハンドリングが重要な部分で効果的です。

## 代替案

### ライブラリの使用

自前で実装する代わりに、既存のライブラリを使うことも検討できます：

- **neverthrow**: TypeScript用のResult型ライブラリ
- **oxide.ts**: Rust風のResult/Option型

```typescript
import { Result, ok, err } from 'neverthrow';

async function fetchProduct(id: ProductId): Promise<Result<Product, ProductError>> {
  try {
    const response = await axios.get(`/api/products/${id}`);
    return ok(response.data);
  } catch (error) {
    return err({ type: 'NetworkError', message: String(error) });
  }
}
```

## 参考資料

- [neverthrow - GitHub](https://github.com/supermacro/neverthrow)
- [Railway Oriented Programming](https://fsharpforfunandprofit.com/rop/)
