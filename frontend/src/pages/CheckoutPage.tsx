// src/pages/CheckoutPage.tsx
// v3.1 - Stripe payment integration (FIXED: uses real PaymentIntent id + no client-side "paid")

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { userApi, orderApi } from '../services/api';
import api from '../services/api';
import './CheckoutPage.css';

// ── Stripe instance (created once outside component) ──
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// STRIPE PAYMENT FORM (needs Elements context)
// ─────────────────────────────────────────────

interface StripeFormProps {
  total: number;
  clientSecret: string;
  onSuccess: (piId: string) => void;
  onBack: () => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
  setError: (v: string) => void;
}

const StripePaymentForm: React.FC<StripeFormProps> = ({
  total,
  clientSecret,
  onSuccess,
  onBack,
  loading,
  setLoading,
  setError,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError('');

    // ✅ REQUIRED for PaymentElement (deferred / async flows)
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || 'Invalid payment details.');
      setLoading(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
      redirect: 'if_required',
    });

    if (error) {
      setError(error.message || 'Payment failed. Please try again.');
      setLoading(false);
      return;
    }

    if (!paymentIntent?.id) {
      setError('Payment did not complete properly.');
      setLoading(false);
      return;
    }

    onSuccess(paymentIntent.id);
  };


  return (
    <form onSubmit={handleSubmit}>
      <div className="stripe-element-wrapper">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      <div className="stripe-secure-note">
        🔒 Secured by Stripe. Your card details are never stored on our servers.
      </div>

      <div className="checkout-actions">
        <button type="button" className="btn-secondary" onClick={onBack}>
          ← Back
        </button>
        <button
          type="submit"
          className="btn-primary btn-place-order"
          disabled={!stripe || loading}
        >
          {loading ? 'Processing...' : `Pay $${total.toFixed(2)}`}
        </button>
      </div>
    </form>
  );
};

// ─────────────────────────────────────────────
// MAIN CHECKOUT PAGE
// ─────────────────────────────────────────────

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  user,
  cartItems,
  cartTotal,
  onOrderComplete,
}) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'shipping' | 'payment'>('shipping');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState('');

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

  const subtotal = cartTotal;
  const tax = subtotal * 0.1;
  const shipping = subtotal > 50 ? 0 : 10;
  const total = subtotal + tax + shipping;

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadAddresses = async () => {
    try {
      const profile = await userApi.getProfile(user.email);
      setAddresses(profile.addresses || []);
      const def = profile.addresses?.find((a: Address) => a.isDefault);
      if (def) setSelectedAddressId(def._id!);
    } catch (err) {
      console.error('Error loading addresses:', err);
    }
  };

  // Step 1: validate address → create PaymentIntent → go to payment
  const handleShippingSubmit = async () => {
    if (!useNewAddress && !selectedAddressId) {
      setError('Please select a shipping address');
      return;
    }
    if (
      useNewAddress &&
      (!newAddress.street ||
        !newAddress.city ||
        !newAddress.state ||
        !newAddress.zipCode)
    ) {
      setError('Please fill in all required address fields');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // NOTE:
      // If your axios baseURL already includes "/api", then use:
      //   api.post('/payments/create-payment-intent', ...)
      // If baseURL does NOT include "/api", keep "/api/payments/..."
      const res = await api.post('/api/payments/create-payment-intent', {
        amount: total,
        currency: 'usd',
      });

      setClientSecret(res.data.clientSecret);
      setStep('payment');
    } catch (err: any) {
      console.log('init payment error:', err);
      console.log('status:', err?.response?.status);
      console.log('data:', err?.response?.data);
      setError(err?.response?.data?.error || err?.message || 'Failed to initialize payment.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: payment confirmed → create order (backend verifies PI is succeeded)
  const handlePaymentSuccess = async (piId: string) => {
    setLoading(true);
    setError('');

    try {
      const addr = useNewAddress
        ? newAddress
        : addresses.find((a) => a._id === selectedAddressId);

      if (!addr) throw new Error('No shipping address');

      const response = await orderApi.checkout({
        userId: user.email,
        shipping: {
          firstName: addr.firstName,
          lastName: addr.lastName,
          email: user.email,
          phone: addr.phone,
          address: addr.street,
          city: addr.city,
          state: addr.state,
          zipCode: addr.zipCode,
          country: addr.country,
        },
        payment: {
          method: 'credit_card',
          stripePaymentIntentId: piId, // ✅ confirmed PI id
        },
      });

      if (response.success) {
        onOrderComplete?.();
        navigate(`/orders/${response.order.orderNumber}`);
      } else {
        setError('Order creation failed. Please contact support.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Order creation failed. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (cartItems.length === 0) {
    return (
      <div className="checkout-page">
        <div className="checkout-container">
          <h1>Checkout</h1>
          <div className="empty-state">
            <p>Your cart is empty.</p>
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
            <div className="step-number">{step !== 'shipping' ? '✓' : '1'}</div>
            <div className="step-label">Shipping</div>
          </div>
          <div className="step-connector" />
          <div className={`step ${step === 'payment' ? 'active' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">Payment</div>
          </div>
        </div>

        {error && <div className="error-alert">⚠️ {error}</div>}

        <div className="checkout-content">
          {/* ── Left: Forms ── */}
          <div className="checkout-main">
            {/* STEP 1: Shipping */}
            {step === 'shipping' && (
              <div className="checkout-section">
                <h2>Shipping Address</h2>

                {addresses.length > 0 && !useNewAddress && (
                  <div className="address-list">
                    {addresses.map((address) => (
                      <label key={address._id} className="address-option">
                        <input
                          type="radio"
                          name="address"
                          value={address._id}
                          checked={selectedAddressId === address._id}
                          onChange={() => setSelectedAddressId(address._id!)}
                        />
                        <div className="address-content">
                          <strong>
                            {address.firstName} {address.lastName}
                          </strong>
                          <span>
                            {address.street}, {address.city}, {address.state}{' '}
                            {address.zipCode}
                          </span>
                          <span>{address.phone}</span>
                        </div>
                      </label>
                    ))}
                    <button className="btn-link" onClick={() => setUseNewAddress(true)}>
                      + Use a different address
                    </button>
                  </div>
                )}

                {(useNewAddress || addresses.length === 0) && (
                  <div className="new-address-form">
                    {addresses.length > 0 && (
                      <button className="btn-link" onClick={() => setUseNewAddress(false)}>
                        ← Use saved address
                      </button>
                    )}
                    <div className="form-row">
                      <div className="form-group">
                        <label>First Name *</label>
                        <input
                          type="text"
                          value={newAddress.firstName}
                          onChange={(e) =>
                            setNewAddress({ ...newAddress, firstName: e.target.value })
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>Last Name *</label>
                        <input
                          type="text"
                          value={newAddress.lastName}
                          onChange={(e) =>
                            setNewAddress({ ...newAddress, lastName: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Street Address *</label>
                      <input
                        type="text"
                        value={newAddress.street}
                        onChange={(e) =>
                          setNewAddress({ ...newAddress, street: e.target.value })
                        }
                        placeholder="123 Main St"
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>City *</label>
                        <input
                          type="text"
                          value={newAddress.city}
                          onChange={(e) =>
                            setNewAddress({ ...newAddress, city: e.target.value })
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>State *</label>
                        <input
                          type="text"
                          value={newAddress.state}
                          onChange={(e) =>
                            setNewAddress({ ...newAddress, state: e.target.value })
                          }
                          placeholder="CA"
                        />
                      </div>
                      <div className="form-group">
                        <label>ZIP *</label>
                        <input
                          type="text"
                          value={newAddress.zipCode}
                          onChange={(e) =>
                            setNewAddress({ ...newAddress, zipCode: e.target.value })
                          }
                          placeholder="90210"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Phone *</label>
                      <input
                        type="tel"
                        value={newAddress.phone}
                        onChange={(e) =>
                          setNewAddress({ ...newAddress, phone: e.target.value })
                        }
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                )}

                <button className="btn-primary btn-full" onClick={handleShippingSubmit} disabled={loading}>
                  {loading ? 'Preparing payment...' : 'Continue to Payment →'}
                </button>
              </div>
            )}

            {/* STEP 2: Stripe Payment */}
            {step === 'payment' && clientSecret && (
              <div className="checkout-section">
                <h2>Payment</h2>
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: {
                        colorPrimary: '#2563eb',
                        borderRadius: '8px',
                        fontFamily: 'system-ui, sans-serif',
                      },
                    },
                  }}
                >
                  <StripePaymentForm
                    total={total}
                    clientSecret={clientSecret}
                    onSuccess={handlePaymentSuccess}
                    onBack={() => setStep('shipping')}
                    loading={loading}
                    setLoading={setLoading}
                    setError={setError}
                  />
                </Elements>
              </div>
            )}
          </div>

          {/* ── Right: Order Summary ── */}
          <div className="checkout-sidebar">
            <div className="order-summary-card">
              <h3>Order Summary</h3>
              <div className="summary-items">
                {cartItems.map((item) => (
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

              <div className="summary-divider" />
              <div className="summary-row">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Tax (10%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span>
                  {shipping === 0 ? <span className="free">FREE</span> : `$${shipping.toFixed(2)}`}
                </span>
              </div>
              <div className="summary-divider" />
              <div className="summary-row summary-total">
                <span>Total</span>
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
