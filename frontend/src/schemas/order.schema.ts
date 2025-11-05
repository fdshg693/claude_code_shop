/**
 * Order Schema with io-ts
 *
 * io-tsを使用して、Order型のランタイムバリデーションを行います。
 */

import * as t from 'io-ts';
import {
  OrderId, OrderItemId, UserId, ProductId, Price, Quantity,
  isOrderId, isOrderItemId, isUserId, isProductId, isPrice, isQuantity
} from '../types/branded';
import { OrderStatus } from '../types/order';

// カスタムCodec: OrderId
const OrderIdCodec = new t.Type<OrderId, number, unknown>(
  'OrderId',
  isOrderId,
  (input, context) => {
    if (typeof input !== 'number') {
      return t.failure(input, context);
    }
    if (!Number.isInteger(input) || input <= 0) {
      return t.failure(input, context);
    }
    return t.success(OrderId(input));
  },
  (id) => id as number
);

// カスタムCodec: OrderItemId
const OrderItemIdCodec = new t.Type<OrderItemId, number, unknown>(
  'OrderItemId',
  isOrderItemId,
  (input, context) => {
    if (typeof input !== 'number') {
      return t.failure(input, context);
    }
    if (!Number.isInteger(input) || input <= 0) {
      return t.failure(input, context);
    }
    return t.success(OrderItemId(input));
  },
  (id) => id as number
);

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

// OrderStatusスキーマ
export const OrderStatusSchema = t.union([
  t.literal('pending'),
  t.literal('confirmed'),
  t.literal('shipped'),
  t.literal('delivered'),
  t.literal('cancelled'),
]);

export type OrderStatusType = t.TypeOf<typeof OrderStatusSchema>;

// OrderItemスキーマ
export const OrderItemSchema = t.type({
  id: OrderItemIdCodec,
  order_id: OrderIdCodec,
  product_id: ProductIdCodec,
  quantity: QuantityCodec,
  unit_price: PriceCodec,
  subtotal: PriceCodec,
});

export type OrderItem = t.TypeOf<typeof OrderItemSchema>;

// OrderItemCreateスキーマ
export const OrderItemCreateSchema = t.type({
  product_id: t.number,
  quantity: t.number,
});

export type OrderItemCreate = t.TypeOf<typeof OrderItemCreateSchema>;

// Orderスキーマ
export const OrderSchema = t.type({
  id: OrderIdCodec,
  user_id: UserIdCodec,
  total_amount: PriceCodec,
  status: OrderStatusSchema,
  shipping_address: stringWithMinMax(10, 500, 'ShippingAddress'),
  created_at: datetimeString,
  updated_at: t.union([datetimeString, t.undefined]),
  order_items: t.array(OrderItemSchema),
});

export type Order = t.TypeOf<typeof OrderSchema>;

// OrderCreateスキーマ
export const OrderCreateSchema = t.type({
  shipping_address: stringWithMinMax(10, 500, 'ShippingAddress'),
  items: t.array(OrderItemCreateSchema),
});

export type OrderCreate = t.TypeOf<typeof OrderCreateSchema>;

// OrderUpdateスキーマ
export const OrderUpdateSchema = t.partial({
  status: OrderStatusSchema,
  shipping_address: stringWithMinMax(10, 500, 'ShippingAddress'),
});

export type OrderUpdate = t.TypeOf<typeof OrderUpdateSchema>;

// OrderListスキーマ（一覧表示用の簡略版）
export const OrderListSchema = t.type({
  id: OrderIdCodec,
  total_amount: PriceCodec,
  status: OrderStatusSchema,
  created_at: datetimeString,
});

export type OrderList = t.TypeOf<typeof OrderListSchema>;
