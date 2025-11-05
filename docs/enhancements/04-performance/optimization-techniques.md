# React Optimization Techniques（React最適化手法）

## 概要

Reactアプリケーションのパフォーマンスを向上させる各種テクニックを紹介します。

## 1. Memoization（メモ化）

### React.memo

コンポーネントの不必要な再レンダリングを防ぐ：

```typescript
// ❌ Before: 親が再レンダリングされると毎回再レンダリング
export function ProductCard({ product }: { product: Product }) {
  return (
    <div>
      <h3>{product.name}</h3>
      <p>¥{product.price}</p>
    </div>
  );
}

// ✅ After: propsが変わった時のみ再レンダリング
export const ProductCard = React.memo(({ product }: { product: Product }) => {
  return (
    <div>
      <h3>{product.name}</h3>
      <p>¥{product.price}</p>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';
```

### useMemo

計算コストの高い処理をメモ化：

```typescript
function ProductList({ products }: { products: Product[] }) {
  // ❌ Bad: 毎回計算される
  const total = products.reduce((sum, p) => sum + p.price, 0);

  // ✅ Good: productsが変わった時のみ計算
  const total = useMemo(
    () => products.reduce((sum, p) => sum + p.price, 0),
    [products]
  );

  return <div>合計: ¥{total}</div>;
}
```

### useCallback

関数をメモ化し、子コンポーネントへの不要な再レンダリングを防ぐ：

```typescript
function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);

  // ❌ Bad: 毎回新しい関数が作られる
  const handleDelete = (id: number) => {
    setProducts(products.filter(p => p.id !== id));
  };

  // ✅ Good: productsが変わった時のみ新しい関数を作る
  const handleDelete = useCallback(
    (id: number) => {
      setProducts(products.filter(p => p.id !== id));
    },
    [products]
  );

  return (
    <div>
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
```

## 2. Virtual Scrolling（仮想スクロール）

長いリストのパフォーマンスを改善：

### react-window を使用

```bash
npm install react-window
```

```typescript
// components/VirtualProductList.tsx
import { FixedSizeList } from 'react-window';

const Row = ({ index, style, data }: any) => {
  const product = data[index];
  return (
    <div style={style}>
      <ProductCard product={product} />
    </div>
  );
};

export function VirtualProductList({ products }: { products: Product[] }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={products.length}
      itemSize={120}
      width="100%"
      itemData={products}
    >
      {Row}
    </FixedSizeList>
  );
}
```

## 3. Image Optimization（画像最適化）

### Next.js Image コンポーネント

```typescript
// ❌ Bad: 通常のimgタグ
<img src={product.image_url} alt={product.name} />

// ✅ Good: Next.js Image
import Image from 'next/image';

<Image
  src={product.image_url}
  alt={product.name}
  width={300}
  height={300}
  placeholder="blur"
  blurDataURL="/placeholder.png"
  loading="lazy"
/>
```

### 画像フォーマット最適化

```javascript
// next.config.js
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};
```

## 4. State Management（状態管理の最適化）

### Context の最適化

```typescript
// ❌ Bad: 1つの大きなContext
const AppContext = createContext({
  user: null,
  products: [],
  cart: [],
  orders: [],
});

// ✅ Good: 複数の小さなContext
const UserContext = createContext(null);
const ProductsContext = createContext([]);
const CartContext = createContext([]);
const OrdersContext = createContext([]);
```

### Zustand でのSelector最適化

```typescript
// stores/productStore.ts
import { create } from 'zustand';

interface ProductStore {
  products: Product[];
  selectedProduct: Product | null;
  setProducts: (products: Product[]) => void;
  selectProduct: (id: number) => void;
}

export const useProductStore = create<ProductStore>((set) => ({
  products: [],
  selectedProduct: null,
  setProducts: (products) => set({ products }),
  selectProduct: (id) =>
    set((state) => ({
      selectedProduct: state.products.find((p) => p.id === id) || null,
    })),
}));

// ❌ Bad: 常に全状態を取得
const { products, selectedProduct } = useProductStore();

// ✅ Good: 必要な部分のみ取得
const products = useProductStore((state) => state.products);
const selectProduct = useProductStore((state) => state.selectProduct);
```

## 5. Debounce & Throttle

### Debounce（検索入力）

```typescript
import { useMemo } from 'react';
import { debounce } from 'lodash';

function ProductSearch() {
  const [query, setQuery] = useState('');

  // ❌ Bad: 毎回API呼び出し
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    searchProducts(e.target.value);
  };

  // ✅ Good: 300ms後に実行
  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        searchProducts(query);
      }, 300),
    []
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  return <input value={query} onChange={handleChange} />;
}
```

### Throttle（スクロールイベント）

```typescript
import { throttle } from 'lodash';

function InfiniteScroll() {
  const handleScroll = useMemo(
    () =>
      throttle(() => {
        if (isNearBottom()) {
          loadMore();
        }
      }, 200),
    []
  );

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return <div>...</div>;
}
```

## 6. Lazy Loading（遅延ロード）

### Intersection Observer API

```typescript
// hooks/useInView.ts
import { useEffect, useRef, useState } from 'react';

export function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [options]);

  return { ref, inView };
}

// 使用例
function LazyProductImage({ src, alt }: { src: string; alt: string }) {
  const { ref, inView } = useInView({ threshold: 0.1 });

  return (
    <div ref={ref}>
      {inView ? (
        <img src={src} alt={alt} />
      ) : (
        <div className="placeholder">Loading...</div>
      )}
    </div>
  );
}
```

## 7. Web Workers

重い処理をメインスレッドから分離：

```typescript
// workers/dataProcessor.worker.ts
self.addEventListener('message', (e) => {
  const { data } = e;

  // 重い計算処理
  const result = processLargeDataset(data);

  self.postMessage(result);
});

// hooks/useDataProcessor.ts
import { useEffect, useState } from 'react';

export function useDataProcessor() {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const w = new Worker(new URL('../workers/dataProcessor.worker.ts', import.meta.url));

    w.addEventListener('message', (e) => {
      setResult(e.data);
    });

    setWorker(w);

    return () => w.terminate();
  }, []);

  const process = (data: any) => {
    worker?.postMessage(data);
  };

  return { process, result };
}
```

## 8. Concurrent Features（React 18+）

### useTransition

```typescript
function ProductSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value); // 即座に更新

    // 優先度の低い更新
    startTransition(() => {
      const filtered = products.filter((p) =>
        p.name.toLowerCase().includes(value.toLowerCase())
      );
      setResults(filtered);
    });
  };

  return (
    <div>
      <input value={query} onChange={handleChange} />
      {isPending && <div>Searching...</div>}
      <ProductList products={results} />
    </div>
  );
}
```

## パフォーマンス測定

### React DevTools Profiler

```typescript
import { Profiler } from 'react';

function onRenderCallback(
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number
) {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
}

<Profiler id="ProductList" onRender={onRenderCallback}>
  <ProductList />
</Profiler>;
```

### Performance API

```typescript
// 測定開始
performance.mark('product-list-start');

// 処理

// 測定終了
performance.mark('product-list-end');
performance.measure('product-list', 'product-list-start', 'product-list-end');

const measure = performance.getEntriesByName('product-list')[0];
console.log(`Duration: ${measure.duration}ms`);
```

## チェックリスト

- [ ] React.memoで不要な再レンダリングを防ぐ
- [ ] useMemoで重い計算をメモ化
- [ ] useCallbackで関数をメモ化
- [ ] 長いリストには仮想スクロール
- [ ] Next.js Imageで画像最適化
- [ ] Context を適切に分割
- [ ] 検索入力にdebounce
- [ ] スクロールイベントにthrottle
- [ ] Intersection Observerで遅延ロード
- [ ] 重い処理はWeb Workerへ

## メリット

1. **高速なUI**: ユーザー体験の向上
2. **スムーズな操作**: フレームレート維持
3. **省メモリ**: 効率的なリソース利用
4. **バッテリー節約**: モバイルで重要

## デメリット

1. **複雑性**: コードが複雑になる
2. **過度な最適化**: 必要のない場合も
3. **デバッグ困難**: メモ化により追跡が難しい

## 導入の推奨度

**⭐⭐⭐⭐☆ (高)**

パフォーマンス問題が顕在化してから導入するのが良いです。

## 参考資料

- [React - Optimizing Performance](https://react.dev/learn/render-and-commit)
- [React Window](https://react-window.vercel.app/)
- [Web.dev - Performance](https://web.dev/performance/)
