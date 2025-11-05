/**
 * Product service with Result pattern for type-safe error handling
 * Enhanced with io-ts runtime validation
 */

import axios from 'axios';
import { Result, ok, err, ResultAsync, fromPromise } from '@/types/result';
import { Product, ProductCreate, ProductUpdate } from '@/types/product';
import { ProductId } from '@/types/branded';
import { ProductError } from '@/types/errors';
import { ProductSchema, ProductCreateSchema, ProductUpdateSchema } from '@/schemas/product.schema';
import { validate, validateArray } from '@/utils/validation';

// API base URL (should be moved to environment config)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

/**
 * Fetch a single product by ID
 * Returns Result<Product, ProductError> for type-safe error handling
 * ✅ Enhanced with io-ts runtime validation
 */
export async function fetchProduct(
  id: ProductId
): Promise<Result<Product, ProductError>> {
  try {
    const response = await axios.get(`${API_BASE_URL}/products/${id}`);

    // ✅ io-tsでランタイムバリデーション
    const validationResult = validate(ProductSchema, response.data);

    if (validationResult.isErr()) {
      console.error('Product validation error:', validationResult.error.errors);
      return err({
        type: 'NetworkError',
        message: `Invalid product data: ${validationResult.error.errors.join(', ')}`,
      });
    }

    return ok(validationResult.value);
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
 * ✅ Enhanced with io-ts runtime validation
 */
export async function fetchProducts(): Promise<Result<Product[], ProductError>> {
  try {
    const response = await axios.get(`${API_BASE_URL}/products`);

    // ✅ io-tsで配列のバリデーション
    const validationResult = validateArray(ProductSchema, response.data);

    if (validationResult.isErr()) {
      console.error('Products validation error:', validationResult.error.errors);
      return err({
        type: 'NetworkError',
        message: `Invalid products data: ${validationResult.error.errors.join(', ')}`,
      });
    }

    return ok(validationResult.value);
  } catch (error) {
    return err({
      type: 'NetworkError',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Fetch products by category
 * ✅ Enhanced with io-ts runtime validation
 */
export async function fetchProductsByCategory(
  categoryId: number
): Promise<Result<Product[], ProductError>> {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/products?category_id=${categoryId}`
    );

    // ✅ io-tsで配列のバリデーション
    const validationResult = validateArray(ProductSchema, response.data);

    if (validationResult.isErr()) {
      console.error('Products validation error:', validationResult.error.errors);
      return err({
        type: 'NetworkError',
        message: `Invalid products data: ${validationResult.error.errors.join(', ')}`,
      });
    }

    return ok(validationResult.value);
  } catch (error) {
    return err({
      type: 'NetworkError',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Create a new product
 * ✅ Enhanced with io-ts runtime validation
 */
export async function createProduct(
  data: ProductCreate
): Promise<Result<Product, ProductError>> {
  // ✅ 入力データのバリデーション
  const inputValidation = validate(ProductCreateSchema, data);

  if (inputValidation.isErr()) {
    console.error('Product create validation error:', inputValidation.error.errors);
    return err({
      type: 'NetworkError',
      message: `Invalid input data: ${inputValidation.error.errors.join(', ')}`,
    });
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/products`, inputValidation.value);

    // ✅ APIレスポンスのバリデーション
    const validationResult = validate(ProductSchema, response.data);

    if (validationResult.isErr()) {
      console.error('Product response validation error:', validationResult.error.errors);
      return err({
        type: 'NetworkError',
        message: `Invalid response data: ${validationResult.error.errors.join(', ')}`,
      });
    }

    return ok(validationResult.value);
  } catch (error) {
    return err({
      type: 'NetworkError',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Update a product
 * ✅ Enhanced with io-ts runtime validation
 */
export async function updateProduct(
  id: ProductId,
  data: ProductUpdate
): Promise<Result<Product, ProductError>> {
  // ✅ 入力データのバリデーション
  const inputValidation = validate(ProductUpdateSchema, data);

  if (inputValidation.isErr()) {
    console.error('Product update validation error:', inputValidation.error.errors);
    return err({
      type: 'NetworkError',
      message: `Invalid input data: ${inputValidation.error.errors.join(', ')}`,
    });
  }

  try {
    const response = await axios.put(`${API_BASE_URL}/products/${id}`, inputValidation.value);

    // ✅ APIレスポンスのバリデーション
    const validationResult = validate(ProductSchema, response.data);

    if (validationResult.isErr()) {
      console.error('Product response validation error:', validationResult.error.errors);
      return err({
        type: 'NetworkError',
        message: `Invalid response data: ${validationResult.error.errors.join(', ')}`,
      });
    }

    return ok(validationResult.value);
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
 * ✅ Enhanced with io-ts runtime validation
 */
export function fetchProductAsync(id: ProductId): ResultAsync<Product, ProductError> {
  return fromPromise(
    axios.get(`${API_BASE_URL}/products/${id}`).then((res) => {
      // ✅ io-tsでランタイムバリデーション
      const validationResult = validate(ProductSchema, res.data);

      if (validationResult.isErr()) {
        throw new Error(`Invalid product data: ${validationResult.error.errors.join(', ')}`);
      }

      return validationResult.value;
    }),
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
