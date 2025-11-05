# Frontend Security（フロントエンドセキュリティ）

## 概要

フロントエンドアプリケーションのセキュリティを強化し、一般的な脆弱性から保護します。

## 1. XSS（Cross-Site Scripting）対策

### Reactの自動エスケープ

Reactはデフォルトでエスケープしますが、注意が必要な箇所：

```typescript
// ✅ Safe: 自動的にエスケープされる
<div>{userInput}</div>

// ❌ Danger: dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ Better: サニタイズライブラリを使用
import DOMPurify from 'dompurify';

<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

### DOMPurifyの導入

```bash
npm install dompurify
npm install -D @types/dompurify
```

```typescript
// utils/sanitize.ts
import DOMPurify from 'dompurify';

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target'],
  });
}

// 使用例
function UserComment({ comment }: { comment: string }) {
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: sanitizeHtml(comment),
      }}
    />
  );
}
```

## 2. CSRF（Cross-Site Request Forgery）対策

### CSRFトークンの実装

```typescript
// utils/csrf.ts
export function getCsrfToken(): string | null {
  const token = document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrf_token='))
    ?.split('=')[1];
  return token || null;
}

// services/api.service.ts
import axios from 'axios';
import { getCsrfToken } from '@/utils/csrf';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // Cookieを送信
});

// リクエストインターセプター
apiClient.interceptors.request.use((config) => {
  const token = getCsrfToken();
  if (token) {
    config.headers['X-CSRF-Token'] = token;
  }
  return config;
});

export { apiClient };
```

### SameSite Cookie

バックエンド側で設定（参考）：

```python
# FastAPI example
from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware

app = FastAPI()

app.add_middleware(
    SessionMiddleware,
    secret_key="your-secret-key",
    session_cookie="session",
    same_site="strict",  # or "lax"
    https_only=True,     # 本番環境
)
```

## 3. Content Security Policy (CSP)

### Next.js での設定

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline';
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self' data:;
      connect-src 'self' https://api.example.com;
      frame-ancestors 'none';
    `
      .replace(/\s{2,}/g, ' ')
      .trim(),
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

### CSP Nonce の使用（より厳格）

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';

export function middleware(request: NextRequest) {
  const nonce = crypto.randomBytes(16).toString('base64');
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' data: https:;
  `
    .replace(/\s{2,}/g, ' ')
    .trim();

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('x-nonce', nonce);

  return response;
}
```

## 4. 認証トークンの安全な保管

### ❌ Bad: LocalStorageに保存

```typescript
// XSSで盗まれる可能性
localStorage.setItem('token', token);
```

### ✅ Good: HttpOnly Cookieを使用

```typescript
// バックエンドでHttpOnly Cookieとして設定
// フロントエンドからはアクセス不可
```

### ✅ Alternative: メモリに保存

```typescript
// stores/authStore.ts
import { create } from 'zustand';

interface AuthStore {
  token: string | null;
  setToken: (token: string) => void;
  clearToken: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  setToken: (token) => set({ token }),
  clearToken: () => set({ token: null }),
}));

// リフレッシュトークンだけをHttpOnly Cookieに保存
```

## 5. 入力検証

### Zodでのバリデーション

```typescript
// schemas/user.schema.ts
import { z } from 'zod';

export const UserCreateSchema = z.object({
  email: z.string().email().max(255),
  name: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-zA-Z0-9\s-]+$/, 'Invalid characters'),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
});

// フォームでの使用
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

function SignupForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(UserCreateSchema),
  });

  const onSubmit = (data: z.infer<typeof UserCreateSchema>) => {
    // バリデーション済みのデータ
    console.log(data);
  };

  return <form onSubmit={handleSubmit(onSubmit)}>{/* ... */}</form>;
}
```

### URLパラメータのバリデーション

```typescript
// app/products/[id]/page.tsx
import { z } from 'zod';
import { notFound } from 'next/navigation';

const ParamsSchema = z.object({
  id: z.string().regex(/^\d+$/),
});

export default function ProductPage({ params }: { params: { id: string } }) {
  const result = ParamsSchema.safeParse(params);

  if (!result.success) {
    notFound();
  }

  const productId = parseInt(result.data.id, 10);
  // ...
}
```

## 6. Rate Limiting

クライアント側での簡易的な制限：

```typescript
// utils/rateLimiter.ts
class RateLimiter {
  private timestamps: number[] = [];

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  canMakeRequest(): boolean {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(
      (timestamp) => now - timestamp < this.windowMs
    );

    if (this.timestamps.length < this.maxRequests) {
      this.timestamps.push(now);
      return true;
    }

    return false;
  }
}

// 使用例: 1分間に10リクエストまで
const limiter = new RateLimiter(10, 60 * 1000);

async function submitForm() {
  if (!limiter.canMakeRequest()) {
    alert('Too many requests. Please try again later.');
    return;
  }

  // リクエストを実行
}
```

## 7. 安全なリダイレクト

### Open Redirect 対策

```typescript
// utils/redirect.ts
const ALLOWED_DOMAINS = [
  'example.com',
  'www.example.com',
  'admin.example.com',
];

export function isSafeRedirect(url: string): boolean {
  try {
    const parsedUrl = new URL(url, window.location.origin);

    // 同一オリジンの場合はOK
    if (parsedUrl.origin === window.location.origin) {
      return true;
    }

    // 許可されたドメインの場合はOK
    return ALLOWED_DOMAINS.includes(parsedUrl.hostname);
  } catch {
    return false;
  }
}

// 使用例
function handleRedirect(redirectUrl: string) {
  if (!isSafeRedirect(redirectUrl)) {
    console.error('Unsafe redirect detected');
    router.push('/');
    return;
  }

  router.push(redirectUrl);
}
```

## 8. 環境変数の管理

### 公開・非公開の分離

```typescript
// .env.local（Gitにコミットしない）
DATABASE_URL=postgresql://...
API_SECRET_KEY=xxx

// .env.production
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_APP_URL=https://example.com

// config/env.ts
import { z } from 'zod';

const EnvSchema = z.object({
  // 公開（クライアント側で使用可能）
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // 非公開（サーバー側のみ）
  DATABASE_URL: z.string().url().optional(),
  API_SECRET_KEY: z.string().optional(),
});

export const env = EnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  API_SECRET_KEY: process.env.API_SECRET_KEY,
});
```

### .gitignore

```
.env*.local
.env.production.local
```

## 9. セキュリティチェックリスト

- [ ] XSS: ユーザー入力を適切にエスケープ
- [ ] CSRF: CSRFトークンを使用
- [ ] CSP: Content Security Policyを設定
- [ ] 認証: トークンをHttpOnly Cookieに保存
- [ ] 入力検証: Zodでバリデーション
- [ ] Rate Limiting: 過度なリクエストを制限
- [ ] リダイレクト: Open Redirect対策
- [ ] 環境変数: 秘密情報を.gitignoreに追加
- [ ] HTTPS: 本番環境でHTTPSを使用
- [ ] 依存関係: 定期的にセキュリティアップデート

## 10. セキュリティテスト

### npm auditの実行

```bash
# 脆弱性チェック
npm audit

# 自動修正
npm audit fix

# 強制的に修正
npm audit fix --force
```

### Snyk の使用

```bash
npm install -D snyk

# テスト
npx snyk test

# 監視
npx snyk monitor
```

## メリット

1. **脆弱性の低減**: 一般的な攻撃から保護
2. **ユーザー保護**: ユーザーデータの安全性向上
3. **信頼性**: セキュアなアプリケーションへの信頼
4. **コンプライアンス**: セキュリティ基準への準拠

## デメリット

1. **複雑性**: 実装が複雑になる
2. **パフォーマンス**: セキュリティチェックによるオーバーヘッド
3. **開発速度**: セキュリティ対策に時間がかかる

## 導入の推奨度

**⭐⭐⭐⭐⭐ (非常に高い)**

セキュリティは必須です。特に本番環境では全項目を実装すべきです。

## 参考資料

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Headers](https://nextjs.org/docs/app/api-reference/next-config-js/headers)
- [DOMPurify](https://github.com/cure53/DOMPurify)
- [Snyk](https://snyk.io/)
