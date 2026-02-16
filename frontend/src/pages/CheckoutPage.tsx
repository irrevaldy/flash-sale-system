// src/pages/CheckoutPage.tsx
// v2.0 - Complete checkout flow with shipping and payment

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userApi, orderApi } from '../services/api';
import './CheckoutPage.css';

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

interface CartItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
}

interface CheckoutPageProps {
  user: any;
  cartItems: CartItem[];
  cartTotal: number;
  onOrderComplete?: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  user,
  cartItems,
  cartTotal,
  onOrderComplete,
}) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'shipping' | 'payment' | 'review'>('shipping');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // New address form
  const [newAddress, setNewAddress] = useState<Address>({
    type: 'shipping',
    firstName: user?.profile?.firstName || '',
    lastName: user?.profile?.lastName || '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA',
    phone: user?.profile?.phone || '',
    isDefault: false,
  });

  // Payment form
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'debit_card' | 'paypal'>('credit_card');

  // Load saved addresses
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    loadAddresses();
  }, [user]);

  const loadAddresses = async () => {
    try {
      const profile = await userApi.getProfile(user.email);
      setAddresses(profile.addresses || []);
      
      // Select default address
      const defaultAddr = profile.addresses?.find((a: Address) => a.isDefault);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr._id!);
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
    }
  };

  // Calculate totals
  const subtotal = cartTotal;
  const tax = subtotal * 0.1;
  const shipping = subtotal > 50 ? 0 : 10;
  const total = subtotal + tax + shipping;

  // Handle shipping submission
  const handleShippingSubmit = async () => {
    if (!useNewAddress && !selectedAddressId) {
      setError('Please select a shipping address');
      return;
    }

    if (useNewAddress) {
      // Validate new address
      if (!newAddress.street || !newAddress.city || !newAddress.state || !newAddress.zipCode) {
        setError('Please fill in all required fields');
        return;
      }
    }

    setError('');
    setStep('payment');
  };

  // Handle place order
  const handlePlaceOrder = async () => {
    setLoading(true);
    setError('');

    try {
      // Get shipping address
      let shippingAddress: any;

      if (useNewAddress) {
        shippingAddress = newAddress;
      } else {
        shippingAddress = addresses.find(a => a._id === selectedAddressId);
      }

      if (!shippingAddress) {
        throw new Error('No shipping address selected');
      }

      // Prepare order data
      const orderData = {
        userId: user.email,
        shipping: {
          firstName: shippingAddress.firstName,
          lastName: shippingAddress.lastName,
          email: user.email,
          phone: shippingAddress.phone,
          address: shippingAddress.street,
          city: shippingAddress.city,
          state: shippingAddress.state,
          zipCode: shippingAddress.zipCode,
          country: shippingAddress.country,
        },
        payment: {
          method: paymentMethod,
          status: 'pending',
        },
      };

      // Call checkout API
      const response = await orderApi.checkout(orderData);

      if (response.success) {
        alert('Order placed successfully! Order #' + response.order.orderNumber);
        onOrderComplete?.();
        navigate('/orders');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.response?.data?.error || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  if (cartItems.length === 0) {
    return (
      <div className="checkout-page">
        <div className="checkout-container">
          <h1>Checkout</h1>
          <div className="empty-state">
            <p>Your cart is empty. Add items to proceed with checkout.</p>
            <button className="btn-primary" onClick={() => navigate('/catalog')}>
              Shop Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <h1>Checkout</h1>

        {/* Progress Steps */}
        <div className="checkout-steps">
          <div className={`step ${step === 'shipping' ? 'active' : 'completed'}`}>
            <div className="step-number">1</div>
            <div className="step-label">Shipping</div>
          </div>
          <div className={`step ${step === 'payment' ? 'active' : step === 'review' ? 'completed' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">Payment</div>
          </div>
          <div className={`step ${step === 'review' ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-label">Review</div>
          </div>
        </div>

        {error && (
          <div className="error-alert">
            ⚠️ {error}
          </div>
        )}

        <div className="checkout-content">
          {/* Left: Forms */}
          <div className="checkout-main">
            {/* STEP 1: Shipping */}
            {step === 'shipping' && (
              <div className="checkout-section">
                <h2>Shipping Address</h2>

                {/* Saved Addresses */}
                {addresses.length > 0 && !useNewAddress && (
                  <div className="address-list">
                    {addresses.map(address => (
                      <label key={address._id} className="address-option">
                        <input
                          type="radio"
                          name="address"
                          value={address._id}
                          checked={selectedAddressId === address._id}
                          onChange={() => setSelectedAddressId(address._id!)}
                        />
                        <div className="address-content">
                          {address.isDefault && <span className="badge-default">Default</span>}
                          <div className="address-name">
                            {address.firstName} {address.lastName}
                          </div>
                          <div className="address-details">
                            {address.street}<br />
                            {address.city}, {address.state} {address.zipCode}<br />
                            {address.phone}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {/* Use New Address Toggle */}
                <button
                  className="btn-secondary btn-full"
                  onClick={() => setUseNewAddress(!useNewAddress)}
                >
                  {useNewAddress ? '← Use Saved Address' : '+ Add New Address'}
                </button>

                {/* New Address Form */}
                {useNewAddress && (
                  <div className="address-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>First Name *</label>
                        <input
                          type="text"
                          value={newAddress.firstName}
                          onChange={(e) => setNewAddress({ ...newAddress, firstName: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Last Name *</label>
                        <input
                          type="text"
                          value={newAddress.lastName}
                          onChange={(e) => setNewAddress({ ...newAddress, lastName: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Street Address *</label>
                      <input
                        type="text"
                        value={newAddress.street}
                        onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                        placeholder="123 Main St, Apt 4"
                        required
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>City *</label>
                        <input
                          type="text"
                          value={newAddress.city}
                          onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>State *</label>
                        <input
                          type="text"
                          value={newAddress.state}
                          onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                          placeholder="CA"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>ZIP Code *</label>
                        <input
                          type="text"
                          value={newAddress.zipCode}
                          onChange={(e) => setNewAddress({ ...newAddress, zipCode: e.target.value })}
                          placeholder="90210"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Phone *</label>
                      <input
                        type="tel"
                        value={newAddress.phone}
                        onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                        placeholder="+1 (555) 123-4567"
                        required
                      />
                    </div>
                  </div>
                )}

                <button className="btn-primary btn-full" onClick={handleShippingSubmit}>
                  Continue to Payment →
                </button>
              </div>
            )}

            {/* STEP 2: Payment */}
            {step === 'payment' && (
              <div className="checkout-section">
                <h2>Payment Method</h2>

                <div className="payment-methods">
                  <label className="payment-option">
                    <input
                      type="radio"
                      name="payment"
                      value="credit_card"
                      checked={paymentMethod === 'credit_card'}
                      onChange={() => setPaymentMethod('credit_card')}
                    />
                    <div className="payment-content">
                      <span className="payment-icon">💳</span>
                      <span>Credit Card</span>
                    </div>
                  </label>

                  <label className="payment-option">
                    <input
                      type="radio"
                      name="payment"
                      value="debit_card"
                      checked={paymentMethod === 'debit_card'}
                      onChange={() => setPaymentMethod('debit_card')}
                    />
                    <div className="payment-content">
                      <span className="payment-icon">💳</span>
                      <span>Debit Card</span>
                    </div>
                  </label>

                  <label className="payment-option">
                    <input
                      type="radio"
                      name="payment"
                      value="paypal"
                      checked={paymentMethod === 'paypal'}
                      onChange={() => setPaymentMethod('paypal')}
                    />
                    <div className="payment-content">
                      <span className="payment-icon">🅿️</span>
                      <span>PayPal</span>
                    </div>
                  </label>
                </div>

                <div className="payment-note">
                  💡 Payment will be processed securely after order confirmation
                </div>

                <div className="checkout-actions">
                  <button className="btn-secondary" onClick={() => setStep('shipping')}>
                    ← Back to Shipping
                  </button>
                  <button className="btn-primary" onClick={() => setStep('review')}>
                    Review Order →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Review */}
            {step === 'review' && (
              <div className="checkout-section">
                <h2>Review Your Order</h2>

                <div className="review-section">
                  <h3>Shipping Address</h3>
                  {useNewAddress ? (
                    <div className="review-address">
                      {newAddress.firstName} {newAddress.lastName}<br />
                      {newAddress.street}<br />
                      {newAddress.city}, {newAddress.state} {newAddress.zipCode}<br />
                      {newAddress.phone}
                    </div>
                  ) : (
                    <div className="review-address">
                      {(() => {
                        const addr = addresses.find(a => a._id === selectedAddressId);
                        return addr ? (
                          <>
                            {addr.firstName} {addr.lastName}<br />
                            {addr.street}<br />
                            {addr.city}, {addr.state} {addr.zipCode}<br />
                            {addr.phone}
                          </>
                        ) : 'No address selected';
                      })()}
                    </div>
                  )}
                </div>

                <div className="review-section">
                  <h3>Payment Method</h3>
                  <p className="review-payment">
                    {paymentMethod === 'credit_card' && '💳 Credit Card'}
                    {paymentMethod === 'debit_card' && '💳 Debit Card'}
                    {paymentMethod === 'paypal' && '🅿️ PayPal'}
                  </p>
                </div>

                <div className="checkout-actions">
                  <button className="btn-secondary" onClick={() => setStep('payment')}>
                    ← Back to Payment
                  </button>
                  <button
                    className="btn-primary btn-place-order"
                    onClick={handlePlaceOrder}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : `Place Order - $${total.toFixed(2)}`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Order Summary */}
          <div className="checkout-sidebar">
            <div className="order-summary-card">
              <h3>Order Summary</h3>

              <div className="summary-items">
                {cartItems.map(item => (
                  <div key={item.id} className="summary-item">
                    <img src={item.image || 'https://via.placeholder.com/60'} alt={item.name} />
                    <div className="summary-item-details">
                      <div className="summary-item-name">{item.name}</div>
                      <div className="summary-item-qty">Qty: {item.quantity}</div>
                    </div>
                    <div className="summary-item-price">
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="summary-divider"></div>

              <div className="summary-row">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Tax:</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping:</span>
                <span>{shipping === 0 ? <span className="free">FREE</span> : `$${shipping.toFixed(2)}`}</span>
              </div>

              <div className="summary-divider"></div>

              <div className="summary-row summary-total">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
