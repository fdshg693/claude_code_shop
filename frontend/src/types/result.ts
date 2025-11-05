/**
 * Result pattern utilities using neverthrow library
 *
 * Re-exports neverthrow functionality with custom type definitions
 * for type-safe error handling throughout the application.
 */

import {
  Result,
  ok,
  err,
  ResultAsync,
  okAsync,
  errAsync,
} from 'neverthrow';

// Re-export neverthrow types and functions
export type { Result, ResultAsync };
export { ok, err, okAsync, errAsync };

/**
 * Type guard to check if a Result is Ok
 */
export const isOk = <T, E>(result: Result<T, E>): result is Result<T, never> => {
  return result.isOk();
};

/**
 * Type guard to check if a Result is Err
 */
export const isErr = <T, E>(result: Result<T, E>): result is Result<never, E> => {
  return result.isErr();
};

/**
 * Utility to convert a Promise into a ResultAsync
 * Catches any errors and converts them to Err
 */
export const fromPromise = <T, E = Error>(
  promise: Promise<T>,
  errorHandler: (error: unknown) => E
): ResultAsync<T, E> => {
  return ResultAsync.fromPromise(promise, errorHandler);
};

/**
 * Utility to combine multiple Results into a single Result containing an array
 * If any Result is an Err, returns the first Err encountered
 */
export const combine = Result.combine;
export const combineAsync = ResultAsync.combine;

/**
 * Helper to extract value from Result or throw error
 * Use with caution - prefer handling errors explicitly
 */
export const unwrap = <T, E>(result: Result<T, E>): T => {
  return result._unsafeUnwrap();
};

/**
 * Helper to extract error from Result or throw
 * Use with caution - prefer handling errors explicitly
 */
export const unwrapErr = <T, E>(result: Result<T, E>): E => {
  return result._unsafeUnwrapErr();
};
