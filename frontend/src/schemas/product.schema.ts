/**
 * Product Schema with io-ts
 *
 * io-tsを使用して、Product型のランタイムバリデーションを行います。
 * Branded Typesとの統合も行っています。
 */

import * as t from 'io-ts';
import {
  ProductId, CategoryId, Price, Quantity,
  isProductId, isCategoryId, isPrice, isQuantity
} from '../types/branded';

// カスタムCodec: ProductId
const ProductIdCodec = new t.Type<ProductId, number, unknown>(
  'ProductId',
  isProductId,
  (input, context) => {
    if (typeof input !== 'number') {
      return t.failure(input, context);
    }
    if (!Number.isInteger(input) || input <= 0) {
      return t.failure(input, context);
    }
    return t.success(ProductId(input));
  },
  (id) => id as number
);

// カスタムCodec: CategoryId
const CategoryIdCodec = new t.Type<CategoryId, number, unknown>(
  'CategoryId',
  isCategoryId,
  (input, context) => {
    if (typeof input !== 'number') {
      return t.failure(input, context);
    }
    if (!Number.isInteger(input) || input <= 0) {
      return t.failure(input, context);
    }
    return t.success(CategoryId(input));
  },
  (id) => id as number
);

// カスタムCodec: Price
const PriceCodec = new t.Type<Price, number, unknown>(
  'Price',
  isPrice,
  (input, context) => {
    if (typeof input !== 'number') {
      return t.failure(input, context);
    }
    if (!Number.isFinite(input) || input < 0) {
      return t.failure(input, context);
    }
    return t.success(Price(input));
  },
  (price) => price as number
);

// カスタムCodec: Quantity
const QuantityCodec = new t.Type<Quantity, number, unknown>(
  'Quantity',
  isQuantity,
  (input, context) => {
    if (typeof input !== 'number') {
      return t.failure(input, context);
    }
    if (!Number.isInteger(input) || input < 0) {
      return t.failure(input, context);
    }
    return t.success(Quantity(input));
  },
  (quantity) => quantity as number
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

// Productスキーマ
export const ProductSchema = t.type({
  id: ProductIdCodec,
  name: stringWithMinMax(1, 200, 'ProductName'),
  description: t.union([t.string, t.undefined]),
  price: PriceCodec,
  stock_quantity: QuantityCodec,
  category_id: CategoryIdCodec,
  image_url: t.union([urlString, t.undefined]),
  is_active: t.boolean,
  created_at: datetimeString,
  updated_at: t.union([datetimeString, t.undefined]),
});

export type Product = t.TypeOf<typeof ProductSchema>;

// ProductCreateスキーマ
export const ProductCreateSchema = t.intersection([
  t.type({
    name: stringWithMinMax(1, 200, 'ProductName'),
    price: t.number,
    category_id: t.number,
  }),
  t.partial({
    description: t.string,
    stock_quantity: t.number,
    image_url: t.string,
    is_active: t.boolean,
  }),
]);

export type ProductCreate = t.TypeOf<typeof ProductCreateSchema>;

// ProductUpdateスキーマ
export const ProductUpdateSchema = t.partial({
  name: stringWithMinMax(1, 200, 'ProductName'),
  description: t.string,
  price: t.number,
  stock_quantity: t.number,
  category_id: t.number,
  image_url: t.string,
  is_active: t.boolean,
});

export type ProductUpdate = t.TypeOf<typeof ProductUpdateSchema>;

// ProductListスキーマ（一覧表示用の簡略版）
export const ProductListSchema = t.type({
  id: ProductIdCodec,
  name: t.string,
  price: PriceCodec,
  image_url: t.union([t.string, t.undefined]),
  is_active: t.boolean,
});

export type ProductList = t.TypeOf<typeof ProductListSchema>;
