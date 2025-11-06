/**
 * User Schema with io-ts
 *
 * io-tsを使用して、User型のランタイムバリデーションを行います。
 * カスタムバリデーション（パスワード強度、メールアドレス形式など）も含みます。
 */

import * as t from 'io-ts';
import { UserId, isUserId } from '../types/branded';
import { UserRole } from '../types/user';

// カスタムCodec: UserId
const UserIdCodec = new t.Type<UserId, number, unknown>(
  'UserId',
  isUserId,
  (input, context) => {
    if (typeof input !== 'number') {
      return t.failure(input, context);
    }
    if (!Number.isInteger(input) || input <= 0) {
      return t.failure(input, context);
    }
    return t.success(UserId(input));
  },
  (id) => id as number
);

// 文字列の長さバリデーション用のヘルパー
const stringWithMinMax = (min: number, max: number, name: string = 'string') =>
  new t.Type<string, string, unknown>(
    name,
    (input): input is string => typeof input === 'string' && input.length >= min && input.length <= max,
    (input, context) => {
      if (typeof input !== 'string') {
        return t.failure(input, context);
      }
      if (input.length < min || input.length > max) {
        return t.failure(input, context);
      }
      return t.success(input);
    },
    t.identity
  );

// メールアドレスバリデーション用のヘルパー
const emailString = new t.Type<string, string, unknown>(
  'Email',
  (input): input is string => {
    if (typeof input !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input);
  },
  (input, context) => {
    if (typeof input !== 'string') {
      return t.failure(input, context);
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input)) {
      return t.failure(input, context);
    }
    return t.success(input);
  },
  t.identity
);

// パスワードバリデーション用のヘルパー
// 最低8文字、大文字・小文字・数字を含む
const passwordString = new t.Type<string, string, unknown>(
  'Password',
  (input): input is string => {
    if (typeof input !== 'string') return false;
    if (input.length < 8) return false;
    const hasUpperCase = /[A-Z]/.test(input);
    const hasLowerCase = /[a-z]/.test(input);
    const hasNumber = /\d/.test(input);
    return hasUpperCase && hasLowerCase && hasNumber;
  },
  (input, context) => {
    if (typeof input !== 'string') {
      return t.failure(input, context);
    }
    if (input.length < 8) {
      return t.failure(input, context);
    }
    const hasUpperCase = /[A-Z]/.test(input);
    const hasLowerCase = /[a-z]/.test(input);
    const hasNumber = /\d/.test(input);
    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return t.failure(input, context);
    }
    return t.success(input);
  },
  t.identity
);

// ISO 8601 datetime バリデーション用のヘルパー
const datetimeString = new t.Type<string, string, unknown>(
  'DateTime',
  (input): input is string => {
    if (typeof input !== 'string') return false;
    const date = new Date(input);
    return !isNaN(date.getTime());
  },
  (input, context) => {
    if (typeof input !== 'string') {
      return t.failure(input, context);
    }
    const date = new Date(input);
    if (isNaN(date.getTime())) {
      return t.failure(input, context);
    }
    return t.success(input);
  },
  t.identity
);

// UserRoleスキーマ
export const UserRoleSchema = t.union([
  t.literal('customer'),
  t.literal('admin'),
]);

export type UserRoleType = t.TypeOf<typeof UserRoleSchema>;

// Userスキーマ
export const UserSchema = t.type({
  id: UserIdCodec,
  email: emailString,
  name: stringWithMinMax(2, 100, 'UserName'),
  role: UserRoleSchema,
  created_at: datetimeString,
  updated_at: t.union([datetimeString, t.undefined]),
});

export type User = t.TypeOf<typeof UserSchema>;

// UserCreateスキーマ
export const UserCreateSchema = t.intersection([
  t.type({
    email: emailString,
    name: stringWithMinMax(2, 100, 'UserName'),
    password: passwordString,
  }),
  t.partial({
    role: UserRoleSchema,
  }),
]);

export type UserCreate = t.TypeOf<typeof UserCreateSchema>;

// UserCreateWithConfirmスキーマ（パスワード確認付き）
// io-tsでは refine のような機能が直接サポートされていないため、
// 後でバリデーションヘルパーで処理します
export const UserCreateWithConfirmSchema = t.intersection([
  t.type({
    email: emailString,
    name: stringWithMinMax(2, 100, 'UserName'),
    password: passwordString,
    password_confirm: t.string,
  }),
  t.partial({
    role: UserRoleSchema,
  }),
]);

export type UserCreateWithConfirm = t.TypeOf<typeof UserCreateWithConfirmSchema>;

// パスワード確認のカスタムバリデーション関数
export function validatePasswordConfirm(data: UserCreateWithConfirm): boolean {
  return data.password === data.password_confirm;
}

// UserLoginスキーマ
export const UserLoginSchema = t.type({
  email: emailString,
  password: t.string,
});

export type UserLogin = t.TypeOf<typeof UserLoginSchema>;

// Tokenスキーマ
export const TokenSchema = t.type({
  access_token: t.string,
  token_type: t.string,
});

export type Token = t.TypeOf<typeof TokenSchema>;
