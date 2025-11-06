/**
 * Validation Utilities for io-ts
 *
 * io-tsのバリデーション結果をneverthrowのResultパターンと統合するヘルパー関数群
 */

import * as t from 'io-ts';
import { isRight, isLeft } from 'fp-ts/Either';
import { PathReporter } from 'io-ts/PathReporter';
import { Result, ok, err } from '@/types/result';

/**
 * バリデーションエラー型
 */
export interface ValidationError {
  type: 'ValidationError';
  errors: string[];
}

/**
 * io-tsのバリデーション結果をResultパターンに変換
 *
 * @param codec - io-tsのCodec
 * @param data - バリデーション対象のデータ
 * @returns Result<T, ValidationError>
 *
 * @example
 * const result = validate(ProductSchema, apiResponse);
 * if (result.isOk()) {
 *   console.log(result.value); // 型安全なProduct
 * } else {
 *   console.error(result.error.errors); // エラーメッセージの配列
 * }
 */
export function validate<T, O = T, I = unknown>(
  codec: t.Type<T, O, I>,
  data: I
): Result<T, ValidationError> {
  const result = codec.decode(data);

  if (isRight(result)) {
    return ok(result.right);
  } else {
    const errors = PathReporter.report(result);
    return err({
      type: 'ValidationError',
      errors,
    });
  }
}

/**
 * io-tsのバリデーション結果を即座に検証（失敗時は例外をスロー）
 *
 * @param codec - io-tsのCodec
 * @param data - バリデーション対象のデータ
 * @returns T - バリデーション済みのデータ
 * @throws Error - バリデーション失敗時
 *
 * @example
 * try {
 *   const product = validateOrThrow(ProductSchema, apiResponse);
 *   console.log(product); // 型安全なProduct
 * } catch (error) {
 *   console.error('Validation failed:', error);
 * }
 */
export function validateOrThrow<T, O = T, I = unknown>(
  codec: t.Type<T, O, I>,
  data: I
): T {
  const result = codec.decode(data);

  if (isRight(result)) {
    return result.right;
  } else {
    const errors = PathReporter.report(result);
    throw new Error(`Validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * 配列のバリデーション
 *
 * @param codec - io-tsのCodec
 * @param data - バリデーション対象の配列
 * @returns Result<T[], ValidationError>
 *
 * @example
 * const result = validateArray(ProductSchema, productsArray);
 */
export function validateArray<T, O = T, I = unknown>(
  codec: t.Type<T, O, I>,
  data: I[]
): Result<T[], ValidationError> {
  return validate(t.array(codec), data);
}

/**
 * 部分的なバリデーション（開発環境でのみ実行）
 *
 * 本番環境ではパフォーマンスのためバリデーションをスキップし、
 * 開発環境でのみ完全なバリデーションを実行します。
 *
 * @param codec - io-tsのCodec
 * @param data - バリデーション対象のデータ
 * @returns T - データ（本番環境では未検証）
 *
 * @example
 * const product = validateInDev(ProductSchema, apiResponse);
 */
export function validateInDev<T, O = T, I = unknown>(
  codec: t.Type<T, O, I>,
  data: I
): T {
  if (process.env.NODE_ENV === 'development') {
    return validateOrThrow(codec, data);
  }
  // 本番環境では型アサーションのみ（パフォーマンス最適化）
  return data as unknown as T;
}

/**
 * 大量データの最初の数件のみバリデーション（サンプリング）
 *
 * 大量のデータをバリデーションする際、全件チェックするとパフォーマンスが低下するため、
 * 最初の数件のみをバリデーションします。
 *
 * @param codec - io-tsのCodec
 * @param data - バリデーション対象の配列
 * @param sampleSize - サンプルサイズ（デフォルト: 10）
 * @returns Result<T[], ValidationError>
 *
 * @example
 * const result = validateSample(ProductSchema, largeProductArray, 5);
 */
export function validateSample<T, O = T, I = unknown>(
  codec: t.Type<T, O, I>,
  data: I[],
  sampleSize: number = 10
): Result<T[], ValidationError> {
  const sample = data.slice(0, sampleSize);
  const sampleResult = validate(t.array(codec), sample);

  if (sampleResult.isErr()) {
    return sampleResult;
  }

  // サンプルが成功したら、残りのデータは型アサーションのみ
  return ok(data as unknown as T[]);
}

/**
 * ネストされたバリデーションエラーをフラットな配列に変換
 *
 * @param errors - バリデーションエラーの配列
 * @returns フラット化されたエラーメッセージの配列
 */
export function flattenValidationErrors(errors: string[]): string[] {
  return errors.map((error) => error.trim()).filter((error) => error.length > 0);
}

/**
 * バリデーションエラーをユーザーフレンドリーなメッセージに変換
 *
 * @param errors - バリデーションエラーの配列
 * @returns ユーザー向けのエラーメッセージ
 */
export function formatValidationError(errors: string[]): string {
  const formattedErrors = flattenValidationErrors(errors);

  if (formattedErrors.length === 0) {
    return 'データの検証に失敗しました';
  }

  if (formattedErrors.length === 1) {
    return formattedErrors[0];
  }

  return `以下の検証エラーが発生しました:\n${formattedErrors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`;
}

/**
 * タイプガード: ValidationErrorかどうかを判定
 */
export function isValidationError(error: unknown): error is ValidationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'ValidationError' &&
    'errors' in error &&
    Array.isArray((error as ValidationError).errors)
  );
}
