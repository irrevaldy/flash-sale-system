// src/pages/ProductDetailPage.tsx
// v2.1 - TSX fixed to match ProductDetailPage.css (pd-* classes)

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productApi } from '../services/api';
import './ProductDetailPage.css';

interface ProductDetailPageProps {
  onAddToCart?: (product: any) => void;
  user?: any;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ onAddToCart }) => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (productId) loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await productApi.getById(productId!);
      setProduct(data);
      setSelectedImage(0);
      setQuantity(1);
    } catch (err: any) {
      console.error('Error loading product:', err);
      setError('Product not found');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product || !onAddToCart) return;

    // current cart handler expects repeated calls
    for (let i = 0; i < quantity; i++) onAddToCart(product);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/cart');
  };

  const availableStock = Number(product?.inventory?.availableStock ?? 0);

  const increaseQuantity = () => {
    if (quantity < availableStock) setQuantity((q) => q + 1);
  };

  const decreaseQuantity = () => {
    if (quantity > 1) setQuantity((q) => q - 1);
  };

  if (loading) {
    return (
      <div className="product-detail-page">
        <div className="product-detail-container">
          <div className="pd-loading">
            <div className="pd-spinner" />
            <p>Loading product...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-detail-page">
        <div className="product-detail-container">
          <div className="pd-error">
            <h2>😕 Product Not Found</h2>
            <p>{error || 'The product you are looking for does not exist.'}</p>
            <button className="pd-btn-primary" onClick={() => navigate('/catalog')}>
              Back to Catalog
            </button>
          </div>
        </div>
      </div>
    );
  }

  const compareAtPrice = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  const price = Number(product.price ?? 0);

  const discount =
    compareAtPrice && compareAtPrice > 0
      ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
      : 0;

  const inStock = availableStock > 0;

  const images: string[] = Array.isArray(product.images) ? product.images : [];
  const mainImage = images[selectedImage] || 'https://via.placeholder.com/500';

  return (
    <div className="product-detail-page">
      <div className="product-detail-container">
        {/* Breadcrumb */}
        <div className="pd-breadcrumb">
          <button onClick={() => navigate('/catalog')}>Catalog</button>
          <span>›</span>
          <button onClick={() => navigate(`/catalog?category=${product.category}`)}>
            {product.category}
          </button>
          <span>›</span>
          <span>{product.name}</span>
        </div>

        {/* Main Content */}
        <div className="pd-content">
          {/* Left: Images */}
          <div className="pd-images">
            <div className="pd-main-image">
              <img src={mainImage} alt={product.name} />
              {discount > 0 && <div className="pd-discount-badge">{discount}% OFF</div>}
            </div>

            {images.length > 1 && (
              <div className="pd-thumbnails">
                {images.map((image: string, index: number) => (
                  <img
                    key={index}
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className={selectedImage === index ? 'active' : ''}
                    onClick={() => setSelectedImage(index)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Info */}
          <div className="pd-info">
            <div className="pd-header">
              <div className="pd-category">{product.category}</div>
              {product.brand && <div className="pd-brand">by {product.brand}</div>}
            </div>

            <h1 className="pd-title">{product.name}</h1>

            {/* Rating */}
            <div className="pd-rating">
              <div className="pd-stars">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={i < Math.round(product?.rating?.average ?? 0) ? 'pd-star-filled' : 'pd-star-empty'}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="pd-rating-text">
                {Number(product?.rating?.average ?? 0).toFixed(1)} ({Number(product?.rating?.count ?? 0)} reviews)
              </span>
            </div>

            {/* Pricing */}
            <div className="pd-pricing">
              <div className="pd-price-row">
                <span className="pd-current-price">${price.toFixed(2)}</span>
                {compareAtPrice != null && (
                  <span className="pd-compare-price">${compareAtPrice.toFixed(2)}</span>
                )}
              </div>

              {compareAtPrice != null && discount > 0 && (
                <div className="pd-savings">You save ${(compareAtPrice - price).toFixed(2)}</div>
              )}
            </div>

            {/* Stock Status */}
            <div className="pd-stock">
              {inStock ? (
                <>
                  <span className="pd-in-stock">✓ In Stock</span>
                  <span className="pd-stock-count">({availableStock} available)</span>
                </>
              ) : (
                <span className="pd-out-of-stock">Out of Stock</span>
              )}
            </div>

            {/* Description */}
            <div className="pd-description">
              <h3>Description</h3>
              <p>{product.description}</p>
            </div>

            {/* Specifications */}
            {Object.keys(product.specifications || {}).length > 0 && (
              <div className="pd-specs">
                <h3>Specifications</h3>
                <div className="pd-specs-grid">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="pd-spec-item">
                      <span className="pd-spec-label">{key}:</span>
                      <span className="pd-spec-value">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity & Actions */}
            {inStock && (
              <div className="pd-actions">
                <div className="pd-quantity-selector">
                  <label>Quantity:</label>
                  <div className="pd-quantity-controls">
                    <button onClick={decreaseQuantity} disabled={quantity <= 1}>
                      −
                    </button>
                    <span className="pd-quantity-display">{quantity}</span>
                    <button onClick={increaseQuantity} disabled={quantity >= availableStock}>
                      +
                    </button>
                  </div>
                </div>

                <div className="pd-action-buttons">
                  <button className="pd-btn-add-to-cart" onClick={handleAddToCart}>
                    🛒 Add to Cart
                  </button>
                  <button className="pd-btn-buy-now" onClick={handleBuyNow}>
                    Buy Now
                  </button>
                </div>
              </div>
            )}

            {/* Meta */}
            <div className="pd-meta">
              <div className="pd-meta-item">
                <strong>SKU:</strong> {product.sku}
              </div>

              {Array.isArray(product.tags) && product.tags.length > 0 && (
                <div className="pd-meta-item">
                  <strong>Tags:</strong>
                  <div className="pd-tags">
                    {product.tags.map((tag: string, index: number) => (
                      <span key={index} className="pd-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related */}
        <div className="pd-related">
          <h2>You May Also Like</h2>
          <p className="text-muted">Check out similar products in the {product.category} category</p>
          <button
            className="pd-btn-secondary"
            onClick={() => navigate(`/catalog?category=${product.category}`)}
          >
            Browse {product.category}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
