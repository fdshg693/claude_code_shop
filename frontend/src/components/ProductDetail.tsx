'use client';

/**
 * ProductDetail component - Example usage of Result pattern in React
 *
 * This component demonstrates how to use Result<T, E> for type-safe
 * error handling in a React component with proper state management.
 */

import { useEffect, useState } from 'react';
import { Result, isOk } from '@/types/result';
import { Product } from '@/types/product';
import { ProductId } from '@/types/branded';
import { ProductError } from '@/types/errors';
import { fetchProduct } from '@/services/productService';

interface ProductDetailProps {
  productId: ProductId;
}

export function ProductDetail({ productId }: ProductDetailProps) {
  const [result, setResult] = useState<Result<Product, ProductError> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadProduct = async () => {
      setIsLoading(true);
      const productResult = await fetchProduct(productId);

      if (isMounted) {
        setResult(productResult);
        setIsLoading(false);
      }
    };

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading product...</div>
      </div>
    );
  }

  // No result yet
  if (!result) {
    return null;
  }

  // Success case - type-safe access to product data
  if (isOk(result)) {
    const product = result.value;

    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {product.image_url && (
            <div className="w-full h-64 bg-gray-200">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="p-6">
            <h1 className="text-3xl font-bold mb-4">{product.name}</h1>

            {product.description && (
              <p className="text-gray-700 mb-4">{product.description}</p>
            )}

            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl font-bold text-green-600">
                ¥{product.price.toLocaleString()}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm ${
                  product.stock_quantity > 0
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {product.stock_quantity > 0
                  ? `在庫: ${product.stock_quantity}`
                  : '在庫なし'}
              </span>
            </div>

            <button
              className={`w-full py-3 rounded-lg font-semibold ${
                product.stock_quantity > 0 && product.is_active
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              disabled={product.stock_quantity === 0 || !product.is_active}
            >
              {product.stock_quantity > 0 && product.is_active
                ? 'カートに追加'
                : '購入できません'}
            </button>

            <div className="mt-4 text-sm text-gray-500">
              <p>商品ID: {product.id}</p>
              <p>登録日: {new Date(product.created_at).toLocaleDateString('ja-JP')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error case - type-safe error handling with pattern matching
  const error = result.error;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-red-800 mb-2">
          エラーが発生しました
        </h2>

        {error.type === 'NotFound' && (
          <div>
            <p className="text-red-700">商品が見つかりませんでした。</p>
            <p className="text-sm text-red-600 mt-2">
              商品ID: {error.productId}
            </p>
          </div>
        )}

        {error.type === 'InvalidPrice' && (
          <div>
            <p className="text-red-700">商品の価格が不正です。</p>
            <p className="text-sm text-red-600 mt-2">価格: ¥{error.price}</p>
          </div>
        )}

        {error.type === 'OutOfStock' && (
          <div>
            <p className="text-red-700">在庫が不足しています。</p>
            <p className="text-sm text-red-600 mt-2">
              商品ID: {error.productId}, リクエスト数: {error.requested}
            </p>
          </div>
        )}

        {error.type === 'NetworkError' && (
          <div>
            <p className="text-red-700">ネットワークエラーが発生しました。</p>
            <p className="text-sm text-red-600 mt-2">{error.message}</p>
          </div>
        )}

        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          再読み込み
        </button>
      </div>
    </div>
  );
}

/**
 * Alternative implementation using match pattern
 * More functional approach with neverthrow's match method
 */
export function ProductDetailWithMatch({ productId }: ProductDetailProps) {
  const [result, setResult] = useState<Result<Product, ProductError> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadProduct = async () => {
      setIsLoading(true);
      const productResult = await fetchProduct(productId);

      if (isMounted) {
        setResult(productResult);
        setIsLoading(false);
      }
    };

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  if (isLoading || !result) {
    return <div>Loading...</div>;
  }

  // Using neverthrow's match method for more functional style
  return result.match(
    // Success case
    (product) => (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold">{product.name}</h1>
        <p className="text-2xl text-green-600">¥{product.price.toLocaleString()}</p>
      </div>
    ),
    // Error case
    (error) => (
      <div className="text-red-600">
        {error.type === 'NotFound' && 'Product not found'}
        {error.type === 'NetworkError' && `Network error: ${error.message}`}
      </div>
    )
  );
}
