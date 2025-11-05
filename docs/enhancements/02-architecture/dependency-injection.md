# Dependency Injection（依存性の注入）

## 概要

Dependency Injectionは、オブジェクトの依存関係を外部から注入することで、疎結合で柔軟なコードを実現するパターンです。

## 現状の課題

依存関係が直接インスタンス化されていると、テストや置き換えが困難です：

```typescript
// ❌ 依存関係がハードコーディング
export class OrderService {
  private productRepository = new ProductRepository(); // ←直接インスタンス化
  private orderRepository = new OrderRepository();

  async createOrder(data: OrderCreate) {
    // productRepositoryのモック化が困難
    const product = await this.productRepository.findById(data.product_id);
    // ...
  }
}
```

**問題点:**
- テスト時にモック化が困難
- 依存関係の変更が難しい
- シングルトンの管理が煩雑
- 循環依存のリスク

## 提案: DIコンテナの導入

TypeScriptでDIを実現する方法はいくつかあります：

### 方法1: 手動DI（Constructor Injection）

最もシンプルで、外部ライブラリ不要：

```typescript
// services/order.service.ts
import { ProductRepository } from '@/repositories/product.repository';
import { OrderRepository } from '@/repositories/order.repository';

export class OrderService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly orderRepository: OrderRepository
  ) {}

  async createOrder(data: OrderCreate) {
    const product = await this.productRepository.findById(data.product_id);
    // ...
  }
}

// di/container.ts - DIコンテナ
import { ProductRepository } from '@/repositories/product.repository';
import { OrderRepository } from '@/repositories/order.repository';
import { OrderService } from '@/services/order.service';

// シングルトンインスタンス
const productRepository = new ProductRepository();
const orderRepository = new OrderRepository();
const orderService = new OrderService(productRepository, orderRepository);

export { productRepository, orderRepository, orderService };
```

### 方法2: TypeScript Decoratorを使用（tsyringe）

より高度なDIコンテナライブラリを使用：

#### インストール

```bash
npm install tsyringe reflect-metadata
```

#### tsconfig.json設定

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

#### 実装例

```typescript
// main.tsx または _app.tsx
import 'reflect-metadata';
import { container } from 'tsyringe';

// repositories/product.repository.ts
import { injectable } from 'tsyringe';

@injectable()
export class ProductRepository extends BaseRepository<Product, ProductCreate, ProductUpdate> {
  constructor() {
    super('/products');
  }

  async findByCategory(categoryId: number): Promise<Result<Product[], RepositoryError>> {
    // ...
  }
}

// services/order.service.ts
import { injectable, inject } from 'tsyringe';
import { ProductRepository } from '@/repositories/product.repository';
import { OrderRepository } from '@/repositories/order.repository';

@injectable()
export class OrderService {
  constructor(
    @inject('ProductRepository') private productRepository: ProductRepository,
    @inject('OrderRepository') private orderRepository: OrderRepository
  ) {}

  async createOrder(data: OrderCreate): Promise<Result<Order, OrderError>> {
    const productResult = await this.productRepository.findById(data.product_id);
    // ...
  }
}

// di/container.ts
import { container } from 'tsyringe';
import { ProductRepository } from '@/repositories/product.repository';
import { OrderRepository } from '@/repositories/order.repository';
import { OrderService } from '@/services/order.service';

// 依存関係を登録
container.register('ProductRepository', { useClass: ProductRepository });
container.register('OrderRepository', { useClass: OrderRepository });
container.register('OrderService', { useClass: OrderService });

export { container };
```

### 方法3: React Context を使用

Reactアプリケーションに特化した方法：

```typescript
// contexts/ServiceContext.tsx
import { createContext, useContext, ReactNode } from 'react';
import { ProductRepository } from '@/repositories/product.repository';
import { OrderRepository } from '@/repositories/order.repository';
import { OrderService } from '@/services/order.service';
import { CartService } from '@/services/cart.service';

interface Services {
  productRepository: ProductRepository;
  orderRepository: OrderRepository;
  orderService: OrderService;
  cartService: CartService;
}

const ServiceContext = createContext<Services | null>(null);

export function ServiceProvider({ children }: { children: ReactNode }) {
  // シングルトンインスタンスを作成
  const productRepository = new ProductRepository();
  const orderRepository = new OrderRepository();
  const orderService = new OrderService(productRepository, orderRepository);
  const cartService = new CartService(productRepository);

  const services: Services = {
    productRepository,
    orderRepository,
    orderService,
    cartService,
  };

  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
}

// カスタムフック
export function useServices() {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useServices must be used within ServiceProvider');
  }
  return context;
}

export function useOrderService() {
  return useServices().orderService;
}

export function useCartService() {
  return useServices().cartService;
}

// _app.tsx
import { ServiceProvider } from '@/contexts/ServiceContext';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ServiceProvider>
      <Component {...pageProps} />
    </ServiceProvider>
  );
}
```

### 使用例

#### コンポーネントでの使用

```typescript
// components/CheckoutPage.tsx
import { useOrderService } from '@/contexts/ServiceContext';
import { isOk } from '@/types/result';

export function CheckoutPage() {
  const orderService = useOrderService();

  const handleCheckout = async () => {
    const result = await orderService.createOrderFromCart(cart, address);

    if (isOk(result)) {
      alert('注文が完了しました');
    } else {
      alert('注文に失敗しました');
    }
  };

  return (
    <button onClick={handleCheckout}>注文する</button>
  );
}
```

#### テストでの使用

```typescript
// services/__tests__/order.service.test.ts
import { OrderService } from '../order.service';
import { ProductRepository } from '@/repositories/product.repository';
import { OrderRepository } from '@/repositories/order.repository';

// モックリポジトリを作成
const mockProductRepository = {
  findById: jest.fn(),
} as unknown as ProductRepository;

const mockOrderRepository = {
  create: jest.fn(),
} as unknown as OrderRepository;

describe('OrderService', () => {
  let orderService: OrderService;

  beforeEach(() => {
    // DIでモックを注入
    orderService = new OrderService(
      mockProductRepository,
      mockOrderRepository
    );
  });

  it('should create order successfully', async () => {
    mockProductRepository.findById.mockResolvedValue({
      success: true,
      value: { id: 1, name: 'Product 1', price: 1000 }
    });

    mockOrderRepository.create.mockResolvedValue({
      success: true,
      value: { id: 1, total_amount: 1000 }
    });

    const result = await orderService.createOrder({
      items: [{ product_id: 1, quantity: 1 }],
      shipping_address: 'Test Address'
    });

    expect(result.success).toBe(true);
  });
});
```

## 比較表

| 方法 | メリット | デメリット | 推奨度 |
|------|----------|------------|--------|
| **手動DI** | シンプル、外部依存なし | 大規模になると管理が煩雑 | ⭐⭐⭐⭐ |
| **tsyringe** | 自動解決、デコレータで簡潔 | 学習コスト、デコレータ必須 | ⭐⭐⭐ |
| **React Context** | Reactに最適、フックで使いやすい | React専用 | ⭐⭐⭐⭐⭐ |

## メリット

1. **テスタビリティ**: モックの注入が容易
2. **疎結合**: 依存関係を簡単に置き換え可能
3. **再利用性**: 異なる実装を注入できる
4. **シングルトン管理**: 一箇所で管理できる
5. **変更への対応**: 依存関係の変更が容易

## デメリット

1. **学習コスト**: DIパターンの理解が必要
2. **初期設定**: DIコンテナのセットアップが必要
3. **複雑性**: 小規模プロジェクトには過剰

## 導入の推奨度

**⭐⭐⭐⭐☆ (高)**

テストを重視するプロジェクトでは特に有効です。Reactアプリケーションの場合、**React Context方式**が最もバランスが良いです。

## 実装の推奨順序

1. **まずは手動DIから**: Constructor Injectionで始める
2. **Contextを導入**: アプリケーションが大きくなったらReact Contextを検討
3. **必要に応じてtsyringe**: より高度な機能が必要な場合のみ

## 参考資料

- [tsyringe - GitHub](https://github.com/microsoft/tsyringe)
- [Martin Fowler - Inversion of Control](https://martinfowler.com/bliki/InversionOfControl.html)
- [Dependency Injection in TypeScript](https://www.typescriptlang.org/docs/handbook/decorators.html)
