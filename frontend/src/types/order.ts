import { OrderId, OrderItemId, UserId, ProductId, Price, Quantity } from './branded';

export enum OrderStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

export interface OrderItem {
  id: OrderItemId;
  order_id: OrderId;
  product_id: ProductId;
  quantity: Quantity;
  unit_price: Price;
  subtotal: Price;
}

export interface OrderItemCreate {
  product_id: number;
  quantity: number;
}

export interface Order {
  id: OrderId;
  user_id: UserId;
  total_amount: Price;
  status: OrderStatus;
  shipping_address: string;
  created_at: string;
  updated_at?: string;
  order_items: OrderItem[];
}

export interface OrderCreate {
  shipping_address: string;
  items: OrderItemCreate[];
}

export interface OrderUpdate {
  status?: OrderStatus;
  shipping_address?: string;
}

export interface OrderList {
  id: OrderId;
  total_amount: Price;
  status: OrderStatus;
  created_at: string;
}
