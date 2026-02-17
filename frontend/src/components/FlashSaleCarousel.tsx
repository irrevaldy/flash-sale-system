// src/components/FlashSaleCarousel.tsx
// Horizontal carousel on home page using same flash sale products + per-card countdown

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productApi } from '../services/api';
import './FlashSaleCarousel.css';

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

function generateExpiry(productId: string) {
  const r = pseudoRandomFromId(productId + String(Date.now()));
  const minutes = MIN_MINUTES + Math.round(r * (MAX_MINUTES - MIN_MINUTES));
  const secondsJitter = Math.floor(r * 59);
  return Date.now() + minutes * 60_000 + secondsJitter * 1000;
}

function formatMMSS(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function FlashSaleCarousel({
  onAddToCart,
}: {
  onAddToCart: (product: any) => void;
}) {
  const navigate = useNavigate();
  const trackRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [dealMap, setDealMap] = useState<DealMap>({});

  // Load products
  useEffect(() => {
    const load = async () => {
      try {
        const data = await productApi.getAll({ limit: 10 });
        const list: Product[] = data.products || [];
        setProducts(list);
        const fresh: DealMap = {};
        list.forEach((p) => { fresh[p._id] = generateExpiry(p._id); });
        setDealMap(fresh);
      } catch (e) {
        console.error('Failed to load flash sale carousel', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Tick clock
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);

  // Auto-reset expired timers
  useEffect(() => {
    const t = window.setInterval(() => {
      setDealMap((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const id of Object.keys(next)) {
          if (Date.now() >= next[id]) {
            next[id] = generateExpiry(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  // Compute timer labels
  const dealInfoById = useMemo(() => {
    const map: Record<string, { label: string; isUrgent: boolean }> = {};
    products.forEach((p) => {
      const remaining = Math.max(0, (dealMap[p._id] || 0) - now);
      map[p._id] = {
        label: formatMMSS(remaining),
        isUrgent: remaining > 0 && remaining <= 60_000,
      };
    });
    return map;
  }, [products, dealMap, now]);

  const scroll = (dir: 'left' | 'right') => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -el.offsetWidth : el.offsetWidth, behavior: 'smooth' });
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!el) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (delta === 0) return;
    e.preventDefault();
    el.scrollLeft += delta;
  };

  if (loading || !products.length) return null;

  return (
    <section className="fsc-section">
      <div className="fsc-header">
        <div className="fsc-title-row">
          <span className="fsc-lightning">⚡</span>
          <h2 className="fsc-title">Flash Sale</h2>
          <span className="fsc-live-badge">LIVE</span>
        </div>
        <div className="fsc-scroll-btns">
          <button className="fsc-scroll-btn" onClick={() => scroll('left')}>‹</button>
          <button className="fsc-scroll-btn" onClick={() => scroll('right')}>›</button>
        </div>
      </div>

      <div ref={trackRef} className="fsc-track" onWheel={onWheel}>
        {products.map((product) => {
          const discount = product.compareAtPrice
            ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
            : 0;
          const outOfStock = product.inventory.availableStock === 0;
          const catStyle = getCategoryStyle(product.category);
          const img = product.images?.[0] || 'https://via.placeholder.com/300x200';
          const deal = dealInfoById[product._id];

          return (
            <div
              key={product._id}
              className="fsc-card"
              onClick={() => navigate(`/products/${product._id}`)}
            >
              {/* Discount badge */}
              {discount > 0 && (
                <div className="fsc-discount-badge">{discount}% OFF</div>
              )}

              {/* Countdown timer */}
              {deal && (
                <div className={`fsc-timer ${deal.isUrgent ? 'urgent' : ''}`}>
                  ⏱ {deal.label}
                </div>
              )}

              {/* Image */}
              <div className="fsc-image-wrap">
                <img src={img} alt={product.name} className="fsc-image" />
              </div>

              {/* Body */}
              <div className="fsc-card-body">
                {product.category && (
                  <span
                    className="fsc-category-badge"
                    style={{ backgroundColor: catStyle.bg, color: catStyle.text }}
                  >
                    {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
                  </span>
                )}

                <div className="fsc-name" title={product.name}>{product.name}</div>

                <div className="fsc-price-row">
                  <span className="fsc-price">${product.price.toFixed(2)}</span>
                  {product.compareAtPrice && product.compareAtPrice > product.price && (
                    <span className="fsc-compare">${product.compareAtPrice.toFixed(2)}</span>
                  )}
                </div>

                <button
                  className="fsc-btn-add"
                  disabled={outOfStock}
                  onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
                >
                  {outOfStock ? 'Out of Stock' : '🛒 Add to Cart'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
