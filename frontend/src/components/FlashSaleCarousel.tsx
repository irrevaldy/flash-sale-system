// src/components/FlashSaleCarousel.tsx
// v2.0 - Single product, real sale end time, matches FlashSale popup

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { flashSaleApi } from '../services/api';
import './FlashSaleCarousel.css';

interface SaleStatus {
  status: 'upcoming' | 'active' | 'ended';
  startTime: string;
  endTime: string;
  totalStock: number;
  remaining: number;
  soldOut: boolean;
  flashPrice: number;
  product: {
    _id: string;
    name: string;
    images: string[];
    category?: string;
    originalPrice: number;
    flashPrice: number;
  } | null;
}

function useCountdown(targetTime: string | null) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!targetTime) return;
    const update = () => setTimeLeft(Math.max(0, new Date(targetTime).getTime() - Date.now()));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [targetTime]);

  const h = Math.floor(timeLeft / 3_600_000);
  const m = Math.floor((timeLeft % 3_600_000) / 60_000);
  const s = Math.floor((timeLeft % 60_000) / 1000);

  return {
    timeLeft,
    isUrgent: timeLeft > 0 && timeLeft <= 60_000,
    formatted: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
  };
}

export default function FlashSaleCarousel({
  user,
}: {
  user: any;
}) {
  const navigate = useNavigate();
  const [saleStatus, setSaleStatus] = useState<SaleStatus | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const endCountdown   = useCountdown(saleStatus?.status === 'active'   ? saleStatus.endTime   : null);
  const startCountdown = useCountdown(saleStatus?.status === 'upcoming' ? saleStatus.startTime : null);

  const loadStatus = useCallback(async () => {
    try {
      const data = await flashSaleApi.getStatus();
      setSaleStatus(data);
      if (user?.email) {
        const check = await flashSaleApi.checkPurchase(user.email);
        setHasPurchased(check.hasPurchased);
      }
    } catch (e) {
      console.error('Failed to load flash sale status', e);
    }
  }, [user?.email]);

  useEffect(() => {
    loadStatus();
    const t = setInterval(loadStatus, 10_000);
    return () => clearInterval(t);
  }, [loadStatus]);

  const handleBuy = async () => {
    if (!user?.email) { navigate('/login'); return; }

    setPurchasing(true);
    setFeedback(null);

    try {
      const result = await flashSaleApi.reserve(user.email);

      if (result.success) {
        const product = saleStatus!.product!;
        // Pass the flash sale item via navigation state so App.tsx can inject it into cart
        navigate('/checkout?flashSale=true', {
          state: {
            flashSaleItem: {
              _id:         product._id,
              name:        product.name,
              price:       saleStatus!.flashPrice,
              images:      product.images,
              quantity:    1,
              isFlashSale: true,
            },
          },
        });
      }
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.alreadyPurchased) {
        setHasPurchased(true);
        setFeedback({ type: 'error', message: 'You have already purchased this item.' });
      } else if (data?.soldOut) {
        setFeedback({ type: 'error', message: 'Sold out! All items have been claimed.' });
        loadStatus();
      } else {
        setFeedback({ type: 'error', message: data?.error || 'Could not reserve item. Try again.' });
      }
    } finally {
      setPurchasing(false);
    }
  };

  if (!saleStatus || !saleStatus.product) return null;
  if (saleStatus.status === 'ended') return null;

  const product  = saleStatus.product;
  const discount = product.originalPrice > product.flashPrice
    ? Math.round(((product.originalPrice - product.flashPrice) / product.originalPrice) * 100)
    : 0;
  const stockPct = Math.round((saleStatus.remaining / saleStatus.totalStock) * 100);
  const img      = product.images?.[0] || 'https://via.placeholder.com/400x300';

  return (
    <section className="fsc-section">
      {/* Header */}
      <div className="fsc-header">
        <div className="fsc-title-row">
          <span className="fsc-lightning">⚡</span>
          <h2 className="fsc-title">Flash Sale</h2>
          {saleStatus.status === 'active'   && <span className="fsc-live-badge">LIVE</span>}
          {saleStatus.status === 'upcoming' && <span className="fsc-upcoming-badge">UPCOMING</span>}
        </div>

        {saleStatus.status === 'active' && (
          <div className={`fsc-countdown ${endCountdown.isUrgent ? 'urgent' : ''}`}>
            ⏱ Ends in <strong>{endCountdown.formatted}</strong>
          </div>
        )}
        {saleStatus.status === 'upcoming' && (
          <div className="fsc-countdown upcoming">
            🕐 Starts in <strong>{startCountdown.formatted}</strong>
          </div>
        )}
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`fsc-feedback fsc-feedback-${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      {/* Single product card */}
      <div className="fsc-single-card">
        {/* Image */}
        <div className="fsc-single-image-wrap" onClick={() => navigate(`/products/${product._id}`)}>
          {discount > 0 && <div className="fsc-discount-badge">{discount}% OFF</div>}
          <img src={img} alt={product.name} className="fsc-single-image" />
        </div>

        {/* Info */}
        <div className="fsc-single-info">
          {product.category && (
            <span className="fsc-category-badge">
              {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
            </span>
          )}

          <div className="fsc-single-name" onClick={() => navigate(`/products/${product._id}`)}>
            {product.name}
          </div>

          <div className="fsc-single-pricing">
            <span className="fsc-flash-price">${saleStatus.flashPrice.toFixed(2)}</span>
            {product.originalPrice > saleStatus.flashPrice && (
              <span className="fsc-compare">${product.originalPrice.toFixed(2)}</span>
            )}
          </div>

          {/* Stock bar */}
          <div className="fsc-stock-section">
            <div className="fsc-stock-label">
              <span>
                {saleStatus.soldOut
                  ? '😔 Sold out'
                  : `${saleStatus.remaining} of ${saleStatus.totalStock} remaining`}
              </span>
              <span>{stockPct}%</span>
            </div>
            <div className="fsc-stock-bar">
              <div
                className={`fsc-stock-fill ${stockPct <= 20 ? 'critical' : stockPct <= 50 ? 'low' : ''}`}
                style={{ width: `${stockPct}%` }}
              />
            </div>
          </div>

          <div className="fsc-rules">
            <span>⚡ One item per user</span>
            <span>🔒 Verified purchases only</span>
          </div>

          {hasPurchased ? (
            <div className="fsc-already-purchased">✅ You secured this item!</div>
          ) : (
            <button
              className="fsc-buy-btn"
              onClick={handleBuy}
              disabled={purchasing || saleStatus.status !== 'active' || saleStatus.soldOut}
            >
              {purchasing
                ? 'Processing...'
                : saleStatus.status === 'upcoming' ? '⏳ Sale Not Started'
                : saleStatus.soldOut              ? '😔 Sold Out'
                : !user                           ? '🔑 Login to Buy'
                : '⚡ Buy Now'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
