export interface Category {
  id: number;
  name: string;
  description?: string;
  parent_id?: number;
}

export interface CategoryCreate {
  name: string;
  description?: string;
  parent_id?: number;
}

export interface CategoryUpdate {
  name?: string;
  description?: string;
  parent_id?: number;
}
