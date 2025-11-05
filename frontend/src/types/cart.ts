export interface CartItem {
  product_id: number;
  quantity: number;
  added_at: string;
}

export interface Cart {
  user_id: number;
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
