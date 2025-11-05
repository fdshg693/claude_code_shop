# Testing Strategy（テスト戦略）

## 概要

包括的なテスト戦略を導入し、コードの品質と信頼性を向上させます。

## テストピラミッド

```
        /\
       /  \     E2E Tests (少数・遅い)
      /────\
     /      \   Integration Tests (中程度)
    /────────\
   /          \ Unit Tests (多数・速い)
  /────────────\
```

## 提案するテスト構成

### 1. Unit Testing (単体テスト)

#### 推奨ツール: Vitest

```bash
npm install -D vitest @vitest/ui
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D happy-dom # または jsdom
```

#### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

#### test/setup.ts

```typescript
import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});
```

#### テスト例: Utility関数

```typescript
// utils/__tests__/price.test.ts
import { describe, it, expect } from 'vitest';
import { formatPrice, calculateDiscount } from '../price';

describe('formatPrice', () => {
  it('should format price with yen symbol', () => {
    expect(formatPrice(1000)).toBe('¥1,000');
  });

  it('should handle zero', () => {
    expect(formatPrice(0)).toBe('¥0');
  });

  it('should handle large numbers', () => {
    expect(formatPrice(1234567)).toBe('¥1,234,567');
  });
});

describe('calculateDiscount', () => {
  it('should calculate discount correctly', () => {
    expect(calculateDiscount(1000, 10)).toBe(900);
  });

  it('should not allow negative prices', () => {
    expect(() => calculateDiscount(-100, 10)).toThrow();
  });
});
```

#### テスト例: Service層

```typescript
// services/__tests__/cart.service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CartService } from '../cart.service';
import { productRepository } from '@/repositories/product.repository';
import { Ok } from '@/types/result';

// リポジトリをモック化
vi.mock('@/repositories/product.repository');

describe('CartService', () => {
  let cartService: CartService;

  beforeEach(() => {
    cartService = new CartService();
    vi.clearAllMocks();
  });

  describe('addToCart', () => {
    it('should add product to empty cart', async () => {
      const mockProduct = {
        id: 1,
        name: 'Test Product',
        price: 1000,
        stock_quantity: 10,
      };

      vi.mocked(productRepository.findById).mockResolvedValue(
        Ok(mockProduct)
      );

      const cart = { items: [] };
      const result = await cartService.addToCart(cart, 1, 2);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.items[0].quantity).toBe(2);
      }
    });

    it('should return error when product is out of stock', async () => {
      const mockProduct = {
        id: 1,
        name: 'Test Product',
        price: 1000,
        stock_quantity: 1,
      };

      vi.mocked(productRepository.findById).mockResolvedValue(
        Ok(mockProduct)
      );

      const cart = { items: [] };
      const result = await cartService.addToCart(cart, 1, 10);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('OutOfStock');
      }
    });
  });
});
```

### 2. Component Testing (コンポーネントテスト)

```typescript
// components/__tests__/ProductCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from '../ProductCard';
import type { Product } from '@/types/product';

const mockProduct: Product = {
  id: 1,
  name: 'Test Product',
  description: 'Test Description',
  price: 1000,
  stock_quantity: 10,
  category_id: 1,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
};

describe('ProductCard', () => {
  it('should render product information', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('¥1,000')).toBeInTheDocument();
  });

  it('should call onAddToCart when button is clicked', () => {
    const onAddToCart = vi.fn();
    render(<ProductCard product={mockProduct} onAddToCart={onAddToCart} />);

    const button = screen.getByRole('button', { name: /カートに追加/i });
    fireEvent.click(button);

    expect(onAddToCart).toHaveBeenCalledWith(mockProduct.id);
  });

  it('should disable button when out of stock', () => {
    const outOfStockProduct = { ...mockProduct, stock_quantity: 0 };
    render(<ProductCard product={outOfStockProduct} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});
```

### 3. Integration Testing (統合テスト)

```typescript
// features/__tests__/checkout.integration.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CheckoutPage } from '@/pages/checkout';
import { ServiceProvider } from '@/contexts/ServiceContext';

describe('Checkout Integration', () => {
  beforeEach(() => {
    // APIモックのセットアップ
    setupMockAPI();
  });

  it('should complete checkout flow', async () => {
    render(
      <ServiceProvider>
        <CheckoutPage />
      </ServiceProvider>
    );

    // 配送先住所を入力
    const addressInput = screen.getByLabelText('配送先住所');
    fireEvent.change(addressInput, {
      target: { value: '東京都渋谷区...' },
    });

    // 注文ボタンをクリック
    const checkoutButton = screen.getByRole('button', { name: /注文する/i });
    fireEvent.click(checkoutButton);

    // 成功メッセージを待機
    await waitFor(() => {
      expect(screen.getByText(/注文が完了しました/i)).toBeInTheDocument();
    });
  });
});
```

### 4. E2E Testing (End-to-End テスト)

#### 推奨ツール: Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

#### playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### E2Eテスト例

```typescript
// e2e/checkout.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test('should complete full checkout process', async ({ page }) => {
    // 商品ページに移動
    await page.goto('/products/1');

    // カートに追加
    await page.click('button:has-text("カートに追加")');
    await expect(page.locator('.cart-count')).toHaveText('1');

    // カートページに移動
    await page.click('a:has-text("カート")');
    await expect(page).toHaveURL('/cart');

    // チェックアウトページに移動
    await page.click('button:has-text("購入手続き")');
    await expect(page).toHaveURL('/checkout');

    // 配送先情報を入力
    await page.fill('input[name="address"]', '東京都渋谷区...');

    // 注文を確定
    await page.click('button:has-text("注文する")');

    // 注文完了ページを確認
    await expect(page).toHaveURL(/\/orders\/\d+/);
    await expect(page.locator('h1')).toHaveText('注文が完了しました');
  });
});
```

### package.jsonスクリプト

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

## テストのベストプラクティス

1. **AAA パターン**: Arrange（準備）、Act（実行）、Assert（検証）
2. **1テスト1検証**: 各テストは1つのことだけをテスト
3. **テストの独立性**: テスト間で状態を共有しない
4. **意味のある名前**: テストケース名から内容が分かるように
5. **エッジケースのテスト**: 境界値、null、undefinedなど

## メリット

1. **品質向上**: バグの早期発見
2. **リファクタリングの安全性**: 変更時の影響を検出
3. **ドキュメント**: テストが仕様書の役割を果たす
4. **デバッグの効率化**: 問題箇所を素早く特定

## デメリット

1. **時間コスト**: テスト作成に時間がかかる
2. **メンテナンスコスト**: コード変更時にテストも修正が必要
3. **学習コスト**: テスト技法の習得が必要

## 導入の推奨度

**⭐⭐⭐⭐⭐ (非常に高い)**

特にビジネスロジックが複雑なアプリケーションでは必須です。

## 参考資料

- [Vitest](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright](https://playwright.dev/)
