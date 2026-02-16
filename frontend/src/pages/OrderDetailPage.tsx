// src/pages/OrderDetailPage.tsx
// v2.0 - Complete order detail page

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderApi } from '../services/api';
import './OrderDetailPage.css';

interface OrderDetailPageProps {
  user: any;
}

export const OrderDetailPage: React.FC<OrderDetailPageProps> = ({ user }) => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (orderNumber) {
      loadOrder();
    }
  }, [orderNumber, user]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const data = await orderApi.getByOrderNumber(orderNumber!);
      setOrder(data);
    } catch (err: any) {
      console.error('Error loading order:', err);
      setError(err.response?.data?.error || 'Order not found');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    try {
      await orderApi.cancel(orderNumber!, 'Cancelled by customer');
      alert('Order cancelled successfully');
      loadOrder(); // Reload order
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cancel order');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#f59e0b',
      confirmed: '#3b82f6',
      processing: '#8b5cf6',
      shipped: '#06b6d4',
      delivered: '#10b981',
      cancelled: '#ef4444',
      refunded: '#6b7280',
    };
    return colors[status] || '#6b7280';
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="order-detail-page">
        <div className="order-detail-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading order details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="order-detail-page">
        <div className="order-detail-container">
          <div className="error-state">
            <h2>😕 Order Not Found</h2>
            <p>{error || 'The order you are looking for does not exist.'}</p>
            <button className="btn-primary" onClick={() => navigate('/orders')}>
              Back to Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="order-detail-page">
      <div className="order-detail-container">
        {/* Header */}
        <div className="order-detail-header">
          <button className="btn-back" onClick={() => navigate('/orders')}>
            ← Back to Orders
          </button>

          <div className="order-header-content">
            <div>
              <h1>Order #{order.orderNumber}</h1>
              <p className="order-date">
                Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            <div
              className="status-badge-large"
              style={{ backgroundColor: getStatusColor(order.status) }}
            >
              {order.status.toUpperCase()}
            </div>
          </div>
        </div>

        <div className="order-detail-content">
          {/* Left Column */}
          <div className="order-main-content">
            {/* Order Timeline */}
            <div className="detail-card">
              <h2>Order Timeline</h2>
              <div className="timeline">
                {order.timeline.map((event: any, index: number) => (
                  <div key={index} className="timeline-item">
                    <div
                      className="timeline-dot"
                      style={{ backgroundColor: getStatusColor(event.status) }}
                    ></div>
                    <div className="timeline-content">
                      <div className="timeline-status">{event.status.toUpperCase()}</div>
                      <div className="timeline-time">
                        {new Date(event.timestamp).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      {event.note && <div className="timeline-note">{event.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Items */}
            <div className="detail-card">
              <h2>Order Items ({order.items.length})</h2>
              <div className="order-items">
                {order.items.map((item: any, index: number) => (
                  <div key={index} className="order-item">
                    <img
                      src={item.productSnapshot.image || 'https://via.placeholder.com/80'}
                      alt={item.productSnapshot.name}
                      className="item-image"
                    />
                    <div className="item-details">
                      <div className="item-name">{item.productSnapshot.name}</div>
                      <div className="item-sku">SKU: {item.productSnapshot.sku}</div>
                      <div className="item-quantity">Quantity: {item.quantity}</div>
                    </div>
                    <div className="item-pricing">
                      <div className="item-price">${item.pricePerUnit.toFixed(2)} each</div>
                      <div className="item-total">
                        ${(item.pricePerUnit * item.quantity).toFixed(2)}
                      </div>
                      {item.discountAmount > 0 && (
                        <div className="item-discount">
                          Saved: ${item.discountAmount.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="detail-card">
              <h2>Shipping Address</h2>
              <div className="address-info">
                <p>
                  <strong>
                    {order.shipping.firstName} {order.shipping.lastName}
                  </strong>
                </p>
                <p>{order.shipping.address}</p>
                <p>
                  {order.shipping.city}, {order.shipping.state} {order.shipping.zipCode}
                </p>
                <p>{order.shipping.country}</p>
                <p>
                  <strong>Phone:</strong> {order.shipping.phone}
                </p>
                <p>
                  <strong>Email:</strong> {order.shipping.email}
                </p>
              </div>
            </div>

            {/* Payment Method */}
            <div className="detail-card">
              <h2>Payment Information</h2>
              <div className="payment-info">
                <p>
                  <strong>Method:</strong> {order.payment.method.replace('_', ' ').toUpperCase()}
                </p>
                <p>
                  <strong>Status:</strong>{' '}
                  <span
                    className="payment-status"
                    style={{
                      color: order.payment.status === 'paid' ? '#10b981' : '#f59e0b',
                    }}
                  >
                    {order.payment.status.toUpperCase()}
                  </span>
                </p>
                {order.payment.transactionId && (
                  <p>
                    <strong>Transaction ID:</strong> {order.payment.transactionId}
                  </p>
                )}
                {order.payment.paidAt && (
                  <p>
                    <strong>Paid on:</strong>{' '}
                    {new Date(order.payment.paidAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="order-sidebar">
            <div className="detail-card summary-card">
              <h2>Order Summary</h2>

              <div className="summary-rows">
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span>${order.pricing.subtotal.toFixed(2)}</span>
                </div>

                {order.pricing.discount > 0 && (
                  <div className="summary-row discount-row">
                    <span>Discount:</span>
                    <span>-${order.pricing.discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="summary-row">
                  <span>Tax:</span>
                  <span>${order.pricing.tax.toFixed(2)}</span>
                </div>

                <div className="summary-row">
                  <span>Shipping:</span>
                  <span>
                    {order.pricing.shipping === 0 ? (
                      <span className="free-badge">FREE</span>
                    ) : (
                      `$${order.pricing.shipping.toFixed(2)}`
                    )}
                  </span>
                </div>

                <div className="summary-divider"></div>

                <div className="summary-row total-row">
                  <span>Total:</span>
                  <span>${order.pricing.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Actions */}
              {['pending', 'confirmed'].includes(order.status) && (
                <button className="btn-cancel" onClick={handleCancelOrder}>
                  Cancel Order
                </button>
              )}

              <button className="btn-secondary" onClick={() => navigate('/orders')}>
                View All Orders
              </button>
            </div>

            {/* Help Card */}
            <div className="detail-card help-card">
              <h3>Need Help?</h3>
              <p>Contact our support team for assistance with your order.</p>
              <button className="btn-link">Contact Support</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
