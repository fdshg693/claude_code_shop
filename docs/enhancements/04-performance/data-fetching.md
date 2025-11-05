# Data Fetching（データ取得最適化）

## 概要

効率的なデータ取得戦略を導入し、アプリケーションのパフォーマンスとUXを向上させます。

## 現状の課題

useEffectとaxiosを直接使用すると、以下の問題が発生します：

```typescript
// ❌ 問題のある実装
function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/products').then(res => {
      setProducts(res.data);
      setLoading(false);
    });
  }, []);

  // ...
}
```

**問題点:**
- キャッシュがない（毎回API呼び出し）
- ローディング状態の管理が煩雑
- エラーハンドリングが不十分
- 再検証の仕組みがない
- プリフェッチができない
- 楽観的更新が困難

## 提案1: TanStack Query (React Query)

### インストール

```bash
npm install @tanstack/react-query
npm install -D @tanstack/react-query-devtools
```

### セットアップ

```typescript
// app/_providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1分
            cacheTime: 5 * 60 * 1000, // 5分
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### 基本的な使用例

```typescript
// hooks/useProducts.ts
import { useQuery } from '@tanstack/react-query';
import { productRepository } from '@/repositories/product.repository';
import { isOk } from '@/types/result';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const result = await productRepository.findAll();
      if (!isOk(result)) {
        throw new Error(result.error.type);
      }
      return result.value;
    },
  });
}

// 使用例
function ProductList() {
  const { data: products, isLoading, error } = useProducts();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {products?.map(product => (
        <li key={product.id}>{product.name}</li>
      ))}
    </ul>
  );
}
```

### 詳細データの取得

```typescript
// hooks/useProduct.ts
import { useQuery } from '@tanstack/react-query';
import { productRepository } from '@/repositories/product.repository';
import { isOk } from '@/types/result';

export function useProduct(id: number) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      const result = await productRepository.findById(id);
      if (!isOk(result)) {
        throw new Error(result.error.type);
      }
      return result.value;
    },
    enabled: !!id, // idがある場合のみ実行
  });
}
```

### Mutation（データ更新）

```typescript
// hooks/useCreateProduct.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productRepository } from '@/repositories/product.repository';
import { isOk } from '@/types/result';
import type { ProductCreate } from '@/types/product';

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProductCreate) => {
      const result = await productRepository.create(data);
      if (!isOk(result)) {
        throw new Error(result.error.type);
      }
      return result.value;
    },
    onSuccess: () => {
      // キャッシュを無効化して再取得
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// 使用例
function ProductForm() {
  const createProduct = useCreateProduct();

  const handleSubmit = (data: ProductCreate) => {
    createProduct.mutate(data, {
      onSuccess: () => {
        alert('商品を作成しました');
      },
      onError: (error) => {
        alert(`エラー: ${error.message}`);
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* フォーム内容 */}
      <button disabled={createProduct.isPending}>
        {createProduct.isPending ? '作成中...' : '作成'}
      </button>
    </form>
  );
}
```

### 楽観的更新

```typescript
// hooks/useUpdateProduct.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Product, ProductUpdate } from '@/types/product';

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ProductUpdate }) => {
      const result = await productRepository.update(id, data);
      if (!isOk(result)) throw new Error(result.error.type);
      return result.value;
    },
    onMutate: async ({ id, data }) => {
      // 進行中のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: ['products', id] });

      // 以前のデータを取得
      const previousProduct = queryClient.getQueryData<Product>(['products', id]);

      // 楽観的更新
      if (previousProduct) {
        queryClient.setQueryData(['products', id], {
          ...previousProduct,
          ...data,
        });
      }

      return { previousProduct };
    },
    onError: (err, { id }, context) => {
      // エラー時はロールバック
      if (context?.previousProduct) {
        queryClient.setQueryData(['products', id], context.previousProduct);
      }
    },
    onSettled: (data, error, { id }) => {
      // 成功・失敗に関わらず再取得
      queryClient.invalidateQueries({ queryKey: ['products', id] });
    },
  });
}
```

### Prefetching（プリフェッチ）

```typescript
// components/ProductListItem.tsx
import { useQueryClient } from '@tanstack/react-query';
import { productRepository } from '@/repositories/product.repository';

function ProductListItem({ product }: { product: Product }) {
  const queryClient = useQueryClient();

  const prefetchProduct = () => {
    queryClient.prefetchQuery({
      queryKey: ['products', product.id],
      queryFn: async () => {
        const result = await productRepository.findById(product.id);
        if (!isOk(result)) throw new Error(result.error.type);
        return result.value;
      },
    });
  };

  return (
    <div onMouseEnter={prefetchProduct}>
      <Link href={`/products/${product.id}`}>
        {product.name}
      </Link>
    </div>
  );
}
```

### Infinite Queries（無限スクロール）

```typescript
// hooks/useInfiniteProducts.ts
import { useInfiniteQuery } from '@tanstack/react-query';

export function useInfiniteProducts(limit = 20) {
  return useInfiniteQuery({
    queryKey: ['products', 'infinite'],
    queryFn: async ({ pageParam = 0 }) => {
      const result = await productRepository.findAll({
        limit,
        offset: pageParam,
      });
      if (!isOk(result)) throw new Error(result.error.type);
      return result.value;
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === limit ? allPages.length * limit : undefined;
    },
  });
}

// 使用例
function InfiniteProductList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteProducts();

  return (
    <div>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ))}
      <button
        onClick={() => fetchNextPage()}
        disabled={!hasNextPage || isFetchingNextPage}
      >
        {isFetchingNextPage ? '読み込み中...' : 'もっと見る'}
      </button>
    </div>
  );
}
```

## 提案2: SWR（代替案）

```bash
npm install swr
```

```typescript
// hooks/useProducts.ts
import useSWR from 'swr';
import { productRepository } from '@/repositories/product.repository';

const fetcher = async () => {
  const result = await productRepository.findAll();
  if (!isOk(result)) throw new Error(result.error.type);
  return result.value;
};

export function useProducts() {
  const { data, error, isLoading, mutate } = useSWR('products', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    products: data,
    isLoading,
    error,
    refresh: mutate,
  };
}
```

## 比較表

| 機能 | TanStack Query | SWR | useEffect + axios |
|------|---------------|-----|-------------------|
| キャッシュ | ✅ | ✅ | ❌ |
| 自動再検証 | ✅ | ✅ | ❌ |
| ローディング状態 | ✅ | ✅ | 手動実装 |
| エラーハンドリング | ✅ | ✅ | 手動実装 |
| 楽観的更新 | ✅ | ⚠️ | ❌ |
| Prefetch | ✅ | ⚠️ | ❌ |
| DevTools | ✅ | ❌ | ❌ |
| 学習コスト | 中 | 低 | 低 |

## メリット

1. **自動キャッシュ**: 同じデータの重複取得を防ぐ
2. **自動再検証**: 最新データを保つ
3. **楽観的更新**: UXの向上
4. **ローディング状態**: 自動管理
5. **エラーリトライ**: 自動で再試行

## デメリット

1. **学習コスト**: 新しいAPIの習得が必要
2. **バンドルサイズ**: ライブラリの追加（TanStack Query: ~15KB）
3. **デバッグ**: キャッシュの挙動が分かりにくい場合がある

## 導入の推奨度

**⭐⭐⭐⭐⭐ (非常に高い)**

データ取得が多いアプリケーションでは必須級の機能です。**TanStack Query**を推奨します。

## 参考資料

- [TanStack Query](https://tanstack.com/query/latest)
- [SWR](https://swr.vercel.app/)
- [React Query vs SWR](https://blog.logrocket.com/react-query-vs-swr/)
