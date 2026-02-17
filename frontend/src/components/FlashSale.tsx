// src/components/FlashSale.tsx
// v2.4 - Added category badges + click to navigate to product detail

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productApi } from '../services/api';
import './FlashSale.css';

interface Product {
  _id: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  category?: string;
  inventory: {
    availableStock: number;
  };
}

interface FlashSaleProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
}

type DealMap = Record<string, number>;

const MIN_MINUTES = 3;
const MAX_MINUTES = 15;

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  electronics: { bg: '#dbeafe', text: '#1d4ed8' },
  fashion:     { bg: '#fce7f3', text: '#be185d' },
  home:        { bg: '#d1fae5', text: '#065f46' },
  sports:      { bg: '#ffedd5', text: '#c2410c' },
  beauty:      { bg: '#ede9fe', text: '#6d28d9' },
  books:       { bg: '#fef9c3', text: '#92400e' },
  toys:        { bg: '#fee2e2', text: '#b91c1c' },
  food:        { bg: '#dcfce7', text: '#15803d' },
};

function getCategoryStyle(category?: string) {
  const key = category?.toLowerCase() || '';
  return CATEGORY_COLORS[key] || { bg: '#f3f4f6', text: '#374151' };
}

function pseudoRandomFromId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 10000) / 10000;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatMMSS(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function generateExpiry(productId: string) {
  const r = pseudoRandomFromId(productId + String(Date.now()));
  const minutesRaw = MIN_MINUTES + Math.round(r * (MAX_MINUTES - MIN_MINUTES));
  const minutes = clamp(minutesRaw, MIN_MINUTES, MAX_MINUTES);
  const secondsJitter = Math.floor(r * 59);
  return Date.now() + minutes * 60_000 + secondsJitter * 1000;
}

const FlashSale: React.FC<FlashSaleProps> = ({ isOpen, onClose, onAddToCart }) => {
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(Date.now());
  const [dealMap, setDealMap] = useState<DealMap>({});

  // Lock body scroll + ESC close
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  // Tick now
  useEffect(() => {
    if (!isOpen) return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [isOpen]);

  // Load products on open
  useEffect(() => {
    if (!isOpen) return;
    const loadProducts = async () => {
      try {
        setError('');
        setMessage('');
        setLoading(true);
        const data = await productApi.getAll({ limit: 10 });
        const list: Product[] = data.products || [];
        setProducts(list);
        const fresh: DealMap = {};
        list.forEach((p) => { fresh[p._id] = generateExpiry(p._id); });
        setDealMap(fresh);
      } catch (err) {
        console.error(err);
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, [isOpen]);

  // Auto-reset expired timers
  useEffect(() => {
    if (!isOpen) return;
    const t = window.setInterval(() => {
      setDealMap((prev) => {
        if (!prev || Object.keys(prev).length === 0) return prev;
        const next: DealMap = { ...prev };
        let changed = false;
        for (const productId of Object.keys(next)) {
          if (Date.now() >= next[productId]) {
            next[productId] = generateExpiry(productId);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [isOpen]);

  const dealInfoById = useMemo(() => {
    const map: Record<string, { remaining: number; label: string; isUrgent: boolean }> = {};
    products.forEach((p) => {
      const end = dealMap[p._id] || 0;
      const safeRemaining = Math.max(0, end - now);
      map[p._id] = {
        remaining: safeRemaining,
        label: `${formatMMSS(safeRemaining)}`,
        isUrgent: safeRemaining > 0 && safeRemaining <= 60_000,
      };
    });
    return map;
  }, [products, dealMap, now]);

  const handleAdd = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation(); // don't navigate when clicking Add to Cart
    onAddToCart(product);
    setMessage(`${product.name} added to cart!`);
    setTimeout(() => setMessage(''), 2000);
  };

  const handleCardClick = (product: Product) => {
    onClose();
    navigate(`/products/${product._id}`);
  };

  const closeAndReset = () => {
    setDealMap({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="flashsale-modal-overlay" onClick={closeAndReset} role="presentation">
      <div
        className="flashsale-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Flash sale popup"
      >
        {/* Header */}
        <div className="flashsale-modal-header">
          <div>
            <h2 className="flashsale-title">⚡ Flash Sale</h2>
            <p className="flashsale-subtitle">Limited-time deals — grab them before they reset.</p>
          </div>
          <button className="flashsale-close" onClick={closeAndReset} aria-label="Close">✕</button>
        </div>

        {message && <div className="success-message">{message}</div>}

        {/* Body */}
        <div className="flashsale-modal-body">
          {loading && <p className="loading">Loading products...</p>}
          {!loading && error && <p className="error-message">{error}</p>}

          {!loading && !error && (
            <div className="products-grid">
              {products.length === 0 && (
                <div className="empty-state">No products available at the moment.</div>
              )}

              {products.map((product) => {
                const discount = product.compareAtPrice
                  ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
                  : 0;
                const outOfStock = product.inventory.availableStock === 0;
                const deal = dealInfoById[product._id];
                const catStyle = getCategoryStyle(product.category);

                return (
                  <div
                    key={product._id}
                    className="product-card"
                    onClick={() => handleCardClick(product)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Discount badge */}
                    {discount > 0 && (
                      <div className="discount-badge">{discount}% OFF</div>
                    )}

                    {/* Countdown timer */}
                    {deal && (
                      <div className={`deal-timer ${deal.isUrgent ? 'urgent' : ''}`}>
                        ⏱ {deal.label}
                      </div>
                    )}

                    {/* Image */}
                    <img
                      src={product.images?.[0] || 'https://via.placeholder.com/300x200'}
                      alt={product.name}
                      className="product-image"
                    />

                    <div className="product-info">
                      {/* Category badge */}
                      {product.category && (
                        <span
                          className="fs-category-badge"
                          style={{ backgroundColor: catStyle.bg, color: catStyle.text }}
                        >
                          {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
                        </span>
                      )}

                      <h3 className="product-name">{product.name}</h3>

                      <div className="product-pricing">
                        <span className="current-price">${product.price.toFixed(2)}</span>
                        {product.compareAtPrice && (
                          <span className="original-price">${product.compareAtPrice.toFixed(2)}</span>
                        )}
                      </div>

                      <button
                        className="buy-button"
                        disabled={outOfStock}
                        onClick={(e) => handleAdd(e, product)}
                      >
                        {outOfStock ? 'Out of Stock' : '🛒 Add to Cart'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlashSale;
