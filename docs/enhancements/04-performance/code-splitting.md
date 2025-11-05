# Code Splitting（コード分割）

## 概要

バンドルサイズを最適化し、初期ロード時間を短縮します。

## 現状の課題

すべてのコードを一度に読み込むと、初期表示が遅くなります：

```typescript
// ❌ すべてを静的インポート
import { ProductList } from '@/components/ProductList';
import { ProductDetail } from '@/components/ProductDetail';
import { AdminPanel } from '@/components/AdminPanel';
import { Chart } from '@/components/Chart';
```

## 提案: Dynamic Importの活用

### 1. Route-based Splitting（ルート単位の分割）

Next.jsではApp Routerで自動的に実現されます：

```typescript
// app/products/page.tsx
export default function ProductsPage() {
  return <ProductList />;
}

// app/products/[id]/page.tsx
export default function ProductDetailPage({ params }: { params: { id: string } }) {
  return <ProductDetail id={params.id} />;
}

// ✅ 各ページは自動的に別バンドルになる
```

### 2. Component-based Splitting（コンポーネント単位の分割）

重いコンポーネントを動的にインポート：

```typescript
// components/ProductPage.tsx
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// 動的インポート
const ProductChart = dynamic(() => import('./ProductChart'), {
  loading: () => <div>Loading chart...</div>,
  ssr: false, // クライアントサイドのみで読み込む
});

const ProductReviews = dynamic(() => import('./ProductReviews'), {
  loading: () => <div>Loading reviews...</div>,
});

export function ProductPage({ productId }: { productId: number }) {
  return (
    <div>
      <ProductInfo id={productId} />

      <Suspense fallback={<div>Loading chart...</div>}>
        <ProductChart productId={productId} />
      </Suspense>

      <Suspense fallback={<div>Loading reviews...</div>}>
        <ProductReviews productId={productId} />
      </Suspense>
    </div>
  );
}
```

### 3. Conditional Splitting（条件付き分割）

条件によって読み込み：

```typescript
// components/AdminDashboard.tsx
import dynamic from 'next/dynamic';

const AdminPanel = dynamic(() => import('./AdminPanel'));

export function Dashboard({ user }: { user: User }) {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* 管理者のみロード */}
      {user.role === 'admin' && <AdminPanel />}
    </div>
  );
}
```

### 4. Modal/Dialog Splitting

モーダルを使用時のみロード：

```typescript
// components/ProductList.tsx
import { useState } from 'react';
import dynamic from 'next/dynamic';

const ProductModal = dynamic(() => import('./ProductModal'));

export function ProductList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  return (
    <div>
      {products.map(product => (
        <button
          key={product.id}
          onClick={() => {
            setSelectedProduct(product);
            setIsModalOpen(true);
          }}
        >
          {product.name}
        </button>
      ))}

      {/* モーダルが開かれた時のみロード */}
      {isModalOpen && selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
```

### 5. Library Splitting（ライブラリの分割）

大きなライブラリを動的にインポート：

```typescript
// utils/exportData.ts
export async function exportToExcel(data: any[]) {
  // ExcelJSは必要時のみロード（~500KB）
  const XLSX = await import('xlsx');

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  XLSX.writeFile(workbook, 'export.xlsx');
}

// 使用例
<button onClick={() => exportToExcel(products)}>
  Excelエクスポート
</button>
```

### 6. Named Export Splitting

特定のエクスポートのみをインポート：

```typescript
// ❌ Bad: 全体をインポート
const ProductChart = dynamic(() => import('./Charts'));

// ✅ Good: 必要なもののみ
const ProductChart = dynamic(() =>
  import('./Charts').then(mod => mod.ProductChart)
);
```

## Next.js App Router での最適化

### Server Components活用

```typescript
// app/products/[id]/page.tsx
import { ProductDetail } from '@/components/ProductDetail';

// Server Component（デフォルト）
export default async function ProductPage({
  params,
}: {
  params: { id: string };
}) {
  // サーバーでデータ取得
  const product = await getProduct(params.id);

  return <ProductDetail product={product} />;
}

// Client Componentは明示的に
// components/ProductDetail.tsx
'use client';

import { useState } from 'react';

export function ProductDetail({ product }: { product: Product }) {
  const [count, setCount] = useState(1);
  // ...
}
```

### Loading UI

```typescript
// app/products/loading.tsx
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>
  );
}
```

## Bundle Analyzer で確認

### インストール

```bash
npm install -D @next/bundle-analyzer
```

### next.config.js

```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // Next.js config
});
```

### 実行

```bash
ANALYZE=true npm run build
```

## ベストプラクティス

1. **ルートレベルで分割**: 最も効果的
2. **大きなライブラリは動的に**: Chart.js、moment.jsなど
3. **使用頻度の低いコンポーネント**: モーダル、管理画面など
4. **条件付きレンダリング**: 権限ベースの機能
5. **サーバーコンポーネント優先**: クライアントバンドルを最小化

## メリット

1. **初期ロード高速化**: 必要なコードのみロード
2. **帯域幅削減**: ダウンロードサイズが小さい
3. **キャッシュ効率**: 変更されたバンドルのみ再ダウンロード
4. **並列ロード**: 複数バンドルを同時にロード

## デメリット

1. **ネットワークリクエスト増加**: 多数の小さなファイル
2. **ローディング状態の管理**: UIが複雑になる
3. **デバッグが困難**: バンドルが分散

## 導入の推奨度

**⭐⭐⭐⭐⭐ (非常に高い)**

すべてのプロジェクトで実施すべき基本的な最適化です。

## 測定と改善

### Lighthouse で測定

```bash
# Chromeの開発者ツール > Lighthouse
# または
npm install -g lighthouse
lighthouse https://your-site.com --view
```

### 目標値

- **First Contentful Paint (FCP)**: < 1.8s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 3.8s
- **Total Blocking Time (TBT)**: < 200ms

## 参考資料

- [Next.js - Lazy Loading](https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading)
- [Next.js - Bundle Analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)
- [Web.dev - Code Splitting](https://web.dev/reduce-javascript-payloads-with-code-splitting/)
