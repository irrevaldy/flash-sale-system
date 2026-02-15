// src/components/FlashSale.tsx

import { useState, useEffect, useCallback } from 'react';
import { saleApi } from '../services/api';
import './FlashSale.css';

// Types
interface SaleStatus {
  status: 'upcoming' | 'active' | 'ended' | 'sold_out';
  startTime: string;
  endTime: string;
  totalStock: number;
  remainingStock: number;
  productName: string;
}

interface PurchaseResponse {
  success: boolean;
  message: string;
  remainingStock?: number;
}

const FlashSale = () => {
  const [saleStatus, setSaleStatus] = useState<SaleStatus | null>(null);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [hasPurchased, setHasPurchased] = useState(false);

  // Fetch sale status
  const fetchStatus = useCallback(async () => {
    try {
      const status = await saleApi.getStatus();
      setSaleStatus(status);
    } catch (error) {
      console.error('Failed to fetch sale status:', error);
      setMessage('Failed to load sale information');
      setMessageType('error');
    }
  }, []);

  // Check if user has purchased
  const checkPurchase = useCallback(async () => {
    if (!userId) return;
    
    try {
      const purchaseStatus = await saleApi.checkUserPurchase(userId);
      setHasPurchased(purchaseStatus.hasPurchased);
    } catch (error) {
      console.error('Failed to check purchase status:', error);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Check purchase status when userId changes
  useEffect(() => {
    if (userId) {
      checkPurchase();
    }
  }, [userId, checkPurchase]);

  const handlePurchase = async () => {
    if (!userId.trim()) {
      setMessage('Please enter your email or username');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response: PurchaseResponse = await saleApi.purchase(userId);
      
      if (response.success) {
        setMessage(response.message);
        setMessageType('success');
        setHasPurchased(true);
        fetchStatus(); // Refresh status
      } else {
        setMessage(response.message);
        setMessageType('error');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Purchase failed. Please try again.';
      setMessage(errorMessage);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!saleStatus) return null;

    const badges = {
      upcoming: { text: 'Coming Soon', className: 'badge-upcoming' },
      active: { text: 'Live Now!', className: 'badge-active' },
      ended: { text: 'Ended', className: 'badge-ended' },
      sold_out: { text: 'Sold Out', className: 'badge-sold-out' },
    };

    const badge = badges[saleStatus.status];
    return <span className={`status-badge ${badge.className}`}>{badge.text}</span>;
  };

  const getProgressPercentage = () => {
    if (!saleStatus) return 0;
    return ((saleStatus.totalStock - saleStatus.remainingStock) / saleStatus.totalStock) * 100;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const canPurchase = saleStatus?.status === 'active' && !hasPurchased;

  return (
    <div className="flash-sale-container">
      <div className="flash-sale-card">
        <div className="card-header">
          <h1>⚡ Flash Sale</h1>
          {getStatusBadge()}
        </div>

        {saleStatus && (
          <>
            <div className="product-info">
              <h2>{saleStatus.productName}</h2>
              <p className="product-description">
                Limited stock available. One per customer. First come, first served!
              </p>
            </div>

            <div className="stock-info">
              <div className="stock-numbers">
                <div className="stock-item">
                  <span className="stock-label">Total Stock:</span>
                  <span className="stock-value">{saleStatus.totalStock}</span>
                </div>
                <div className="stock-item">
                  <span className="stock-label">Remaining:</span>
                  <span className="stock-value highlight">{saleStatus.remainingStock}</span>
                </div>
              </div>
              
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
              <p className="progress-text">
                {saleStatus.totalStock - saleStatus.remainingStock} of {saleStatus.totalStock} sold
              </p>
            </div>

            <div className="time-info">
              <div className="time-item">
                <span className="time-label">Start:</span>
                <span className="time-value">{formatDate(saleStatus.startTime)}</span>
              </div>
              <div className="time-item">
                <span className="time-label">End:</span>
                <span className="time-value">{formatDate(saleStatus.endTime)}</span>
              </div>
            </div>

            <div className="purchase-section">
              <input
                type="text"
                placeholder="Enter your email or username"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={!canPurchase || loading}
                className="user-input"
              />
              
              <button
                onClick={handlePurchase}
                disabled={!canPurchase || loading}
                className={`purchase-button ${!canPurchase ? 'disabled' : ''}`}
              >
                {loading ? 'Processing...' : hasPurchased ? 'Already Purchased' : 'Buy Now'}
              </button>

              {message && (
                <div className={`message ${messageType}`}>
                  {message}
                </div>
              )}
            </div>

            {hasPurchased && (
              <div className="success-banner">
                ✅ You have successfully purchased this item!
              </div>
            )}
          </>
        )}

        {!saleStatus && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading sale information...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashSale;
