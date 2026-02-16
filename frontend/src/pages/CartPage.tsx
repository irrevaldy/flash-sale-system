// src/pages/CartPage.tsx
// v2.0 - With checkout navigation

import React from 'react';
import { useNavigate } from 'react-router-dom';
import './CartPage.css';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
}

interface CartPageProps {
  cartItems: CartItem[];
  cartTotal: number;
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  onRemove: (id: string) => void;
  userId?: string;
}

const CartPage: React.FC<CartPageProps> = ({
  cartItems,
  cartTotal,
  onIncrease,
  onDecrease,
  onRemove,
  userId,
}) => {
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (!userId || userId === 'guest@example.com') {
      // Redirect to login if not authenticated
      if (window.confirm('You need to login to checkout. Go to login page?')) {
        navigate('/login');
      }
      return;
    }

    // Navigate to checkout page
    navigate('/checkout');
  };

  // Calculate summary
  const subtotal = cartTotal;
  const tax = subtotal * 0.1; // 10% tax
  const shipping = subtotal > 50 ? 0 : 10; // Free shipping over $50
  const total = subtotal + tax + shipping;

  return (
    <div className="cart-page">
      <div className="cart-container">
        <h1 className="cart-title">🛒 Your Shopping Cart</h1>

        {cartItems.length === 0 ? (
          <div className="empty-cart-state">
            <div className="empty-icon">🛒</div>
            <p className="empty-cart">Your cart is empty.</p>
            <button className="btn-shop" onClick={() => navigate('/catalog')}>
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cartItems.map(item => (
                <div key={item.id} className="cart-item">
                  <img
                    src={item.image || 'https://via.placeholder.com/100'}
                    alt={item.name}
                    className="cart-item-image"
                  />

                  <div className="cart-item-details">
                    <h3 className="item-name">{item.name}</h3>
                    <p className="item-price">${item.price.toFixed(2)} each</p>

                    <div className="quantity-controls">
                      <button
                        className="qty-btn"
                        onClick={() => onDecrease(item.id)}
                      >
                        −
                      </button>
                      <span className="qty-display">{item.quantity}</span>
                      <button
                        className="qty-btn"
                        onClick={() => onIncrease(item.id)}
                      >
                        +
                      </button>
                    </div>

                    <p className="item-subtotal">
                      Subtotal: ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>

                  <button
                    className="remove-btn"
                    onClick={() => onRemove(item.id)}
                    title="Remove from cart"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <h2>Order Summary</h2>
              
              <div className="summary-row">
                <span>Subtotal ({cartItems.length} items):</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>

              <div className="summary-row">
                <span>Tax (10%):</span>
                <span>${tax.toFixed(2)}</span>
              </div>

              <div className="summary-row">
                <span>Shipping:</span>
                <span>
                  {shipping === 0 ? (
                    <span className="free-shipping">FREE</span>
                  ) : (
                    `$${shipping.toFixed(2)}`
                  )}
                </span>
              </div>

              {subtotal < 50 && (
                <div className="shipping-note">
                  💡 Add ${(50 - subtotal).toFixed(2)} more for free shipping!
                </div>
              )}

              <div className="summary-divider"></div>

              <div className="summary-row total-row">
                <span>Total:</span>
                <span className="total-amount">${total.toFixed(2)}</span>
              </div>

              <button className="checkout-btn" onClick={handleCheckout}>
                Proceed to Checkout →
              </button>

              <button
                className="continue-shopping-btn"
                onClick={() => navigate('/catalog')}
              >
                Continue Shopping
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CartPage;
