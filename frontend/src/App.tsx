// src/App.tsx
// v4.0 - With React Router for proper URL navigation

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Link } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProductCatalogPage } from './pages/ProductCatalogPage';
import CartPage from './pages/CartPage';
import FlashSale from './components/FlashSale';
import { ProfilePage } from './pages/ProfilePage';
import { cartApi } from './services/api';
import './App.css';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
}

// Separate component that can use useNavigate
function AppContent() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [toastMessage, setToastMessage] = useState('');

  // Derived values
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  // Load stored user
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // ============================== AUTH HANDLERS
  const handleLogin = (userData: any) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    navigate('/catalog');
  };

  const handleRegister = (userData: any) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    navigate('/catalog');
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  // ============================== CART HANDLERS
  const handleAddToCart = (product: any) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product._id);
      if (existing) {
        return prev.map(item =>
          item.id === product._id ? { ...item, quantity: item.quantity + 1 } : item
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

    if (user) {
      cartApi.addItem(user.email, product._id, 1).catch(err => console.error('Failed to sync cart', err));
    }

    setToastMessage(`${product.name} added to cart!`);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleUserUpdate = (updatedUser: any) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const increaseQuantity = (id: string) => {
    setCartItems(prev =>
      prev.map(item => (item.id === id ? { ...item, quantity: item.quantity + 1 } : item))
    );
  };

  const decreaseQuantity = (id: string) => {
    setCartItems(prev =>
      prev.map(item => (item.id === id ? { ...item, quantity: item.quantity - 1 } : item)).filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const getUserEmail = () => {
    return user?.email || 'guest@example.com';
  };

  return (
    <div className="app">
      {toastMessage && <div className="toast">{toastMessage}</div>}

      {/* ================= HEADER ================= */}
      <header className="app-header">
        <div className="header-container">
          <Link to="/" className="logo">
            <img src="/favicon.png" alt="Valdy Store" className="logo-image" />
          </Link>

          <nav className="nav-menu">
            <Link to="/" className="nav-link">
              Home
            </Link>
            <Link to="/catalog" className="nav-link">
              Shop
            </Link>
          </nav>

          <div className="header-actions">
            {/* Cart Button */}
            <button className="icon-button" onClick={() => navigate('/cart')}>
              🛒
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>

            {/* User Section */}
            {user ? (
              <div className="user-menu">
                <button className="user-button" onClick={() => navigate('/profile')}>
                  👤 {user.profile?.firstName || 'User'}
                </button>
                <button className="btn-logout" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            ) : (
              <div className="auth-buttons">
                <button className="btn-secondary" onClick={() => navigate('/login')}>
                  Login
                </button>
                <button className="btn-primary" onClick={() => navigate('/register')}>
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ================= ROUTES ================= */}
      <main className="app-main">
        <Routes>
          {/* Home Page */}
          <Route
            path="/"
            element={
              <div className="home-page">
                <section className="hero-section">
                  <h1 className="hero-title">Welcome to Valdy Store</h1>
                  <p className="hero-subtitle">Discover amazing deals on electronics and more!</p>
                  <button className="btn-primary btn-large" onClick={() => navigate('/catalog')}>
                    Shop Now →
                  </button>
                </section>
                <FlashSale userId={getUserEmail()} onAddToCart={handleAddToCart} />
              </div>
            }
          />

          {/* Login */}
          <Route
            path="/login"
            element={
              <LoginPage
                onLoginSuccess={handleLogin}
                onNavigateToRegister={() => navigate('/register')}
              />
            }
          />

          {/* Register */}
          <Route
            path="/register"
            element={
              <RegisterPage
                onRegisterSuccess={handleRegister}
                onNavigateToLogin={() => navigate('/login')}
              />
            }
          />

          {/* Catalog */}
          <Route
            path="/catalog"
            element={
              <ProductCatalogPage
                onAddToCart={handleAddToCart}
                onViewProduct={(id) => console.log('View product:', id)}
              />
            }
          />

          {/* Cart */}
          <Route
            path="/cart"
            element={
              <CartPage
                cartItems={cartItems}
                cartTotal={cartTotal}
                onIncrease={increaseQuantity}
                onDecrease={decreaseQuantity}
                onRemove={removeFromCart}
              />
            }
          />

          {/* Profile */}
          <Route
            path="/profile"
            element={
              user ? (
                <ProfilePage 
                  user={user} 
                  onUserUpdate={handleUserUpdate}
                />
              ) : (
                <LoginPage onLoginSuccess={handleLogin} onNavigateToRegister={() => navigate('/register')} />
              )
            }
          />
        </Routes>
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

// Wrapper with BrowserRouter
function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
