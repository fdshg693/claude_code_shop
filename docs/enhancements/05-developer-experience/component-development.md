# Component Development with Storybook

## 概要

Storybookを導入し、コンポーネントを独立した環境で開発・テスト・文書化します。

## 現状の課題

- コンポーネントの動作確認に実際のページが必要
- さまざまな状態のテストが困難
- コンポーネントのドキュメントがない
- デザイナーとの連携が難しい

## 提案: Storybookの導入

### インストール

```bash
npx storybook@latest init
```

### 設定

#### .storybook/main.ts

```typescript
import type { StorybookConfig } from '@storybook/nextjs';
import path from 'path';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  webpackFinal: async (config) => {
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': path.resolve(__dirname, '../src'),
      };
    }
    return config;
  },
};

export default config;
```

### ストーリーの作成

#### 基本的なストーリー

```typescript
// components/Button/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger'],
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// デフォルト
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Button',
  },
};

// バリエーション
export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Button',
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'Delete',
  },
};

// サイズ
export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small Button',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large Button',
  },
};

// 状態
export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled Button',
  },
};

// インタラクション
export const WithIcon: Story = {
  args: {
    children: (
      <>
        <IconCart /> Add to Cart
      </>
    ),
  },
};
```

#### 複雑なコンポーネント

```typescript
// components/ProductCard/ProductCard.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { ProductCard } from './ProductCard';
import { fn } from '@storybook/test';

const meta: Meta<typeof ProductCard> = {
  title: 'Components/ProductCard',
  component: ProductCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ProductCard>;

const mockProduct = {
  id: 1,
  name: 'Wireless Headphones',
  description: 'High-quality wireless headphones with noise cancellation',
  price: 15000,
  stock_quantity: 10,
  category_id: 1,
  image_url: 'https://via.placeholder.com/300',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
};

export const Default: Story = {
  args: {
    product: mockProduct,
    onAddToCart: fn(),
  },
};

export const OutOfStock: Story = {
  args: {
    product: {
      ...mockProduct,
      stock_quantity: 0,
    },
    onAddToCart: fn(),
  },
};

export const NoImage: Story = {
  args: {
    product: {
      ...mockProduct,
      image_url: undefined,
    },
    onAddToCart: fn(),
  },
};

export const LongDescription: Story = {
  args: {
    product: {
      ...mockProduct,
      description:
        'This is a very long description that might wrap to multiple lines and we need to test how it looks in the card component when the text is quite lengthy.',
    },
    onAddToCart: fn(),
  },
};
```

#### インタラクションテスト

```typescript
// components/ProductCard/ProductCard.stories.tsx
import { expect, userEvent, within } from '@storybook/test';

export const WithInteraction: Story = {
  args: {
    product: mockProduct,
    onAddToCart: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    // カートに追加ボタンをクリック
    const button = canvas.getByRole('button', { name: /カートに追加/i });
    await userEvent.click(button);

    // コールバックが呼ばれたことを確認
    await expect(args.onAddToCart).toHaveBeenCalledWith(mockProduct.id);
  },
};
```

### Mock Service Worker (MSW) との統合

```bash
npm install -D msw msw-storybook-addon
```

#### .storybook/preview.ts

```typescript
import { initialize, mswLoader } from 'msw-storybook-addon';

// MSWを初期化
initialize();

export default {
  loaders: [mswLoader],
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};
```

#### APIをモックしたストーリー

```typescript
// components/ProductList/ProductList.stories.tsx
import { http, HttpResponse } from 'msw';
import type { Meta, StoryObj } from '@storybook/react';
import { ProductList } from './ProductList';

const meta: Meta<typeof ProductList> = {
  title: 'Features/ProductList',
  component: ProductList,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ProductList>;

const mockProducts = [
  { id: 1, name: 'Product 1', price: 1000 },
  { id: 2, name: 'Product 2', price: 2000 },
  { id: 3, name: 'Product 3', price: 3000 },
];

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/products', () => {
          return HttpResponse.json(mockProducts);
        }),
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/products', async () => {
          await delay(3000);
          return HttpResponse.json(mockProducts);
        }),
      ],
    },
  },
};

export const Error: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/products', () => {
          return HttpResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
          );
        }),
      ],
    },
  },
};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/products', () => {
          return HttpResponse.json([]);
        }),
      ],
    },
  },
};
```

### ドキュメント生成

#### MDXでのドキュメント

```mdx
<!-- components/Button/Button.mdx -->
import { Canvas, Meta, Story } from '@storybook/blocks';
import * as ButtonStories from './Button.stories';

<Meta of={ButtonStories} />

# Button

汎用的なボタンコンポーネントです。

## 使い方

```tsx
import { Button } from '@/components/Button';

<Button variant="primary" onClick={handleClick}>
  Click me
</Button>
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| variant | 'primary' \| 'secondary' \| 'danger' | 'primary' | ボタンのスタイル |
| size | 'sm' \| 'md' \| 'lg' | 'md' | ボタンのサイズ |
| disabled | boolean | false | 無効化 |
| onClick | () => void | - | クリックハンドラ |

## Examples

### Primary Button
<Canvas of={ButtonStories.Primary} />

### Danger Button
<Canvas of={ButtonStories.Danger} />

### Disabled Button
<Canvas of={ButtonStories.Disabled} />
```

### アクセシビリティテスト

```typescript
// .storybook/main.ts
export default {
  addons: [
    '@storybook/addon-a11y', // ← アクセシビリティアドオン
  ],
};

// ストーリーで自動的にa11yチェックが実行される
```

### package.jsonスクリプト

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "test-storybook": "test-storybook"
  }
}
```

## CI/CDでの活用

### ビジュアルリグレッションテスト

```bash
npm install -D @storybook/test-runner playwright
```

```typescript
// .storybook/test-runner.ts
import { getStoryContext } from '@storybook/test-runner';
import { injectAxe, checkA11y } from 'axe-playwright';

export async function preRender(page) {
  await injectAxe(page);
}

export async function postRender(page, context) {
  const storyContext = await getStoryContext(page, context);

  // a11yチェックをスキップするストーリー以外をテスト
  if (!storyContext.parameters?.a11y?.disable) {
    await checkA11y(page, '#storybook-root');
  }
}
```

### Chromatic との統合

```bash
npm install -D chromatic
```

```json
{
  "scripts": {
    "chromatic": "chromatic --project-token=YOUR_TOKEN"
  }
}
```

## メリット

1. **独立した開発**: アプリ全体を起動せずにコンポーネント開発
2. **ドキュメント**: 自動生成されるコンポーネントカタログ
3. **テスト**: さまざまな状態を簡単にテスト
4. **デザイナー連携**: 実装状態を共有しやすい
5. **アクセシビリティ**: 自動でa11yチェック

## デメリット

1. **初期設定**: セットアップに時間がかかる
2. **メンテナンス**: ストーリーの保守が必要
3. **学習コスト**: Storybookの使い方を学ぶ必要がある

## 導入の推奨度

**⭐⭐⭐⭐☆ (高)**

特にコンポーネントライブラリやデザインシステムを構築する場合は必須です。

## 参考資料

- [Storybook](https://storybook.js.org/)
- [Storybook for Next.js](https://storybook.js.org/docs/get-started/nextjs)
- [MSW Storybook Addon](https://storybook.js.org/addons/msw-storybook-addon)
- [Chromatic](https://www.chromatic.com/)
