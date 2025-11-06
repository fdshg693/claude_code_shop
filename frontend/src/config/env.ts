/**
 * Environment Variable Validation with io-ts
 *
 * 環境変数をio-tsを使ってバリデーションし、型安全にアクセスできるようにします。
 * アプリケーション起動時に環境変数が正しく設定されているか検証します。
 */

import * as t from 'io-ts';
import { isRight } from 'fp-ts/Either';
import { PathReporter } from 'io-ts/PathReporter';

// URL バリデーション用のヘルパー
const urlString = new t.Type<string, string, unknown>(
  'URL',
  (input): input is string => {
    if (typeof input !== 'string') return false;
    try {
      new URL(input);
      return true;
    } catch {
      return false;
    }
  },
  (input, context) => {
    if (typeof input !== 'string') {
      return t.failure(input, context);
    }
    try {
      new URL(input);
      return t.success(input);
    } catch {
      return t.failure(input, context);
    }
  },
  t.identity
);

// 環境変数スキーマ
const EnvSchema = t.type({
  NODE_ENV: t.union([
    t.literal('development'),
    t.literal('production'),
    t.literal('test'),
  ]),
  NEXT_PUBLIC_API_URL: urlString,
  NEXT_PUBLIC_APP_URL: urlString,
  DATABASE_URL: t.union([urlString, t.undefined]),
});

type Env = t.TypeOf<typeof EnvSchema>;

// 環境変数を検証する関数
function validateEnv(): Env {
  const envData = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    DATABASE_URL: process.env.DATABASE_URL,
  };

  const result = EnvSchema.decode(envData);

  if (isRight(result)) {
    return result.right;
  } else {
    const errors = PathReporter.report(result);
    console.error('環境変数の検証に失敗しました:');
    errors.forEach((error) => console.error(error));
    throw new Error('Invalid environment variables');
  }
}

// 環境変数を検証してエクスポート
// アプリケーション起動時にこのファイルがインポートされると、検証が実行されます
export const env = validateEnv();

// 使用例:
// import { env } from '@/config/env';
// console.log(env.NEXT_PUBLIC_API_URL); // ✅ 型安全かつバリデーション済み
