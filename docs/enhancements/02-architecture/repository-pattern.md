# Repository Pattern（リポジトリパターン）

## 概要

Repository Patternは、データアクセスロジックをビジネスロジックから分離し、データソースへのアクセスを抽象化するパターンです。

## 現状の課題

コンポーネントやサービス内で直接APIを呼び出すと、以下の問題が発生します：

```typescript
// ❌ コンポーネント内で直接API呼び出し
export function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    axios.get('/api/products').then(response => {
      setProducts(response.data);
    });
  }, []);

  // ...
}
```

**問題点:**
- データ取得ロジックが散在する
- テストが困難
- API URLの変更が大変
- キャッシュやエラーハンドリングの実装が重複

## 提案: Repositoryパターンの導入

### ディレクトリ構造

```
src/
├── repositories/
│   ├── base.repository.ts
│   ├── product.repository.ts
│   ├── category.repository.ts
│   ├── order.repository.ts
│   └── user.repository.ts
├── services/
│   └── api.service.ts
└── types/
    └── result.ts
```

### 実装例

#### Base Repository

```typescript
// repositories/base.repository.ts
import { Result, Ok, Err } from '@/types/result';
import { apiService } from '@/services/api.service';

export type RepositoryError =
  | { type: 'NotFound'; id: string | number }
  | { type: 'NetworkError'; message: string }
  | { type: 'ValidationError'; errors: any[] }
  | { type: 'Unauthorized' }
  | { type: 'Forbidden' };

export abstract class BaseRepository<T, TCreate, TUpdate> {
  constructor(protected readonly basePath: string) {}

  async findAll(): Promise<Result<T[], RepositoryError>> {
    try {
      const response = await apiService.get<T[]>(this.basePath);
      return Ok(response.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async findById(id: number | string): Promise<Result<T, RepositoryError>> {
    try {
      const response = await apiService.get<T>(`${this.basePath}/${id}`);
      return Ok(response.data);
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return Err({ type: 'NotFound', id });
      }
      return this.handleError(error);
    }
  }

  async create(data: TCreate): Promise<Result<T, RepositoryError>> {
    try {
      const response = await apiService.post<T>(this.basePath, data);
      return Ok(response.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async update(id: number | string, data: TUpdate): Promise<Result<T, RepositoryError>> {
    try {
      const response = await apiService.put<T>(`${this.basePath}/${id}`, data);
      return Ok(response.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async delete(id: number | string): Promise<Result<void, RepositoryError>> {
    try {
      await apiService.delete(`${this.basePath}/${id}`);
      return Ok(undefined);
    } catch (error) {
      return this.handleError(error);
    }
  }

  protected handleError(error: any): Result<never, RepositoryError> {
    if (error.response?.status === 401) {
      return Err({ type: 'Unauthorized' });
    }
    if (error.response?.status === 403) {
      return Err({ type: 'Forbidden' });
    }
    if (error.response?.status === 422) {
      return Err({ type: 'ValidationError', errors: error.response.data.errors });
    }
    return Err({
      type: 'NetworkError',
      message: error.message || 'Unknown error'
    });
  }

  protected isNotFoundError(error: any): boolean {
    return error.response?.status === 404;
  }
}
```

#### Product Repository

```typescript
// repositories/product.repository.ts
import { BaseRepository } from './base.repository';
import { Product, ProductCreate, ProductUpdate } from '@/types/product';
import { Result, Ok } from '@/types/result';
import { apiService } from '@/services/api.service';

export class ProductRepository extends BaseRepository<Product, ProductCreate, ProductUpdate> {
  constructor() {
    super('/products');
  }

  // カスタムメソッド
  async findByCategory(categoryId: number): Promise<Result<Product[], RepositoryError>> {
    try {
      const response = await apiService.get<Product[]>(
        `${this.basePath}?category_id=${categoryId}`
      );
      return Ok(response.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async search(query: string): Promise<Result<Product[], RepositoryError>> {
    try {
      const response = await apiService.get<Product[]>(
        `${this.basePath}/search?q=${encodeURIComponent(query)}`
      );
      return Ok(response.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async findActive(): Promise<Result<Product[], RepositoryError>> {
    try {
      const response = await apiService.get<Product[]>(
        `${this.basePath}?is_active=true`
      );
      return Ok(response.data);
    } catch (error) {
      return this.handleError(error);
    }
  }
}

// シングルトンインスタンス
export const productRepository = new ProductRepository();
```

#### Order Repository

```typescript
// repositories/order.repository.ts
import { BaseRepository, RepositoryError } from './base.repository';
import { Order, OrderCreate, OrderUpdate } from '@/types/order';
import { Result, Ok } from '@/types/result';
import { apiService } from '@/services/api.service';

export class OrderRepository extends BaseRepository<Order, OrderCreate, OrderUpdate> {
  constructor() {
    super('/orders');
  }

  async findByUser(userId: number): Promise<Result<Order[], RepositoryError>> {
    try {
      const response = await apiService.get<Order[]>(
        `${this.basePath}?user_id=${userId}`
      );
      return Ok(response.data);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async findCurrentUserOrders(): Promise<Result<Order[], RepositoryError>> {
    try {
      const response = await apiService.get<Order[]>(`${this.basePath}/me`);
      return Ok(response.data);
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export const orderRepository = new OrderRepository();
```

### 使用例

#### コンポーネントでの使用

```typescript
// components/ProductList.tsx
import { useEffect, useState } from 'react';
import { productRepository } from '@/repositories/product.repository';
import { Product } from '@/types/product';
import { isOk } from '@/types/result';

export function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      const result = await productRepository.findActive();

      if (isOk(result)) {
        setProducts(result.value);
      } else {
        setError('商品の読み込みに失敗しました');
      }

      setLoading(false);
    }

    loadProducts();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <ul>
      {products.map(product => (
        <li key={product.id}>{product.name}</li>
      ))}
    </ul>
  );
}
```

#### カスタムフックでの使用

```typescript
// hooks/useProducts.ts
import { useState, useEffect } from 'react';
import { productRepository } from '@/repositories/product.repository';
import { Product } from '@/types/product';
import { isOk } from '@/types/result';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      const result = await productRepository.findAll();

      if (isOk(result)) {
        setProducts(result.value);
      } else {
        setError(result.error.type);
      }

      setLoading(false);
    }

    fetch();
  }, []);

  return { products, loading, error };
}
```

## メリット

1. **関心の分離**: データアクセスロジックが一箇所に集約
2. **テストの容易性**: Repositoryをモック化しやすい
3. **再利用性**: 同じデータ取得ロジックを複数箇所で使える
4. **変更への対応**: API変更時の修正が一箇所で済む
5. **型安全性**: Result型と組み合わせて型安全に

## デメリット

1. **抽象化のコスト**: シンプルなCRUDには過剰かも
2. **ファイル数の増加**: 各エンティティごとにファイルが必要
3. **学習コスト**: パターンの理解が必要

## 導入の推奨度

**⭐⭐⭐⭐☆ (高)**

特に中規模以上のアプリケーションでは効果的です。

## テスト例

```typescript
// repositories/__tests__/product.repository.test.ts
import { productRepository } from '../product.repository';
import { apiService } from '@/services/api.service';
import { isOk, isErr } from '@/types/result';

// API Serviceをモック化
jest.mock('@/services/api.service');

describe('ProductRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return products on success', async () => {
      const mockProducts = [
        { id: 1, name: 'Product 1', price: 1000 },
        { id: 2, name: 'Product 2', price: 2000 },
      ];

      (apiService.get as jest.Mock).mockResolvedValue({
        data: mockProducts,
      });

      const result = await productRepository.findAll();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual(mockProducts);
      }
    });

    it('should return error on network failure', async () => {
      (apiService.get as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const result = await productRepository.findAll();

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('NetworkError');
      }
    });
  });
});
```

## 参考資料

- [Martin Fowler - Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Microsoft - Repository Pattern](https://docs.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design)
