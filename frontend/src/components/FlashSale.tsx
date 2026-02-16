// src/components/FlashSale.tsx
// v2.3 - Popup modal + per-product countdown that AUTO-RESETS when it hits 0 (and resets when modal closes)

import React, { useEffect, useMemo, useState } from 'react';
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
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
}

type DealMap = Record<string, number>; // productId -> dealEndTs (ms)

const MIN_MINUTES = 3;
const MAX_MINUTES = 15;

function pseudoRandomFromId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 10000) / 10000; // 0..1
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
  const r = pseudoRandomFromId(productId + String(Date.now())); // slight variety on resets
  const minutesRaw = MIN_MINUTES + Math.round(r * (MAX_MINUTES - MIN_MINUTES));
  const minutes = clamp(minutesRaw, MIN_MINUTES, MAX_MINUTES);
  const secondsJitter = Math.floor(r * 59);
  return Date.now() + minutes * 60_000 + secondsJitter * 1000;
}

const FlashSale: React.FC<FlashSaleProps> = ({ isOpen, onClose, onAddToCart }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // ticking time
  const [now, setNow] = useState(Date.now());

  // deal end timestamps
  const [dealMap, setDealMap] = useState<DealMap>({});

  // lock body scroll + ESC close
  useEffect(() => {
    if (!isOpen) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  // tick "now"
  useEffect(() => {
    if (!isOpen) return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [isOpen]);

  // load products when modal opens (and reset timers on open)
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

        // RESET ALL TIMERS ON OPEN
        const fresh: DealMap = {};
        list.forEach((p) => {
          fresh[p._id] = generateExpiry(p._id);
        });
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

  // auto-reset timer when it expires (while modal is open)
  useEffect(() => {
    if (!isOpen) return;

    const t = window.setInterval(() => {
      setDealMap((prev) => {
        if (!prev || Object.keys(prev).length === 0) return prev;

        const next: DealMap = { ...prev };
        let changed = false;

        for (const productId of Object.keys(next)) {
          if (Date.now() >= next[productId]) {
            next[productId] = generateExpiry(productId); // ✅ AUTO RESET
            changed = true;
          }
        }

        return changed ? next : prev;
      });
    }, 1000);

    return () => window.clearInterval(t);
  }, [isOpen]);

  const dealInfoById = useMemo(() => {
    const map: Record<
      string,
      { remaining: number; label: string; isUrgent: boolean }
    > = {};

    products.forEach((p) => {
      const end = dealMap[p._id] || 0;
      const remaining = end - now;

      // remaining can go negative briefly, but auto-reset interval will refresh it
      const safeRemaining = Math.max(0, remaining);

      map[p._id] = {
        remaining: safeRemaining,
        label: `Ends in ${formatMMSS(safeRemaining)}`,
        isUrgent: safeRemaining > 0 && safeRemaining <= 60_000,
      };
    });

    return map;
  }, [products, dealMap, now]);

  const handleAdd = (product: Product) => {
    onAddToCart(product);
    setMessage(`${product.name} added to cart!`);
    setTimeout(() => setMessage(''), 2000);
  };

  const closeAndReset = () => {
    // optional: clear timers so next open is fresh
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
        <div className="flashsale-modal-header">
          <div>
            <h2 className="flashsale-title">Flash Sale</h2>
            <p className="flashsale-subtitle">Limited-time deals — grab them before they reset.</p>
          </div>
        </div>

        {message && <div className="success-message">{message}</div>}

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

                return (
                  <div key={product._id} className="product-card">
                    {discount > 0 && <div className="discount-badge">{discount}% OFF</div>}

                    {/* Countdown badge (always shows; auto-resets at 0) */}
                    {deal && (
                      <div className={`deal-timer ${deal.isUrgent ? 'urgent' : ''}`}>
                        {deal.label}
                      </div>
                    )}

                    <img
                      src={product.images?.[0] || 'https://via.placeholder.com/300x200'}
                      alt={product.name}
                      className="product-image"
                    />

                    <div className="product-info">
                      <h3 className="product-name">{product.name}</h3>

                      <div className="product-pricing">
                        <span className="current-price">${product.price.toFixed(2)}</span>
                        {product.compareAtPrice && (
                          <span className="original-price">${product.compareAtPrice.toFixed(2)}</span>
                        )}
                      </div>

                      {/* ✅ Removed stock text */}

                      <button
                        className="buy-button"
                        disabled={outOfStock}
                        onClick={() => handleAdd(product)}
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
