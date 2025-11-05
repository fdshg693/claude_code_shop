# Validation Libraries（バリデーションライブラリ）

## 概要

型安全なバリデーションライブラリを使用して、実行時の型検証とスキーマ定義を統合します。

## Zod（推奨）

最も人気があり、TypeScriptとの統合が優れています。

### インストール

```bash
npm install zod
```

### 基本的な使用

```typescript
import { z } from 'zod';

// スキーマ定義
const UserSchema = z.object({
  id: z.number().int().positive(),
  email: z.string().email(),
  name: z.string().min(2).max(100),
  age: z.number().int().min(0).max(150).optional(),
  role: z.enum(['user', 'admin']),
  createdAt: z.date(),
});

// 型を生成
type User = z.infer<typeof UserSchema>;

// バリデーション
const result = UserSchema.safeParse(data);

if (result.success) {
  console.log(result.data); // User型
} else {
  console.error(result.error); // ZodError
}
```

### React Hook Form との統合

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const SignupSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上である必要があります')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      '大文字、小文字、数字を含む必要があります'
    ),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'パスワードが一致しません',
  path: ['confirmPassword'],
});

type SignupFormData = z.infer<typeof SignupSchema>;

function SignupForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(SignupSchema),
  });

  const onSubmit = (data: SignupFormData) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}

      <input type="password" {...register('password')} />
      {errors.password && <span>{errors.password.message}</span>}

      <input type="password" {...register('confirmPassword')} />
      {errors.confirmPassword && <span>{errors.confirmPassword.message}</span>}

      <button type="submit">登録</button>
    </form>
  );
}
```

### 複雑なバリデーション

```typescript
// ネストしたオブジェクト
const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  zipCode: z.string().regex(/^\d{3}-\d{4}$/, '郵便番号は000-0000形式です'),
});

const OrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.number(),
      quantity: z.number().int().positive(),
    })
  ).min(1, '少なくとも1つの商品が必要です'),
  shippingAddress: AddressSchema,
  billingAddress: AddressSchema.optional(),
});

// Union型
const PaymentMethodSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('credit_card'),
    cardNumber: z.string().length(16),
    cvv: z.string().length(3),
  }),
  z.object({
    type: z.literal('bank_transfer'),
    accountNumber: z.string(),
    bankCode: z.string(),
  }),
]);

// Transform
const DateStringSchema = z
  .string()
  .datetime()
  .transform((str) => new Date(str));

// Preprocess
const NumberStringSchema = z.preprocess(
  (val) => (typeof val === 'string' ? parseFloat(val) : val),
  z.number()
);
```

## Yup（代替案）

### インストール

```bash
npm install yup
```

### 使用例

```typescript
import * as yup from 'yup';

const userSchema = yup.object({
  name: yup.string().required().min(2).max(100),
  email: yup.string().email().required(),
  age: yup.number().positive().integer().optional(),
  website: yup.string().url().optional(),
});

type User = yup.InferType<typeof userSchema>;

// バリデーション
try {
  const user = await userSchema.validate(data, { abortEarly: false });
  console.log(user);
} catch (err) {
  if (err instanceof yup.ValidationError) {
    console.error(err.errors);
  }
}
```

## Valibot（超軽量）

Zodの代替として、より小さいバンドルサイズを提供：

### インストール

```bash
npm install valibot
```

### 使用例

```typescript
import * as v from 'valibot';

const UserSchema = v.object({
  id: v.number(),
  email: v.pipe(v.string(), v.email()),
  name: v.pipe(v.string(), v.minLength(2), v.maxLength(100)),
  age: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
});

type User = v.InferOutput<typeof UserSchema>;

const result = v.safeParse(UserSchema, data);

if (result.success) {
  console.log(result.output);
} else {
  console.error(result.issues);
}
```

## ArkType（超高速）

最も高速なバリデーションライブラリ：

### インストール

```bash
npm install arktype
```

### 使用例

```typescript
import { type } from 'arktype';

const User = type({
  id: 'number',
  email: 'email',
  name: 'string>2',
  'age?': 'number>=0',
});

type User = typeof User.infer;

const result = User(data);

if (result instanceof type.errors) {
  console.error(result.summary);
} else {
  console.log(result); // User型
}
```

## TypeBox（JSON Schema）

JSON Schemaを生成できる：

### インストール

```bash
npm install @sinclair/typebox
```

### 使用例

```typescript
import { Type, Static } from '@sinclair/typebox';

const User = Type.Object({
  id: Type.Number(),
  email: Type.String({ format: 'email' }),
  name: Type.String({ minLength: 2, maxLength: 100 }),
  age: Type.Optional(Type.Number({ minimum: 0, maximum: 150 })),
});

type User = Static<typeof User>;

// JSON Schemaとして出力
console.log(JSON.stringify(User, null, 2));
```

## 比較表

| ライブラリ | バンドルサイズ | パフォーマンス | 人気度 | TypeScript統合 | 推奨度 |
|-----------|---------------|---------------|--------|---------------|--------|
| **Zod** | 14KB | 普通 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Yup** | 15KB | 普通 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Valibot** | 2KB | 速い | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **ArkType** | 9KB | 非常に速い | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **TypeBox** | 10KB | 速い | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

## 推奨

**Zod**を推奨します。理由：
1. 最も成熟したエコシステム
2. 優れたTypeScript統合
3. React Hook Form、tRPCなどとの統合
4. 豊富なドキュメントとコミュニティ

バンドルサイズが重要な場合は**Valibot**を検討してください。

## 参考資料

- [Zod](https://zod.dev/)
- [Yup](https://github.com/jquense/yup)
- [Valibot](https://valibot.dev/)
- [ArkType](https://arktype.io/)
- [TypeBox](https://github.com/sinclairzx81/typebox)
