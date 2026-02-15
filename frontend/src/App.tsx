// src/App.tsx
// v3 - Clean structure with CartPage integration

import { useState, useEffect } from 'react';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProductCatalogPage } from './pages/ProductCatalogPage';
import CartPage from './pages/CartPage';
import FlashSale from './components/FlashSale';
import { ProfilePage } from './pages/ProfilePage';
import { cartApi } from './services/api'; // <-- HERE
import './App.css';

type Page = 'home' | 'login' | 'register' | 'catalog' | 'cart' | 'profile';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [user, setUser] = useState<any>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [toastMessage, setToastMessage] = useState('');

  // ✅ Derived values
  const cartCount = cartItems.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const cartTotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  // ✅ Load stored user
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // ==============================
  // AUTH HANDLERS
  // ==============================

  const handleLogin = (userData: any) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    setCurrentPage('catalog');
  };

  const handleRegister = (userData: any) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    setCurrentPage('catalog');
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setCurrentPage('home');
  };

  // ==============================
  // CART HANDLERS
  // ==============================

  const handleAddToCart = (product: any) => {
    // 1️⃣ Update local cart state
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product._id);
      if (existing) {
        return prev.map(item =>
          item.id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          id: product._id,
          name: product.name,
          price: product.price,
          image: product.images?.[0],
          quantity: 1,
        },
      ];
    });

    // 2️⃣ Sync with backend only if user is logged in
    if (user) {
      cartApi.addItem(user.email, product._id, 1)
        .catch(err => console.error('Failed to sync cart', err));
    }

    // 3️⃣ Toast notification
    setToastMessage(`${product.name} added to cart!`);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const increaseQuantity = (id: string) => {
    setCartItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const decreaseQuantity = (id: string) => {
    setCartItems(prev =>
      prev
        .map(item =>
          item.id === id
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const getUserEmail = () => {
    return user?.email || 'guest@example.com';
  };

  // ==============================
  // RENDER
  // ==============================

  return (
    <div className="app">
      {toastMessage && <div className="toast">{toastMessage}</div>}
      {/* ================= HEADER ================= */}
      <header className="app-header">
        <div className="header-container">

          <div className="logo" onClick={() => setCurrentPage('home')}>
            <img src="/favicon.png" alt="Valdy Store" className="logo-image" />
          </div>

          <nav className="nav-menu">
            <button
              className={currentPage === 'home' ? 'nav-link active' : 'nav-link'}
              onClick={() => setCurrentPage('home')}
            >
              Home
            </button>

            <button
              className={currentPage === 'catalog' ? 'nav-link active' : 'nav-link'}
              onClick={() => setCurrentPage('catalog')}
            >
              Shop
            </button>
          </nav>

          <div className="header-actions">

            {/* Cart Button */}
            <button
              className="icon-button"
              onClick={() => setCurrentPage('cart')}
            >
              🛒
              {cartCount > 0 && (
                <span className="cart-badge">{cartCount}</span>
              )}
            </button>

            {/* User Section */}
            {user ? (
              <div className="user-menu">
                <button
                  className="user-button"
                  onClick={() => setCurrentPage('profile')}
                >
                  👤 {user.profile?.firstName || 'User'}
                </button>
                <button
                  className="btn-logout"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="auth-buttons">
                <button
                  className="btn-secondary"
                  onClick={() => setCurrentPage('login')}
                >
                  Login
                </button>
                <button
                  className="btn-primary"
                  onClick={() => setCurrentPage('register')}
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ================= MAIN ================= */}
      <main className="app-main">

        {currentPage === 'home' && (
          <div className="home-page">
            <section className="hero-section">
              <h1 className="hero-title">Welcome to Valdy Store</h1>
              <p className="hero-subtitle">
                Discover amazing deals on electronics and more!
              </p>
              <button
                className="btn-primary btn-large"
                onClick={() => setCurrentPage('catalog')}
              >
                Shop Now →
              </button>
            </section>

            <FlashSale 
              userId={getUserEmail()} 
              onAddToCart={handleAddToCart} 
            />
          </div>
        )}

        {currentPage === 'login' && (
          <LoginPage
            onLoginSuccess={handleLogin}
            onNavigateToRegister={() => setCurrentPage('register')}
          />
        )}

        {currentPage === 'register' && (
          <RegisterPage
            onRegisterSuccess={handleRegister}
            onNavigateToLogin={() => setCurrentPage('login')}
          />
        )}

        {currentPage === 'catalog' && (
          <ProductCatalogPage
            onAddToCart={handleAddToCart}
            onViewProduct={(id) => console.log('View product:', id)}
          />
        )}

        {currentPage === 'cart' && (
          <CartPage
            cartItems={cartItems}
            cartTotal={cartTotal}
            onIncrease={increaseQuantity}
            onDecrease={decreaseQuantity}
            onRemove={removeFromCart}
          />
        )}

        {currentPage === 'profile' && user && (
          <ProfilePage user={user} />
        )}

      </main>

      {/* ================= FOOTER ================= */}
      <footer className="app-footer">
        <div className="footer-container">
          <p>&copy; 2026 Valdy Store. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}

export default App;
