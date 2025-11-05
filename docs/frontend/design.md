# フロントエンド設計

## 技術構成
- **Framework**: Next.js (App Router)
- **UI**: TailwindCSS
- **State Management**: Zustand / React Context
- **Form**: React Hook Form
- **HTTP**: Axios

## 画面一覧

### パブリック画面
1. **トップページ** (`/`)
   - 商品一覧表示
   - カテゴリフィルタ
   - 検索機能

2. **商品詳細ページ** (`/products/[id]`)
   - 商品情報表示
   - カートに追加ボタン
   - 在庫表示

3. **ログインページ** (`/auth/login`)
   - メールアドレス・パスワード入力
   - 新規登録リンク

4. **ユーザー登録ページ** (`/auth/register`)
   - 基本情報入力フォーム

### 認証済みユーザー画面
5. **カートページ** (`/cart`)
   - カート内商品一覧
   - 数量変更・削除
   - 注文確認へ進むボタン

6. **注文確認ページ** (`/checkout`)
   - 注文内容確認
   - 配送先情報入力
   - 注文確定ボタン

7. **注文履歴ページ** (`/orders`)
   - 過去の注文一覧
   - 注文詳細表示

8. **マイページ** (`/profile`)
   - ユーザー情報表示・編集

### 管理者画面
9. **管理ダッシュボード** (`/admin`)
   - 売上統計
   - 注文管理

10. **商品管理ページ** (`/admin/products`)
    - 商品一覧・検索
    - 新規登録・編集・削除

## コンポーネント構成

```
components/
├── common/
│   ├── Header.tsx          ヘッダー
│   ├── Footer.tsx          フッター
│   ├── Layout.tsx          レイアウト
│   └── Button.tsx          共通ボタン
├── product/
│   ├── ProductCard.tsx     商品カード
│   ├── ProductList.tsx     商品一覧
│   └── ProductDetail.tsx   商品詳細
├── cart/
│   ├── CartItem.tsx        カートアイテム
│   └── CartSummary.tsx     カート合計
└── order/
    ├── OrderItem.tsx       注文アイテム
    └── OrderHistory.tsx    注文履歴
```

## 状態管理

### グローバルステート（Zustand）
- **authStore**: ユーザー認証情報
- **cartStore**: カート情報（数量、合計金額）

### ローカルステート（useState/useReducer）
- フォーム入力値
- モーダル表示状態
- ローディング状態

## ルーティング

```
/                           トップページ
/products/[id]              商品詳細
/auth/login                 ログイン
/auth/register              ユーザー登録
/cart                       カート
/checkout                   注文確認
/orders                     注文履歴
/profile                    マイページ
/admin                      管理ダッシュボード
/admin/products             商品管理
```
