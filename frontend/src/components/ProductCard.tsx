// src/components/ProductCard.tsx

import React from 'react';
import './ProductCard.css';

interface ProductCardProps {
  product: {
    _id: string;
    sku: string;
    name: string;
    description: string;
    price: number;
    compareAtPrice?: number;
    images: string[];
    category: string;
    rating: {
      average: number;
      count: number;
    };
    inventory: {
      availableStock: number;
    };
  };
  onAddToCart?: (product: any) => void;
  onViewDetails?: (productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onViewDetails,
}) => {
  const discountPercentage = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  const inStock = product.inventory.availableStock > 0;

  return (
    <div className="product-card">
      {discountPercentage > 0 && (
        <div className="product-badge">{discountPercentage}% OFF</div>
      )}

      <div className="product-image-container">
        <img
          src={product.images[0] || 'https://via.placeholder.com/300x200?text=No+Image'}
          alt={product.name}
          className="product-image"
          onClick={() => onViewDetails?.(product._id)}
        />
      </div>

      <div className="product-info">
        <div className="product-category">{product.category}</div>
        
        <h3 className="product-name" onClick={() => onViewDetails?.(product._id)}>
          {product.name}
        </h3>

        <p className="product-description">
          {product.description.substring(0, 80)}...
        </p>

        <div className="product-rating">
          <div className="stars">
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className={i < Math.round(product.rating.average) ? 'star-filled' : 'star-empty'}
              >
                ★
              </span>
            ))}
          </div>
          <span className="rating-count">({product.rating.count})</span>
        </div>

        <div className="product-pricing">
          <div className="price-row">
            <span className="current-price">${product.price.toFixed(2)}</span>
            {product.compareAtPrice && (
              <span className="compare-price">${product.compareAtPrice.toFixed(2)}</span>
            )}
          </div>
        </div>

        <div className="product-stock">
          {inStock ? (
            <span className="in-stock">✓ In Stock ({product.inventory.availableStock})</span>
          ) : (
            <span className="out-of-stock">Out of Stock</span>
          )}
        </div>

        <div className="product-actions">
          <button
            className="btn-view-details"
            onClick={() => onViewDetails?.(product._id)}
          >
            View Details
          </button>
          <button
            className="btn-add-to-cart"
            onClick={() => onAddToCart?.(product)}
            disabled={!inStock}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};
