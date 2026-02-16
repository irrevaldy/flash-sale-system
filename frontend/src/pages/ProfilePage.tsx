// src/pages/ProfilePage.tsx
// v2.1 - Complete profile with address management + Orders tab (View Details + Cancel)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userApi, orderApi } from '../services/api';
import './ProfilePage.css';

interface ProfilePageProps {
  user: any;
  onUserUpdate?: (updatedUser: any) => void;
}

interface Address {
  _id?: string;
  type: 'shipping' | 'billing';
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onUserUpdate }) => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'orders'>('profile');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);

  const [addresses, setAddresses] = useState<Address[]>(user?.addresses || []);
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    firstName: user?.profile?.firstName || '',
    lastName: user?.profile?.lastName || '',
    phone: user?.profile?.phone || '',
  });

  // Address form
  const [addressForm, setAddressForm] = useState<Address>({
    type: 'shipping',
    firstName: '',
    lastName: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA',
    phone: '',
    isDefault: false,
  });

  // Keep profile form in sync if user changes
  useEffect(() => {
    setProfileForm({
      firstName: user?.profile?.firstName || '',
      lastName: user?.profile?.lastName || '',
      phone: user?.profile?.phone || '',
    });
    setAddresses(user?.addresses || user?.addresses || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  // Load dashboard data
  useEffect(() => {
    if (!user?.email) return;
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

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

  const loadDashboardData = async () => {
    try {
      setLoadingOrders(true);

      const [dashboardData, ordersData, statsData] = await Promise.all([
        userApi.getDashboard(user.email),
        orderApi.getUserOrders(user.email, 1, 10),
        orderApi.getUserStats(user.email),
      ]);

      setAddresses(dashboardData?.user?.addresses || []);
      setOrders(ordersData?.orders || []);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const refreshOrders = async () => {
    try {
      setLoadingOrders(true);
      const ordersData = await orderApi.getUserOrders(user.email, 1, 10);
      setOrders(ordersData?.orders || []);
    } catch (error) {
      console.error('Error reloading orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Update profile
  const handleUpdateProfile = async () => {
    try {
      const response = await userApi.updateProfile(user.email, {
        profile: profileForm,
      });

      if (response.success) {
        alert('Profile updated successfully!');
        setIsEditingProfile(false);
        onUserUpdate?.(response.user);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update profile');
    }
  };

  // Add address
  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await userApi.addAddress(user.email, addressForm);

      if (response.success) {
        setAddresses(response.addresses);
        setIsAddingAddress(false);

        setAddressForm({
          type: 'shipping',
          firstName: '',
          lastName: '',
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'USA',
          phone: '',
          isDefault: false,
        });

        alert('Address added successfully!');
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add address');
    }
  };

  // Remove address
  const handleRemoveAddress = async (addressId: string) => {
    if (!confirm('Are you sure you want to remove this address?')) return;

    try {
      const response = await userApi.removeAddress(user.email, addressId);

      if (response.success) {
        setAddresses(response.addresses);
        alert('Address removed successfully!');
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to remove address');
    }
  };

  const cancelOrder = async (orderNumber: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    try {
      await orderApi.cancel(orderNumber, 'Cancelled by user');
      alert('Order cancelled successfully');
      await refreshOrders();
    } catch (error) {
      alert('Failed to cancel order');
    }
  };

  if (!user) {
    return (
      <div className="profile-page">
        <div className="page-container">
          <h2>No User Found</h2>
          <p>Please login to view your profile.</p>
          <button className="btn-primary" onClick={() => navigate('/login')}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h1>My Account</h1>

        {/* Stats Overview */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.totalOrders || 0}</div>
              <div className="stat-label">Total Orders</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">${stats.totalSpent?.toFixed(2) || '0.00'}</div>
              <div className="stat-label">Total Spent</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">${stats.averageOrderValue?.toFixed(2) || '0.00'}</div>
              <div className="stat-label">Avg Order Value</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="profile-tabs">
          <button
            className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 Profile
          </button>
          <button
            className={`tab ${activeTab === 'addresses' ? 'active' : ''}`}
            onClick={() => setActiveTab('addresses')}
          >
            📍 Addresses
          </button>
          <button
            className={`tab ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            📦 Orders
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="profile-card">
            <div className="card-header">
              <h2>Personal Information</h2>
              {!isEditingProfile && (
                <button className="btn-edit" onClick={() => setIsEditingProfile(true)}>
                  ✏️ Edit
                </button>
              )}
            </div>

            {isEditingProfile ? (
              <div className="edit-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      value={profileForm.firstName}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, firstName: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      value={profileForm.lastName}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, lastName: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, phone: e.target.value })
                    }
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div className="form-actions">
                  <button className="btn-secondary" onClick={() => setIsEditingProfile(false)}>
                    Cancel
                  </button>
                  <button className="btn-primary" onClick={handleUpdateProfile}>
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="profile-info">
                <div className="info-row">
                  <span className="label">Name:</span>
                  <span className="value">
                    {user.profile?.firstName} {user.profile?.lastName}
                  </span>
                </div>

                <div className="info-row">
                  <span className="label">Email:</span>
                  <span className="value">{user.email}</span>
                </div>

                <div className="info-row">
                  <span className="label">Phone:</span>
                  <span className="value">{user.profile?.phone || 'Not provided'}</span>
                </div>

                <div className="info-row">
                  <span className="label">Member Since:</span>
                  <span className="value">{new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Addresses Tab */}
        {activeTab === 'addresses' && (
          <div className="addresses-section">
            <div className="section-header">
              <h2>Saved Addresses</h2>
              <button className="btn-primary" onClick={() => setIsAddingAddress(true)}>
                + Add Address
              </button>
            </div>

            {/* Add Address Form */}
            {isAddingAddress && (
              <div className="address-form-card">
                <h3>Add New Address</h3>

                <form onSubmit={handleAddAddress}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Type *</label>
                      <select
                        value={addressForm.type}
                        onChange={(e) =>
                          setAddressForm({
                            ...addressForm,
                            type: e.target.value as 'shipping' | 'billing',
                          })
                        }
                        required
                      >
                        <option value="shipping">Shipping</option>
                        <option value="billing">Billing</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={addressForm.isDefault}
                          onChange={(e) =>
                            setAddressForm({ ...addressForm, isDefault: e.target.checked })
                          }
                        />
                        Set as default
                      </label>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>First Name *</label>
                      <input
                        type="text"
                        value={addressForm.firstName}
                        onChange={(e) =>
                          setAddressForm({ ...addressForm, firstName: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Last Name *</label>
                      <input
                        type="text"
                        value={addressForm.lastName}
                        onChange={(e) =>
                          setAddressForm({ ...addressForm, lastName: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Street Address *</label>
                    <input
                      type="text"
                      value={addressForm.street}
                      onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                      placeholder="123 Main Street, Apt 4B"
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>City *</label>
                      <input
                        type="text"
                        value={addressForm.city}
                        onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>State *</label>
                      <input
                        type="text"
                        value={addressForm.state}
                        onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                        placeholder="CA"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>ZIP Code *</label>
                      <input
                        type="text"
                        value={addressForm.zipCode}
                        onChange={(e) =>
                          setAddressForm({ ...addressForm, zipCode: e.target.value })
                        }
                        placeholder="90210"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Country *</label>
                      <input
                        type="text"
                        value={addressForm.country}
                        onChange={(e) =>
                          setAddressForm({ ...addressForm, country: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Phone *</label>
                      <input
                        type="tel"
                        value={addressForm.phone}
                        onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                        placeholder="+1 (555) 123-4567"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setIsAddingAddress(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      Save Address
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Address List */}
            <div className="addresses-grid">
              {addresses.length === 0 ? (
                <div className="empty-state">
                  <p>No addresses saved yet.</p>
                  <button className="btn-primary" onClick={() => setIsAddingAddress(true)}>
                    Add Your First Address
                  </button>
                </div>
              ) : (
                addresses.map((address) => (
                  <div key={address._id} className="address-card">
                    {address.isDefault && <div className="default-badge">Default</div>}
                    <div className="address-type">{address.type.toUpperCase()}</div>

                    <div className="address-content">
                      <strong>
                        {address.firstName} {address.lastName}
                      </strong>
                      <p>{address.street}</p>
                      <p>
                        {address.city}, {address.state} {address.zipCode}
                      </p>
                      <p>{address.country}</p>
                      <p>Phone: {address.phone}</p>
                    </div>

                    <button className="btn-remove" onClick={() => handleRemoveAddress(address._id!)}>
                      🗑️ Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="orders-section">
            <h2>Order History</h2>

            {/* Loading */}
            {loadingOrders && (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading orders...</p>
              </div>
            )}

            {/* Empty */}
            {!loadingOrders && orders.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <h2>No Orders Yet</h2>
                <p>Start shopping to see your orders here!</p>
                <button className="btn-primary" onClick={() => navigate('/catalog')}>
                  Browse Products
                </button>
              </div>
            )}

            {/* Orders List */}
            {!loadingOrders && orders.length > 0 && (
              <div className="orders-list">
                {orders.map((order) => (
                  <div key={order._id} className="order-card">
                    <div className="order-header">
                      <div className="order-number">
                        <strong>Order #{order.orderNumber}</strong>
                        <span
                          className="order-status-badge"
                          style={{ backgroundColor: getStatusColor(order.status) }}
                        >
                          {String(order.status).toUpperCase()}
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
                            • {item.productSnapshot?.name} (x{item.quantity})
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
                        <strong>${Number(order.pricing?.total ?? 0).toFixed(2)}</strong>
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
                          onClick={() => cancelOrder(order.orderNumber)}
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
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
