import { ProductId, CategoryId, Price, Quantity } from './branded';

export interface Product {
  id: ProductId;
  name: string;
  description?: string;
  price: Price;
  stock_quantity: Quantity;
  category_id: CategoryId;
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
  id: ProductId;
  name: string;
  price: Price;
  image_url?: string;
  is_active: boolean;
}
