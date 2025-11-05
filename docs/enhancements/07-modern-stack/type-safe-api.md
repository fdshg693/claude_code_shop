# Type-safe API Communication（型安全なAPI通信）

## 概要

フロントエンドとバックエンド間のAPI通信を型安全にする方法を紹介します。

## tRPC（推奨）

End-to-endで型安全なAPIを構築できます。

### 特徴

- TypeScriptの型がフロントエンドとバックエンドで共有される
- コード生成不要
- 自動補完とエラーチェック
- React Query統合

### セットアップ

#### インストール

```bash
# サーバー側
npm install @trpc/server zod

# クライアント側
npm install @trpc/client @trpc/react-query @tanstack/react-query
```

#### バックエンド（例: Next.js API Routes）

```typescript
// server/trpc.ts
import { initTRPC } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

// server/routers/product.ts
import { router, publicProcedure } from '../trpc';
import { z } from 'zod';

export const productRouter = router({
  getAll: publicProcedure.query(async () => {
    // データベースから取得
    const products = await db.product.findMany();
    return products;
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const product = await db.product.findUnique({
        where: { id: input.id },
      });
      return product;
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        price: z.number().positive(),
        categoryId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const product = await db.product.create({
        data: input,
      });
      return product;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          name: z.string().min(1).max(200).optional(),
          price: z.number().positive().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const product = await db.product.update({
        where: { id: input.id },
        data: input.data,
      });
      return product;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.product.delete({
        where: { id: input.id },
      });
      return { success: true };
    }),
});

// server/routers/_app.ts
import { router } from '../trpc';
import { productRouter } from './product';
import { orderRouter } from './order';

export const appRouter = router({
  product: productRouter,
  order: orderRouter,
});

export type AppRouter = typeof appRouter;
```

#### Next.js API Route

```typescript
// app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/routers/_app';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => ({}),
  });

export { handler as GET, handler as POST };
```

#### フロントエンド

```typescript
// utils/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@/server/routers/_app';

export const trpc = createTRPCReact<AppRouter>();

// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState } from 'react';
import { trpc } from '@/utils/trpc';

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
```

#### コンポーネントでの使用

```typescript
// components/ProductList.tsx
import { trpc } from '@/utils/trpc';

export function ProductList() {
  // ✅ 完全な型安全性
  const { data: products, isLoading } = trpc.product.getAll.useQuery();

  if (isLoading) return <div>Loading...</div>;

  return (
    <ul>
      {products?.map((product) => (
        <li key={product.id}>
          {product.name} - ¥{product.price}
        </li>
      ))}
    </ul>
  );
}

// components/ProductForm.tsx
export function ProductForm() {
  const utils = trpc.useUtils();

  // Mutation
  const createProduct = trpc.product.create.useMutation({
    onSuccess: () => {
      // キャッシュを無効化
      utils.product.getAll.invalidate();
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // ✅ 型安全な呼び出し
    createProduct.mutate({
      name: 'New Product',
      price: 1000,
      categoryId: 1,
    });
  };

  return <form onSubmit={handleSubmit}>{/* ... */}</form>;
}
```

## GraphQL（代替案）

### Apollo Client

```bash
npm install @apollo/client graphql
```

```typescript
// lib/apollo-client.ts
import { ApolloClient, InMemoryCache } from '@apollo/client';

export const client = new ApolloClient({
  uri: 'http://localhost:4000/graphql',
  cache: new InMemoryCache(),
});

// app/providers.tsx
import { ApolloProvider } from '@apollo/client';
import { client } from '@/lib/apollo-client';

export function Providers({ children }: { children: React.ReactNode }) {
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}

// queries/products.ts
import { gql } from '@apollo/client';

export const GET_PRODUCTS = gql`
  query GetProducts {
    products {
      id
      name
      price
      description
    }
  }
`;

// components/ProductList.tsx
import { useQuery } from '@apollo/client';
import { GET_PRODUCTS } from '@/queries/products';

export function ProductList() {
  const { data, loading, error } = useQuery(GET_PRODUCTS);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data.products.map((product: any) => (
        <li key={product.id}>{product.name}</li>
      ))}
    </ul>
  );
}
```

### GraphQL Code Generator

型安全性を追加：

```bash
npm install -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations @graphql-codegen/typescript-react-apollo
```

```yaml
# codegen.yml
schema: http://localhost:4000/graphql
documents: 'src/**/*.graphql'
generates:
  src/generated/graphql.ts:
    plugins:
      - typescript
      - typescript-operations
      - typescript-react-apollo
```

## OpenAPI / Swagger

### openapi-typescript

```bash
npm install -D openapi-typescript
```

```bash
# スキーマから型を生成
npx openapi-typescript https://api.example.com/openapi.json -o src/types/api.ts
```

```typescript
// types/api.ts（生成される）
export interface paths {
  '/products': {
    get: {
      responses: {
        200: {
          content: {
            'application/json': Product[];
          };
        };
      };
    };
  };
}
```

## 比較表

| 手法 | 型安全性 | 学習コスト | セットアップ | エコシステム | 推奨度 |
|------|---------|-----------|------------|-------------|--------|
| **tRPC** | ⭐⭐⭐⭐⭐ | 低 | 簡単 | React Query | ⭐⭐⭐⭐⭐ |
| **GraphQL** | ⭐⭐⭐⭐ | 高 | 複雑 | 非常に豊富 | ⭐⭐⭐⭐ |
| **OpenAPI** | ⭐⭐⭐ | 中 | 中程度 | 広く使われる | ⭐⭐⭐ |
| **REST + Zod** | ⭐⭐⭐ | 低 | 簡単 | 標準的 | ⭐⭐⭐ |

## 推奨

**TypeScriptプロジェクトでフルスタック開発する場合**:
- **tRPC**を強く推奨します

**既存のGraphQL APIがある場合**:
- **Apollo Client + GraphQL Code Generator**

**既存のREST APIがある場合**:
- **OpenAPI + openapi-typescript**
- または **Zod + Repository パターン**

## tRPC のメリット

1. **ゼロコスト抽象化**: コード生成不要
2. **完全な型安全性**: E2Eで型が保証される
3. **優れたDX**: 自動補完が効く
4. **軽量**: 追加のビルドステップなし
5. **React Query統合**: キャッシュ、楽観的更新など

## tRPC のデメリット

1. **モノレポ推奨**: フロント・バックが同じリポジトリ
2. **TypeScript必須**: JSでは使えない
3. **REST APIではない**: 外部公開には不向き
4. **学習リソース**: GraphQLより少ない

## 参考資料

- [tRPC](https://trpc.io/)
- [Apollo Client](https://www.apollographql.com/docs/react/)
- [GraphQL Code Generator](https://the-guild.dev/graphql/codegen)
- [openapi-typescript](https://github.com/drwpow/openapi-typescript)
