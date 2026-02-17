// src/components/FlashSale.tsx
// v3.0 - Single product, real purchase flow, enforced rules

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { flashSaleApi } from '../services/api';
import './FlashSale.css';

interface FlashSaleProduct {
  _id: string;
  name: string;
  images: string[];
  category?: string;
  originalPrice: number;
  flashPrice: number;
}

interface SaleStatus {
  status: 'upcoming' | 'active' | 'ended';
  startTime: string;
  endTime: string;
  totalStock: number;
  remaining: number;
  soldOut: boolean;
  flashPrice: number;
  product: FlashSaleProduct | null;
}

interface FlashSaleProps {
  isOpen: boolean;
  onClose: () => void;
  user: any; // logged-in user from App.tsx
}

// ── Countdown timer ──
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
    formatted: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
  };
}

const FlashSale: React.FC<FlashSaleProps> = ({ isOpen, onClose, user }) => {
  const navigate = useNavigate();

  const [saleStatus, setSaleStatus] = useState<SaleStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [purchasedAt, setPurchasedAt] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Countdown targets
  const startCountdown = useCountdown(
    saleStatus?.status === 'upcoming' ? saleStatus.startTime : null
  );
  const endCountdown = useCountdown(
    saleStatus?.status === 'active' ? saleStatus.endTime : null
  );

  // Lock body scroll + ESC
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  // Load status when modal opens
  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      const data = await flashSaleApi.getStatus();
      setSaleStatus(data);

      // Check if logged-in user already purchased
      if (user?.email) {
        const check = await flashSaleApi.checkPurchase(user.email);
        setHasPurchased(check.hasPurchased);
        if (check.purchase?.purchasedAt) setPurchasedAt(check.purchase.purchasedAt);
      }
    } catch (err) {
      console.error('Failed to load flash sale status', err);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    if (!isOpen) return;
    loadStatus();

    // Poll every 10s to keep stock count fresh
    const t = setInterval(loadStatus, 10_000);
    return () => clearInterval(t);
  }, [isOpen, loadStatus]);

  const handleBuy = async () => {
    if (!user?.email) {
      onClose();
      navigate('/login');
      return;
    }

    setPurchasing(true);
    setFeedback(null);

    try {
      const result = await flashSaleApi.reserve(user.email);

      if (result.success) {
        const product = saleStatus!.product!;
        onClose();
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

  if (!isOpen) return null;

  const product = saleStatus?.product;
  const discount = product
    ? Math.round(((product.originalPrice - product.flashPrice) / product.originalPrice) * 100)
    : 0;
  const stockPercent = saleStatus
    ? Math.round((saleStatus.remaining / saleStatus.totalStock) * 100)
    : 100;

  return (
    <div className="flashsale-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="flashsale-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* ── Header ── */}
        <div className="flashsale-modal-header">
          <div>
            <h2 className="flashsale-title">⚡ Flash Sale</h2>
            {saleStatus?.status === 'active' && (
              <p className="flashsale-subtitle">
                Ends in <strong className="fs-countdown">{endCountdown.formatted}</strong>
              </p>
            )}
            {saleStatus?.status === 'upcoming' && (
              <p className="flashsale-subtitle">
                Starts in <strong className="fs-countdown">{startCountdown.formatted}</strong>
              </p>
            )}
            {saleStatus?.status === 'ended' && (
              <p className="flashsale-subtitle">This sale has ended.</p>
            )}
          </div>
          <button className="flashsale-close" onClick={onClose}>✕</button>
        </div>

        {/* ── Status banner ── */}
        {saleStatus && (
          <div className={`fs-status-banner fs-status-${saleStatus.status}`}>
            {saleStatus.status === 'upcoming' && '🕐 Sale not started yet'}
            {saleStatus.status === 'active'   && '🟢 Sale is LIVE now!'}
            {saleStatus.status === 'ended'    && '🔴 Sale has ended'}
          </div>
        )}

        {/* ── Feedback message ── */}
        {feedback && (
          <div className={`fs-feedback fs-feedback-${feedback.type}`}>
            {feedback.message}
          </div>
        )}

        <div className="flashsale-modal-body">
          {loading && !saleStatus && (
            <div className="fs-loading">Loading sale info...</div>
          )}

          {saleStatus && product && (
            <div className="fs-product-card">
              {/* Image */}
              <div className="fs-product-image-wrap">
                {discount > 0 && (
                  <div className="fs-product-discount">{discount}% OFF</div>
                )}
                <img
                  src={product.images?.[0] || 'https://via.placeholder.com/400x300'}
                  alt={product.name}
                  className="fs-product-image"
                  onClick={() => { onClose(); navigate(`/products/${product._id}`); }}
                />
              </div>

              {/* Info */}
              <div className="fs-product-info">
                {product.category && (
                  <span className="fs-product-category">{product.category}</span>
                )}
                <h3 className="fs-product-name">{product.name}</h3>

                <div className="fs-product-pricing">
                  <span className="fs-flash-price">${saleStatus.flashPrice.toFixed(2)}</span>
                  {product.originalPrice > saleStatus.flashPrice && (
                    <span className="fs-original-price">${product.originalPrice.toFixed(2)}</span>
                  )}
                </div>

                {/* Stock bar */}
                <div className="fs-stock-section">
                  <div className="fs-stock-label">
                    <span>
                      {saleStatus.soldOut
                        ? '😔 Sold out'
                        : `${saleStatus.remaining} of ${saleStatus.totalStock} remaining`}
                    </span>
                    <span className="fs-stock-pct">{stockPercent}%</span>
                  </div>
                  <div className="fs-stock-bar">
                    <div
                      className={`fs-stock-fill ${stockPercent <= 20 ? 'critical' : stockPercent <= 50 ? 'low' : ''}`}
                      style={{ width: `${stockPercent}%` }}
                    />
                  </div>
                </div>

                {/* Rules */}
                <div className="fs-rules">
                  <span>⚡ One item per user</span>
                  <span>🔒 Verified purchases only</span>
                </div>

                {/* Buy button */}
                {hasPurchased ? (
                  <div className="fs-already-purchased">
                    ✅ You secured this item!
                    {purchasedAt && (
                      <span className="fs-purchased-at">
                        {new Date(purchasedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                ) : (
                  <button
                    className="fs-buy-btn"
                    onClick={handleBuy}
                    disabled={
                      purchasing ||
                      saleStatus.status !== 'active' ||
                      saleStatus.soldOut
                    }
                  >
                    {purchasing
                      ? 'Processing...'
                      : saleStatus.status === 'upcoming'
                      ? '⏳ Sale Not Started'
                      : saleStatus.status === 'ended'
                      ? '❌ Sale Ended'
                      : saleStatus.soldOut
                      ? '😔 Sold Out'
                      : !user
                      ? '🔑 Login to Buy'
                      : '⚡ Buy Now'}
                  </button>
                )}

                {!user && saleStatus.status === 'active' && !hasPurchased && (
                  <p className="fs-login-hint">
                    <button className="btn-link" onClick={() => { onClose(); navigate('/login'); }}>
                      Login
                    </button>{' '}
                    or{' '}
                    <button className="btn-link" onClick={() => { onClose(); navigate('/register'); }}>
                      Register
                    </button>{' '}
                    to participate
                  </p>
                )}
              </div>
            </div>
          )}

          {saleStatus && !product && (
            <div className="fs-loading">No product configured for this sale.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlashSale;
