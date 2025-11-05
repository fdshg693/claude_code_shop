import { CategoryId } from './branded';

export interface Category {
  id: CategoryId;
  name: string;
  description?: string;
  parent_id?: CategoryId;
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
