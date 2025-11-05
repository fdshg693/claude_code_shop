/**
 * Branded Types
 *
 * プリミティブ型に名前を付けて、型レベルで異なる意味を持つ値を区別する手法です。
 * これにより、異なる意味のIDを誤って混同することを防ぎます。
 */

declare const __brand: unique symbol;
type Brand<T, TBrand> = T & { [__brand]: TBrand };

// ID型の定義
export type ProductId = Brand<number, 'ProductId'>;
export type CategoryId = Brand<number, 'CategoryId'>;
export type UserId = Brand<number, 'UserId'>;
export type OrderId = Brand<number, 'OrderId'>;
export type OrderItemId = Brand<number, 'OrderItemId'>;
export type CartItemId = Brand<number, 'CartItemId'>;

// 価格型の定義（負の値を防ぐ）
export type Price = Brand<number, 'Price'>;

// 数量型の定義（負の値を防ぐ）
export type Quantity = Brand<number, 'Quantity'>;

// ヘルパー関数: ID型
export const ProductId = (id: number): ProductId => {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid ProductId: ${id}`);
  }
  return id as ProductId;
};

export const CategoryId = (id: number): CategoryId => {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid CategoryId: ${id}`);
  }
  return id as CategoryId;
};

export const UserId = (id: number): UserId => {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid UserId: ${id}`);
  }
  return id as UserId;
};

export const OrderId = (id: number): OrderId => {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid OrderId: ${id}`);
  }
  return id as OrderId;
};

export const OrderItemId = (id: number): OrderItemId => {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid OrderItemId: ${id}`);
  }
  return id as OrderItemId;
};

export const CartItemId = (id: number): CartItemId => {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid CartItemId: ${id}`);
  }
  return id as CartItemId;
};

// ヘルパー関数: 価格型
export const Price = (price: number): Price => {
  if (price < 0) {
    throw new Error(`Price cannot be negative: ${price}`);
  }
  if (!Number.isFinite(price)) {
    throw new Error(`Price must be a finite number: ${price}`);
  }
  return price as Price;
};

// ヘルパー関数: 数量型
export const Quantity = (quantity: number): Quantity => {
  if (!Number.isInteger(quantity)) {
    throw new Error(`Quantity must be an integer: ${quantity}`);
  }
  if (quantity < 0) {
    throw new Error(`Quantity cannot be negative: ${quantity}`);
  }
  return quantity as Quantity;
};

// 型ガード関数
export const isProductId = (value: unknown): value is ProductId => {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
};

export const isCategoryId = (value: unknown): value is CategoryId => {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
};

export const isUserId = (value: unknown): value is UserId => {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
};

export const isOrderId = (value: unknown): value is OrderId => {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
};

export const isPrice = (value: unknown): value is Price => {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
};

export const isQuantity = (value: unknown): value is Quantity => {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
};
