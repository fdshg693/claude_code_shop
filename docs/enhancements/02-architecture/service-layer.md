# Service Layer（サービス層）

## 概要

Service Layerは、ビジネスロジックを一箇所に集約し、コンポーネントやコントローラーから分離するパターンです。

## 現状の課題

ビジネスロジックがコンポーネント内に散在すると、以下の問題が発生します：

```typescript
// ❌ コンポーネント内にビジネスロジック
export function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);

  const checkout = async () => {
    // ビジネスロジックがコンポーネント内に
    const total = cart.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);

    if (total < 1000) {
      alert('1000円以上からご注文いただけます');
      return;
    }

    const orderItems = cart.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
    }));

    // API呼び出しもコンポーネント内
    try {
      const response = await axios.post('/api/orders', {
        items: orderItems,
        shipping_address: address,
      });
      // ...
    } catch (error) {
      // ...
    }
  };

  // ...
}
```

**問題点:**
- ビジネスロジックが再利用できない
- テストが困難
- コンポーネントが肥大化
- ロジックの変更時に複数箇所を修正

## 提案: Service Layerの導入

### ディレクトリ構造

```
src/
├── services/
│   ├── product.service.ts
│   ├── cart.service.ts
│   ├── order.service.ts
│   └── auth.service.ts
├── repositories/
│   └── ...
└── types/
    └── ...
```

### 実装例

#### Cart Service

```typescript
// services/cart.service.ts
import { Result, Ok, Err } from '@/types/result';
import { Cart, CartItem } from '@/types/cart';
import { Product } from '@/types/product';
import { productRepository } from '@/repositories/product.repository';
import { isOk } from '@/types/result';

export type CartError =
  | { type: 'ProductNotFound'; productId: number }
  | { type: 'OutOfStock'; productId: number; available: number }
  | { type: 'InvalidQuantity'; quantity: number }
  | { type: 'MinimumOrderNotMet'; minimum: number; current: number };

export class CartService {
  private readonly MINIMUM_ORDER_AMOUNT = 1000;

  /**
   * カートに商品を追加
   */
  async addToCart(
    cart: Cart,
    productId: number,
    quantity: number
  ): Promise<Result<Cart, CartError>> {
    // 数量チェック
    if (quantity <= 0) {
      return Err({ type: 'InvalidQuantity', quantity });
    }

    // 商品情報を取得
    const productResult = await productRepository.findById(productId);
    if (!isOk(productResult)) {
      return Err({ type: 'ProductNotFound', productId });
    }

    const product = productResult.value;

    // 在庫チェック
    const existingItem = cart.items.find(item => item.product_id === productId);
    const totalQuantity = (existingItem?.quantity || 0) + quantity;

    if (totalQuantity > product.stock_quantity) {
      return Err({
        type: 'OutOfStock',
        productId,
        available: product.stock_quantity,
      });
    }

    // カートアイテムを追加/更新
    const newItems = existingItem
      ? cart.items.map(item =>
          item.product_id === productId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      : [
          ...cart.items,
          {
            product_id: productId,
            product_name: product.name,
            price: product.price,
            quantity,
            image_url: product.image_url,
          },
        ];

    return Ok({
      ...cart,
      items: newItems,
    });
  }

  /**
   * カートから商品を削除
   */
  removeFromCart(cart: Cart, productId: number): Cart {
    return {
      ...cart,
      items: cart.items.filter(item => item.product_id !== productId),
    };
  }

  /**
   * カートアイテムの数量を更新
   */
  async updateQuantity(
    cart: Cart,
    productId: number,
    quantity: number
  ): Promise<Result<Cart, CartError>> {
    if (quantity <= 0) {
      return Err({ type: 'InvalidQuantity', quantity });
    }

    // 商品情報を取得して在庫チェック
    const productResult = await productRepository.findById(productId);
    if (!isOk(productResult)) {
      return Err({ type: 'ProductNotFound', productId });
    }

    const product = productResult.value;
    if (quantity > product.stock_quantity) {
      return Err({
        type: 'OutOfStock',
        productId,
        available: product.stock_quantity,
      });
    }

    const newItems = cart.items.map(item =>
      item.product_id === productId ? { ...item, quantity } : item
    );

    return Ok({
      ...cart,
      items: newItems,
    });
  }

  /**
   * カートの合計金額を計算
   */
  calculateTotal(cart: Cart): number {
    return cart.items.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);
  }

  /**
   * カートが注文可能かチェック
   */
  canCheckout(cart: Cart): Result<true, CartError> {
    if (cart.items.length === 0) {
      return Err({ type: 'InvalidQuantity', quantity: 0 });
    }

    const total = this.calculateTotal(cart);
    if (total < this.MINIMUM_ORDER_AMOUNT) {
      return Err({
        type: 'MinimumOrderNotMet',
        minimum: this.MINIMUM_ORDER_AMOUNT,
        current: total,
      });
    }

    return Ok(true);
  }

  /**
   * カートをクリア
   */
  clearCart(): Cart {
    return {
      items: [],
    };
  }
}

// シングルトンインスタンス
export const cartService = new CartService();
```

#### Order Service

```typescript
// services/order.service.ts
import { Result, Ok, Err, isOk } from '@/types/result';
import { Order, OrderCreate, OrderStatus } from '@/types/order';
import { Cart } from '@/types/cart';
import { orderRepository } from '@/repositories/order.repository';
import { cartService } from './cart.service';

export type OrderError =
  | { type: 'InvalidCart'; reason: string }
  | { type: 'CreateFailed'; reason: string }
  | { type: 'NotFound'; orderId: number }
  | { type: 'CannotCancel'; status: OrderStatus };

export class OrderService {
  /**
   * カートから注文を作成
   */
  async createOrderFromCart(
    cart: Cart,
    shippingAddress: string
  ): Promise<Result<Order, OrderError>> {
    // カートの検証
    const canCheckout = cartService.canCheckout(cart);
    if (!isOk(canCheckout)) {
      return Err({ type: 'InvalidCart', reason: 'Cart validation failed' });
    }

    // 注文データを作成
    const orderData: OrderCreate = {
      shipping_address: shippingAddress,
      items: cart.items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
      })),
    };

    // 注文を作成
    const result = await orderRepository.create(orderData);
    if (!isOk(result)) {
      return Err({ type: 'CreateFailed', reason: 'Failed to create order' });
    }

    return Ok(result.value);
  }

  /**
   * 注文をキャンセル
   */
  async cancelOrder(orderId: number): Promise<Result<Order, OrderError>> {
    // 注文を取得
    const orderResult = await orderRepository.findById(orderId);
    if (!isOk(orderResult)) {
      return Err({ type: 'NotFound', orderId });
    }

    const order = orderResult.value;

    // キャンセル可能かチェック
    if (!this.canCancel(order)) {
      return Err({ type: 'CannotCancel', status: order.status });
    }

    // ステータスを更新
    const updateResult = await orderRepository.update(orderId, {
      status: OrderStatus.CANCELLED,
    });

    if (!isOk(updateResult)) {
      return Err({ type: 'CreateFailed', reason: 'Failed to cancel order' });
    }

    return Ok(updateResult.value);
  }

  /**
   * 注文がキャンセル可能かチェック
   */
  private canCancel(order: Order): boolean {
    return (
      order.status === OrderStatus.PENDING ||
      order.status === OrderStatus.CONFIRMED
    );
  }

  /**
   * ユーザーの注文履歴を取得
   */
  async getUserOrders(userId: number): Promise<Result<Order[], OrderError>> {
    const result = await orderRepository.findByUser(userId);
    if (!isOk(result)) {
      return Err({ type: 'CreateFailed', reason: 'Failed to fetch orders' });
    }

    return Ok(result.value);
  }

  /**
   * 注文のステータス進行
   */
  async progressOrderStatus(orderId: number): Promise<Result<Order, OrderError>> {
    const orderResult = await orderRepository.findById(orderId);
    if (!isOk(orderResult)) {
      return Err({ type: 'NotFound', orderId });
    }

    const order = orderResult.value;
    const nextStatus = this.getNextStatus(order.status);

    if (!nextStatus) {
      return Err({ type: 'CannotCancel', status: order.status });
    }

    const updateResult = await orderRepository.update(orderId, {
      status: nextStatus,
    });

    if (!isOk(updateResult)) {
      return Err({ type: 'CreateFailed', reason: 'Failed to update status' });
    }

    return Ok(updateResult.value);
  }

  private getNextStatus(current: OrderStatus): OrderStatus | null {
    const progression: Record<OrderStatus, OrderStatus | null> = {
      [OrderStatus.PENDING]: OrderStatus.CONFIRMED,
      [OrderStatus.CONFIRMED]: OrderStatus.SHIPPED,
      [OrderStatus.SHIPPED]: OrderStatus.DELIVERED,
      [OrderStatus.DELIVERED]: null,
      [OrderStatus.CANCELLED]: null,
    };

    return progression[current];
  }
}

export const orderService = new OrderService();
```

### 使用例

#### コンポーネントでの使用

```typescript
// components/CheckoutPage.tsx
import { useState } from 'react';
import { useCart } from '@/hooks/useCart';
import { orderService } from '@/services/order.service';
import { isOk } from '@/types/result';

export function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);

    const result = await orderService.createOrderFromCart(cart, address);

    if (isOk(result)) {
      clearCart();
      alert('注文が完了しました');
      // 注文完了ページへ遷移
    } else {
      // エラー処理
      switch (result.error.type) {
        case 'InvalidCart':
          alert('カートが無効です');
          break;
        case 'CreateFailed':
          alert('注文の作成に失敗しました');
          break;
      }
    }

    setLoading(false);
  };

  return (
    <div>
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="配送先住所"
      />
      <button onClick={handleCheckout} disabled={loading}>
        注文する
      </button>
    </div>
  );
}
```

## メリット

1. **ビジネスロジックの集約**: 一箇所で管理
2. **再利用性**: 複数のコンポーネントから使える
3. **テストの容易性**: Service単体でテストできる
4. **関心の分離**: UIとビジネスロジックが分離
5. **保守性**: 変更時の影響範囲が明確

## デメリット

1. **ファイル数の増加**: 各ドメインごとにファイルが必要
2. **学習コスト**: レイヤー構造の理解が必要
3. **オーバーエンジニアリング**: 小規模アプリには過剰

## 導入の推奨度

**⭐⭐⭐⭐☆ (高)**

ビジネスロジックが複雑なアプリケーションでは必須です。

## 参考資料

- [Martin Fowler - Service Layer](https://martinfowler.com/eaaCatalog/serviceLayer.html)
- [Domain-Driven Design](https://www.domainlanguage.com/ddd/)
