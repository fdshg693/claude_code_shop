/**
 * Custom error types for type-safe error handling with Result pattern
 */

/**
 * Product-related errors
 */
export type ProductError =
  | { type: 'NotFound'; productId: number }
  | { type: 'OutOfStock'; productId: number; requested: number }
  | { type: 'InvalidPrice'; price: number }
  | { type: 'NetworkError'; message: string };

/**
 * Order-related errors
 */
export type OrderError =
  | { type: 'EmptyCart' }
  | { type: 'InvalidAddress'; reason: string }
  | { type: 'PaymentFailed'; reason: string }
  | { type: 'NetworkError'; message: string };

/**
 * Cart-related errors
 */
export type CartError =
  | { type: 'ProductNotFound'; productId: number }
  | { type: 'InvalidQuantity'; quantity: number }
  | { type: 'MaxQuantityExceeded'; productId: number; max: number }
  | { type: 'NetworkError'; message: string };

/**
 * User-related errors
 */
export type UserError =
  | { type: 'NotAuthenticated' }
  | { type: 'NotFound'; userId: string }
  | { type: 'InvalidCredentials' }
  | { type: 'NetworkError'; message: string };

/**
 * Category-related errors
 */
export type CategoryError =
  | { type: 'NotFound'; categoryId: number }
  | { type: 'NetworkError'; message: string };

/**
 * Generic application error
 */
export type AppError =
  | ProductError
  | OrderError
  | CartError
  | UserError
  | CategoryError;
