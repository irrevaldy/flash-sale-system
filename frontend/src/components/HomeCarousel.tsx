// src/components/HomeCarousel.tsx
// Standalone carousel grouped by category
// Fix: use native wheel listener with { passive: false } to allow preventDefault()

import{ useEffect, useRef } from 'react';
import './HomeCarousel.css';

type HomeProduct = {
  _id: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  images?: string[];
  category?: string;
};

// ── Category styles ──
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  electronics: { bg: '#dbeafe', text: '#1d4ed8' },
  fashion: { bg: '#fce7f3', text: '#be185d' },
  home: { bg: '#d1fae5', text: '#065f46' },
  sports: { bg: '#ffedd5', text: '#c2410c' },
  beauty: { bg: '#ede9fe', text: '#6d28d9' },
  books: { bg: '#fef9c3', text: '#92400e' },
  toys: { bg: '#fee2e2', text: '#b91c1c' },
  food: { bg: '#dcfce7', text: '#15803d' },
};

const CATEGORY_EMOJIS: Record<string, string> = {
  electronics: '⚡',
  fashion: '👗',
  home: '🏠',
  sports: '🏃',
  beauty: '💄',
  books: '📚',
  toys: '🎮',
  food: '🍎',
};

function getCategoryStyle(category: string) {
  const key = category?.toLowerCase();
  return CATEGORY_COLORS[key] || { bg: '#f3f4f6', text: '#374151' };
}

// ── Single category row ──
function CategoryCarousel({
  title,
  emoji,
  products,
  onView,
  onAddToCart,
}: {
  title: string;
  emoji: string;
  products: HomeProduct[];
  onView: (id: string) => void;
  onAddToCart: (p: HomeProduct) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  // ✅ FIX: native wheel listener with passive:false
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      const track = trackRef.current;
      if (!track) return;

      // If user is already scrolling horizontally (trackpad gesture), don't hijack it
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      const atLeft = track.scrollLeft <= 0;
      const atRight = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;

      // Convert vertical wheel to horizontal
      const dir = e.deltaY > 0 ? 1 : -1;

      // Tune this: higher = faster horizontal scroll per wheel gesture
      const SPEED = 1.6;

      // If we are at edges and user tries to go beyond, let the page scroll
      if ((dir < 0 && atLeft) || (dir > 0 && atRight)) return;

      e.preventDefault();
      track.scrollBy({ left: e.deltaY * SPEED, behavior: 'auto' });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      el.removeEventListener('wheel', handleWheel as EventListener);
    };
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    const el = trackRef.current;
    if (!el) return;
    // scroll by the full visible width (5 cards)
    el.scrollBy({
      left: dir === 'left' ? -el.offsetWidth : el.offsetWidth,
      behavior: 'smooth',
    });
  };

  if (!products.length) return null;

  return (
    <section className="hc-section">
      <div className="hc-section-header">
        <div className="hc-section-title-row">
          <span className="hc-section-emoji">{emoji}</span>
          <h2 className="hc-section-title">{title}</h2>
        </div>
        <div className="hc-scroll-btns">
          <button className="hc-scroll-btn" onClick={() => scroll('left')}>
            ‹
          </button>
          <button className="hc-scroll-btn" onClick={() => scroll('right')}>
            ›
          </button>
        </div>
      </div>

      {/* ❌ removed React onWheel to avoid passive warning */}
      <div ref={trackRef} className="hc-track">
        {products.map((p) => {
          const img =
            p.images?.[0] || 'https://via.placeholder.com/400x300?text=Product';
          const discount =
            p.compareAtPrice && p.compareAtPrice > p.price
              ? Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100)
              : 0;
          const catStyle = getCategoryStyle(p.category || '');

          return (
            <div key={p._id} className="hc-card">
              {discount > 0 && (
                <div className="hc-discount-badge">{discount}% OFF</div>
              )}

              <button
                type="button"
                className="hc-image-btn"
                onClick={() => onView(p._id)}
              >
                <img src={img} alt={p.name} className="hc-image" />
              </button>

              <div className="hc-card-body">
                <span
                  className="hc-category-badge"
                  style={{ backgroundColor: catStyle.bg, color: catStyle.text }}
                >
                  {p.category
                    ? p.category.charAt(0).toUpperCase() + p.category.slice(1)
                    : 'General'}
                </span>

                <div
                  className="hc-name"
                  title={p.name}
                  onClick={() => onView(p._id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onView(p._id);
                  }}
                >
                  {p.name}
                </div>

                <div className="hc-price-row">
                  <span className="hc-price">${Number(p.price).toFixed(2)}</span>
                  {p.compareAtPrice && p.compareAtPrice > p.price && (
                    <span className="hc-compare">
                      ${Number(p.compareAtPrice).toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="hc-actions">
                  <button className="hc-btn-view" onClick={() => onView(p._id)}>
                    View
                  </button>
                  <button className="hc-btn-add" onClick={() => onAddToCart(p)}>
                    + Cart
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Main export: groups products by category ──
export default function HomeCarousel({
  products,
  onView,
  onAddToCart,
}: {
  products: HomeProduct[];
  onView: (id: string) => void;
  onAddToCart: (p: HomeProduct) => void;
}) {
  if (!products.length) return null;

  const grouped = products.reduce<Record<string, HomeProduct[]>>((acc, p) => {
    const cat = p.category?.toLowerCase() || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const sections = Object.entries(grouped).map(([cat, items]) => ({
    cat,
    items: [...items].sort(() => Math.random() - 0.5),
  }));

  return (
    <div className="hc-wrapper">
      {sections.map(({ cat, items }) => (
        <CategoryCarousel
          key={cat}
          title={cat.charAt(0).toUpperCase() + cat.slice(1)}
          emoji={CATEGORY_EMOJIS[cat] || '🛍️'}
          products={items}
          onView={onView}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  );
}
