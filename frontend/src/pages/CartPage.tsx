// src/pages/CartPage.tsx
import React from 'react';
import './CartPage.css'; // make sure to create this file

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
}

const CartPage: React.FC<CartPageProps> = ({
  cartItems,
  cartTotal,
  onIncrease,
  onDecrease,
  onRemove,
}) => {
  return (
    <div className="cart-page">
      <div className="cart-container">
        <h1 className="cart-title">🛒 Your Shopping Cart</h1>

        {cartItems.length === 0 ? (
          <p className="empty-cart">Your cart is empty.</p>
        ) : (
          <>
            <div className="cart-items">
              {cartItems.map(item => (
                <div key={item.id} className="cart-item">
                  <img
                    src={item.image || '/placeholder.png'}
                    alt={item.name}
                    className="cart-item-image"
                  />

                  <div className="cart-item-details">
                    <h3 className="item-name">{item.name}</h3>
                    <p className="item-price">${item.price.toFixed(2)}</p>

                    <div className="quantity-controls">
                      <button onClick={() => onDecrease(item.id)}>-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => onIncrease(item.id)}>+</button>
                    </div>

                    <button
                      className="remove-btn"
                      onClick={() => onRemove(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <h2>Total: ${cartTotal.toFixed(2)}</h2>
              <button className="checkout-btn">Checkout</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CartPage;
