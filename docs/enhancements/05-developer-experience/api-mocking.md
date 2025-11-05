# API Mocking with MSW

## 概要

Mock Service Worker (MSW)を使って、API呼び出しをモック化し、バックエンドなしでフロントエンド開発を進められるようにします。

## 現状の課題

- バックエンドAPIの完成を待つ必要がある
- APIサーバーが不安定な場合に開発が止まる
- エッジケースのテストが困難
- オフラインで開発できない

## 提案: MSWの導入

### インストール

```bash
npm install -D msw
```

### セットアップ

#### Service Workerの初期化

```bash
npx msw init public/ --save
```

#### ハンドラーの作成

```typescript
// mocks/handlers.ts
import { http, HttpResponse } from 'msw';
import type { Product, Order, User } from '@/types';

// モックデータ
const mockProducts: Product[] = [
  {
    id: 1,
    name: 'Wireless Headphones',
    description: 'High-quality wireless headphones',
    price: 15000,
    stock_quantity: 10,
    category_id: 1,
    image_url: 'https://via.placeholder.com/300',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Smart Watch',
    description: 'Feature-rich smart watch',
    price: 25000,
    stock_quantity: 5,
    category_id: 1,
    image_url: 'https://via.placeholder.com/300',
    is_active: true,
    created_at: '2024-01-02T00:00:00Z',
  },
];

export const handlers = [
  // 商品一覧取得
  http.get('/api/products', () => {
    return HttpResponse.json(mockProducts);
  }),

  // 商品詳細取得
  http.get('/api/products/:id', ({ params }) => {
    const { id } = params;
    const product = mockProducts.find((p) => p.id === Number(id));

    if (!product) {
      return HttpResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(product);
  }),

  // 商品作成
  http.post('/api/products', async ({ request }) => {
    const newProduct = await request.json() as Product;

    const product: Product = {
      ...newProduct,
      id: mockProducts.length + 1,
      created_at: new Date().toISOString(),
      is_active: true,
    };

    mockProducts.push(product);

    return HttpResponse.json(product, { status: 201 });
  }),

  // 商品更新
  http.put('/api/products/:id', async ({ params, request }) => {
    const { id } = params;
    const updates = await request.json() as Partial<Product>;
    const index = mockProducts.findIndex((p) => p.id === Number(id));

    if (index === -1) {
      return HttpResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    mockProducts[index] = {
      ...mockProducts[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    return HttpResponse.json(mockProducts[index]);
  }),

  // 商品削除
  http.delete('/api/products/:id', ({ params }) => {
    const { id } = params;
    const index = mockProducts.findIndex((p) => p.id === Number(id));

    if (index === -1) {
      return HttpResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    mockProducts.splice(index, 1);

    return HttpResponse.json(null, { status: 204 });
  }),

  // カテゴリ別商品取得
  http.get('/api/products', ({ request }) => {
    const url = new URL(request.url);
    const categoryId = url.searchParams.get('category_id');

    if (categoryId) {
      const filtered = mockProducts.filter(
        (p) => p.category_id === Number(categoryId)
      );
      return HttpResponse.json(filtered);
    }

    return HttpResponse.json(mockProducts);
  }),

  // 検索
  http.get('/api/products/search', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';

    const results = mockProducts.filter((p) =>
      p.name.toLowerCase().includes(query.toLowerCase())
    );

    return HttpResponse.json(results);
  }),

  // 認証
  http.post('/api/auth/login', async ({ request }) => {
    const { email, password } = await request.json() as { email: string; password: string };

    // 簡易的な認証チェック
    if (email === 'admin@example.com' && password === 'password') {
      return HttpResponse.json({
        access_token: 'mock-token-123',
        token_type: 'Bearer',
      });
    }

    return HttpResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  // 注文作成
  http.post('/api/orders', async ({ request }) => {
    const orderData = await request.json() as any;

    const order: Order = {
      id: Math.floor(Math.random() * 1000),
      user_id: 1,
      total_amount: orderData.items.reduce(
        (sum: number, item: any) => sum + item.quantity * 1000,
        0
      ),
      status: 'pending',
      shipping_address: orderData.shipping_address,
      created_at: new Date().toISOString(),
      order_items: orderData.items,
    };

    return HttpResponse.json(order, { status: 201 });
  }),
];
```

#### ブラウザでのセットアップ

```typescript
// mocks/browser.ts
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

#### 開発環境での有効化

```typescript
// app/providers.tsx (または _app.tsx)
'use client';

import { useEffect, useState } from 'react';

export function MockProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function enableMocking() {
      if (process.env.NODE_ENV === 'development') {
        const { worker } = await import('@/mocks/browser');
        await worker.start({
          onUnhandledRequest: 'bypass',
        });
      }
      setReady(true);
    }

    enableMocking();
  }, []);

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}
```

### 高度な使用例

#### 遅延のシミュレーション

```typescript
http.get('/api/products', async () => {
  // 2秒の遅延
  await delay(2000);
  return HttpResponse.json(mockProducts);
});
```

#### エラーケースのシミュレーション

```typescript
// handlers/errorHandlers.ts
export const errorHandlers = [
  // 500エラー
  http.get('/api/products', () => {
    return HttpResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }),

  // ネットワークエラー
  http.get('/api/products', () => {
    return HttpResponse.error();
  }),

  // タイムアウト
  http.get('/api/products', async () => {
    await delay(30000);
    return HttpResponse.json(mockProducts);
  }),
];
```

#### ランダムなエラー

```typescript
http.get('/api/products', () => {
  // 20%の確率でエラー
  if (Math.random() < 0.2) {
    return HttpResponse.json(
      { error: 'Random error occurred' },
      { status: 500 }
    );
  }

  return HttpResponse.json(mockProducts);
});
```

#### ページネーション

```typescript
http.get('/api/products', ({ request }) => {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get('page') || '1');
  const limit = Number(url.searchParams.get('limit') || '10');

  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedProducts = mockProducts.slice(start, end);

  return HttpResponse.json({
    data: paginatedProducts,
    meta: {
      total: mockProducts.length,
      page,
      limit,
      totalPages: Math.ceil(mockProducts.length / limit),
    },
  });
});
```

### テストでの使用

```typescript
// tests/setup.ts
import { beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from '@/mocks/handlers';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

```typescript
// components/__tests__/ProductList.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/tests/setup';
import { ProductList } from '../ProductList';

describe('ProductList', () => {
  it('should display products', async () => {
    render(<ProductList />);

    await waitFor(() => {
      expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
    });
  });

  it('should handle error', async () => {
    // このテストだけエラーを返す
    server.use(
      http.get('/api/products', () => {
        return HttpResponse.json(
          { error: 'Failed to fetch' },
          { status: 500 }
        );
      })
    );

    render(<ProductList />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

### 環境切り替え

```typescript
// .env.local
NEXT_PUBLIC_USE_MOCKS=true

// mocks/browser.ts
export async function enableMocking() {
  if (process.env.NEXT_PUBLIC_USE_MOCKS !== 'true') {
    return;
  }

  const { worker } = await import('./browser');
  return worker.start();
}
```

### デバッグ

```typescript
// ブラウザのコンソールで確認
worker.start({
  onUnhandledRequest: 'warn', // モックされていないリクエストを警告
});

// ハンドラーを動的に追加
worker.use(
  http.get('/api/debug', () => {
    return HttpResponse.json({ message: 'Debug endpoint' });
  })
);

// すべてのハンドラーをリセット
worker.resetHandlers();

// Service Workerを停止
worker.stop();
```

## メリット

1. **バックエンド不要**: APIなしで開発を進められる
2. **エッジケースのテスト**: エラーケースを簡単に再現
3. **高速な開発**: ネットワーク遅延なし
4. **オフライン開発**: インターネット不要
5. **一貫性**: 誰でも同じモックデータで開発

## デメリット

1. **モックデータのメンテナンス**: 実際のAPIと同期が必要
2. **初期設定**: ハンドラーの作成に時間がかかる
3. **本番との乖離**: モックと実際のAPIの動作が異なる可能性

## 導入の推奨度

**⭐⭐⭐⭐⭐ (非常に高い)**

フロントエンド開発の効率を大幅に向上させます。

## 参考資料

- [MSW](https://mswjs.io/)
- [MSW Examples](https://github.com/mswjs/examples)
- [Testing with MSW](https://mswjs.io/docs/getting-started/integrate/node)
