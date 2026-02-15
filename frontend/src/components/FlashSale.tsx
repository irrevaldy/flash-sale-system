import { useState, useEffect } from 'react';
import { productApi } from '../services/api';
import './FlashSale.css';

interface Product {
  _id: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  inventory: {
    availableStock: number;
  };
}

interface FlashSaleProps {
  userId?: string;
  onAddToCart: (product: Product) => void; // required now
}

const FlashSale: React.FC<FlashSaleProps> = ({ onAddToCart }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productApi.getAll({ limit: 10 });
      setProducts(data.products || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = (product: Product) => {
    onAddToCart(product); // 1️⃣ Update App cart state immediately
    setMessage(`${product.name} added to cart!`); // show toast
    setTimeout(() => setMessage(''), 2500);
  };

  if (loading) return <div className="flash-sale-container"><p className="loading">Loading products...</p></div>;
  if (error && !message) return <div className="flash-sale-container"><p className="error-message">{error}</p></div>;

  return (
    <section className="flash-sale-container">
      <div className="flash-sale-header">
        <h2>⚡ Flash Sale</h2>
        <p>Grab limited-time deals on featured products!</p>
      </div>

      {message && <div className="success-message">{message}</div>}

      <div className="products-grid">
        {products.length === 0 && <div className="empty-state">No products available at the moment.</div>}

        {products.map(product => {
          const discount = product.compareAtPrice
            ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
            : 0;

          return (
            <div key={product._id} className="product-card">
              {discount > 0 && <div className="discount-badge">{discount}% OFF</div>}

              <img
                src={product.images[0] || 'https://via.placeholder.com/300x200'}
                alt={product.name}
                className="product-image"
              />

              <div className="product-info">
                <h3 className="product-name">{product.name}</h3>

                <div className="product-pricing">
                  <span className="current-price">${product.price.toFixed(2)}</span>
                  {product.compareAtPrice && <span className="original-price">${product.compareAtPrice.toFixed(2)}</span>}
                </div>

                <div className={`product-stock ${product.inventory.availableStock === 0 ? 'out' : 'in'}`}>
                  {product.inventory.availableStock > 0
                    ? `✓ ${product.inventory.availableStock} in stock`
                    : 'Sold Out'}
                </div>

                <button
                  className="buy-button"
                  disabled={product.inventory.availableStock === 0}
                  onClick={() => handlePurchase(product)}
                >
                  {product.inventory.availableStock > 0 ? '🛒 Add to Cart' : 'Out of Stock'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default FlashSale;
