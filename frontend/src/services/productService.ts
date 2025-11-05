/**
 * Product service with Result pattern for type-safe error handling
 */

import axios from 'axios';
import { Result, ok, err, ResultAsync, fromPromise } from '@/types/result';
import { Product, ProductCreate, ProductUpdate } from '@/types/product';
import { ProductId } from '@/types/branded';
import { ProductError } from '@/types/errors';

// API base URL (should be moved to environment config)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

/**
 * Fetch a single product by ID
 * Returns Result<Product, ProductError> for type-safe error handling
 */
export async function fetchProduct(
  id: ProductId
): Promise<Result<Product, ProductError>> {
  try {
    const response = await axios.get<Product>(`${API_BASE_URL}/products/${id}`);
    const product = response.data;

    if (!product) {
      return err({ type: 'NotFound', productId: id });
    }

    // Validate product price
    if (product.price < 0) {
      return err({ type: 'InvalidPrice', price: product.price });
    }

    return ok(product);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        return err({ type: 'NotFound', productId: id });
      }
    }
    return err({
      type: 'NetworkError',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Fetch all products
 * Returns Result<Product[], ProductError> for type-safe error handling
 */
export async function fetchProducts(): Promise<Result<Product[], ProductError>> {
  try {
    const response = await axios.get<Product[]>(`${API_BASE_URL}/products`);
    return ok(response.data);
  } catch (error) {
    return err({
      type: 'NetworkError',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Fetch products by category
 */
export async function fetchProductsByCategory(
  categoryId: number
): Promise<Result<Product[], ProductError>> {
  try {
    const response = await axios.get<Product[]>(
      `${API_BASE_URL}/products?category_id=${categoryId}`
    );
    return ok(response.data);
  } catch (error) {
    return err({
      type: 'NetworkError',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Create a new product
 */
export async function createProduct(
  data: ProductCreate
): Promise<Result<Product, ProductError>> {
  // Validate price before sending
  if (data.price < 0) {
    return err({ type: 'InvalidPrice', price: data.price });
  }

  try {
    const response = await axios.post<Product>(`${API_BASE_URL}/products`, data);
    return ok(response.data);
  } catch (error) {
    return err({
      type: 'NetworkError',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Update a product
 */
export async function updateProduct(
  id: ProductId,
  data: ProductUpdate
): Promise<Result<Product, ProductError>> {
  // Validate price if provided
  if (data.price !== undefined && data.price < 0) {
    return err({ type: 'InvalidPrice', price: data.price });
  }

  try {
    const response = await axios.put<Product>(`${API_BASE_URL}/products/${id}`, data);
    return ok(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        return err({ type: 'NotFound', productId: id });
      }
    }
    return err({
      type: 'NetworkError',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(
  id: ProductId
): Promise<Result<void, ProductError>> {
  try {
    await axios.delete(`${API_BASE_URL}/products/${id}`);
    return ok(undefined);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        return err({ type: 'NotFound', productId: id });
      }
    }
    return err({
      type: 'NetworkError',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Check product stock availability
 */
export async function checkStock(
  id: ProductId,
  requestedQuantity: number
): Promise<Result<boolean, ProductError>> {
  const productResult = await fetchProduct(id);

  if (productResult.isErr()) {
    return err(productResult.error);
  }

  const product = productResult.value;

  if (product.stock_quantity < requestedQuantity) {
    return err({
      type: 'OutOfStock',
      productId: id,
      requested: requestedQuantity,
    });
  }

  return ok(true);
}

/**
 * Example: Using ResultAsync for async operations
 * This is an alternative approach using neverthrow's ResultAsync
 */
export function fetchProductAsync(id: ProductId): ResultAsync<Product, ProductError> {
  return fromPromise(
    axios.get<Product>(`${API_BASE_URL}/products/${id}`).then((res) => res.data),
    (error): ProductError => {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return { type: 'NotFound', productId: id };
        }
      }
      return {
        type: 'NetworkError',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  );
}

/**
 * Example: Chaining operations with map and andThen
 */
export async function fetchProductWithDiscount(
  id: ProductId,
  discountPercent: number
): Promise<Result<{ product: Product; discountedPrice: number }, ProductError>> {
  const result = await fetchProduct(id);

  return result.map((product) => ({
    product,
    discountedPrice: product.price * (1 - discountPercent / 100),
  }));
}
