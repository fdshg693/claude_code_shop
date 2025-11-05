import { UserId, ProductId, Quantity } from './branded';

export interface CartItem {
  product_id: ProductId;
  quantity: Quantity;
  added_at: string;
}

export interface Cart {
  user_id: UserId;
  items: CartItem[];
  expires_at: string;
}

export interface CartItemAdd {
  product_id: number;
  quantity?: number;
}

export interface CartItemUpdate {
  quantity: number;
}
