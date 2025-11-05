export enum OrderStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface OrderItemCreate {
  product_id: number;
  quantity: number;
}

export interface Order {
  id: number;
  user_id: number;
  total_amount: number;
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
  id: number;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
}
