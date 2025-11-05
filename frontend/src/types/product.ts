export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  stock_quantity: number;
  category_id: number;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ProductCreate {
  name: string;
  description?: string;
  price: number;
  stock_quantity?: number;
  category_id: number;
  image_url?: string;
  is_active?: boolean;
}

export interface ProductUpdate {
  name?: string;
  description?: string;
  price?: number;
  stock_quantity?: number;
  category_id?: number;
  image_url?: string;
  is_active?: boolean;
}

export interface ProductList {
  id: number;
  name: string;
  price: number;
  image_url?: string;
  is_active: boolean;
}
