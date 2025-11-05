# Branded Types（ブランド型）

## 概要

Branded Typesは、プリミティブ型（number、stringなど）に名前を付けて、型レベルで異なる意味を持つ値を区別する手法です。

## 現状の課題

現在の型定義では、IDや価格など、すべて`number`型として扱われています：

```typescript
interface Product {
  id: number;           // 商品ID
  category_id: number;  // カテゴリID
  price: number;        // 価格
}

// 問題: 異なる意味のIDを誤って混同できてしまう
function getProduct(productId: number) { /* ... */ }
const categoryId = 123;
getProduct(categoryId); // ❌ コンパイルエラーにならない
```

## 提案: Branded Typesの導入

### 実装例

```typescript
// types/branded.ts
declare const __brand: unique symbol;
type Brand<T, TBrand> = T & { [__brand]: TBrand };

// 各種ID型の定義
export type ProductId = Brand<number, 'ProductId'>;
export type CategoryId = Brand<number, 'CategoryId'>;
export type UserId = Brand<number, 'UserId'>;
export type OrderId = Brand<number, 'OrderId'>;

// 価格型の定義（負の値を防ぐ）
export type Price = Brand<number, 'Price'>;

// ヘルパー関数
export const ProductId = (id: number): ProductId => id as ProductId;
export const CategoryId = (id: number): CategoryId => id as CategoryId;
export const UserId = (id: number): UserId => id as UserId;
export const OrderId = (id: number): OrderId => id as OrderId;
export const Price = (price: number): Price => {
  if (price < 0) throw new Error('Price cannot be negative');
  return price as Price;
};
```

### 使用例

```typescript
// types/product.ts
import { ProductId, CategoryId, Price } from './branded';

export interface Product {
  id: ProductId;
  name: string;
  description?: string;
  price: Price;
  stock_quantity: number;
  category_id: CategoryId;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

// 使用側
function getProduct(productId: ProductId): Promise<Product> {
  // ...
}

const categoryId = CategoryId(123);
const productId = ProductId(456);

getProduct(categoryId); // ✅ 型エラー！
getProduct(productId);  // ✅ OK
```

## メリット

1. **型安全性の向上**: 異なる意味のIDを混同することを防ぐ
2. **バリデーション**: 型コンストラクタでバリデーションを実行できる
3. **自己文書化**: 型名から意味が明確になる
4. **リファクタリングの安全性**: 型の変更が必要な箇所を正確に特定できる

## デメリット

1. **学習コスト**: チームメンバーへの説明が必要
2. **型キャストの手間**: 値の生成時に型コンストラクタを呼ぶ必要がある
3. **外部APIとの互換性**: APIレスポンスを変換する必要がある

## 導入の推奨度

**⭐⭐⭐⭐☆ (高)**

型安全性の大幅な向上が期待でき、特にIDの混同によるバグを防げます。

## 参考資料

- [TypeScript Deep Dive - Nominal Typing](https://basarat.gitbook.io/typescript/main-1/nominaltyping)
- [Type-safe IDs in TypeScript](https://dev.to/nexxeln/type-safe-ids-in-typescript-2bh9)
