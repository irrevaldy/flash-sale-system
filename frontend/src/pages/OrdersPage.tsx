// src/pages/OrdersPage.tsx
// v2.0 - Order history page

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderApi } from '../services/api';
import './OrdersPage.css';

interface OrdersPageProps {
  user: any;
}

export const OrdersPage: React.FC<OrdersPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    loadOrders();
    loadStats();
  }, [user]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await orderApi.getUserOrders(user.email);
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await orderApi.getUserStats(user.email);
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
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
    };
    return colors[status] || '#6b7280';
  };

  if (!user) {
    return null;
  }

  return (
    <div className="orders-page">
      <div className="orders-container">
        <h1>My Orders</h1>

        {/* Stats */}
        {stats && (
          <div className="orders-stats">
            <div className="stat-box">
              <div className="stat-value">{stats.totalOrders || 0}</div>
              <div className="stat-label">Total Orders</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">${stats.totalSpent?.toFixed(2) || '0.00'}</div>
              <div className="stat-label">Total Spent</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">${stats.averageOrderValue?.toFixed(2) || '0.00'}</div>
              <div className="stat-label">Avg Order</div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading orders...</p>
          </div>
        )}

        {/* Orders List */}
        {!loading && orders.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h2>No Orders Yet</h2>
            <p>Start shopping to see your orders here!</p>
            <button className="btn-primary" onClick={() => navigate('/catalog')}>
              Browse Products
            </button>
          </div>
        )}

        {!loading && orders.length > 0 && (
          <div className="orders-list">
            {orders.map(order => (
              <div key={order._id} className="order-card">
                <div className="order-header">
                  <div className="order-number">
                    <strong>Order #{order.orderNumber}</strong>
                    <span
                      className="order-status-badge"
                      style={{ backgroundColor: getStatusColor(order.status) }}
                    >
                      {order.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="order-date">
                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>

                <div className="order-body">
                  <div className="order-items-preview">
                    <p className="items-count">{order.items.length} item(s)</p>
                    {order.items.slice(0, 3).map((item: any, idx: number) => (
                      <div key={idx} className="item-preview">
                        • {item.productSnapshot.name} (x{item.quantity})
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="more-items">
                        +{order.items.length - 3} more item(s)
                      </div>
                    )}
                  </div>

                  <div className="order-total">
                    <span>Total:</span>
                    <strong>${order.pricing.total.toFixed(2)}</strong>
                  </div>
                </div>

                <div className="order-footer">
                  <button
                    className="btn-view-order"
                    onClick={() => navigate(`/orders/${order.orderNumber}`)}
                  >
                    View Details
                  </button>

                  {['pending', 'confirmed'].includes(order.status) && (
                    <button
                      className="btn-cancel-order"
                      onClick={async () => {
                        if (confirm('Are you sure you want to cancel this order?')) {
                          try {
                            await orderApi.cancel(order.orderNumber, 'Cancelled by user');
                            alert('Order cancelled successfully');
                            loadOrders();
                          } catch (error) {
                            alert('Failed to cancel order');
                          }
                        }
                      }}
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
