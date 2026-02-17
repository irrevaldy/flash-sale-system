import { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
  Link,
  Navigate,
} from 'react-router-dom';

import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProductCatalogPage } from './pages/ProductCatalogPage';
import CartPage from './pages/CartPage';
import FlashSale from './components/FlashSale';
import HomeCarousel from './components/HomeCarousel';
import FlashSaleCarousel from './components/FlashSaleCarousel';
import { ProfilePage } from './pages/ProfilePage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import ProductDetailPage from './pages/ProductDetailPage';

import { cartApi, productApi } from './services/api';
import './App.css';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
}

type HomeProduct = {
  _id: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  images?: string[];
  category?: string;
};

const FLASHSALE_COOLDOWN_MS = 5 * 60 * 1000;
const FLASHSALE_LAST_SHOWN_KEY = 'flashsale_last_shown_ts';

// ─────────────────────────────────────────────
// CheckoutWrapper — injects flash sale item from navigation state into cartItems
// ─────────────────────────────────────────────
function CheckoutWrapper({
  user,
  cartItems,
  onOrderComplete,
}: {
  user: any;
  cartItems: CartItem[];
  onOrderComplete: () => void;
}) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isFlashSale = searchParams.get('flashSale') === 'true';
  const flashSaleItem = (location.state as any)?.flashSaleItem;

  // If flash sale checkout, use ONLY the flash sale item (not the whole cart)
  const effectiveItems: CartItem[] = isFlashSale && flashSaleItem
    ? [{
        id:       flashSaleItem._id,
        name:     flashSaleItem.name,
        price:    flashSaleItem.price,
        image:    flashSaleItem.images?.[0],
        quantity: 1,
      }]
    : cartItems;

  const effectiveTotal = effectiveItems.reduce(
    (sum, item) => sum + item.price * item.quantity, 0
  );

  return (
    <CheckoutPage
      user={user}
      cartItems={effectiveItems}
      cartTotal={effectiveTotal}
      isFlashSaleCheckout={isFlashSale}
      onOrderComplete={onOrderComplete}
    />
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState<any>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [toastMessage, setToastMessage] = useState('');
  const [isFlashSaleOpen, setIsFlashSaleOpen] = useState(false);
  const [homeProducts, setHomeProducts] = useState<HomeProduct[]>([]);
  const [homeProductsLoading, setHomeProductsLoading] = useState(false);

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  // Load stored user
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  // Auto-open FlashSale on Home if not shown in last 5 minutes
  useEffect(() => {
    if (location.pathname !== '/') {
      setIsFlashSaleOpen(false);
      return;
    }

    const now = Date.now();
    const lastShownRaw = localStorage.getItem(FLASHSALE_LAST_SHOWN_KEY);
    const lastShown = lastShownRaw ? Number(lastShownRaw) : 0;

    if (!lastShown || now - lastShown >= FLASHSALE_COOLDOWN_MS) {
      const timer = setTimeout(() => {
        setIsFlashSaleOpen(true);
        localStorage.setItem(FLASHSALE_LAST_SHOWN_KEY, String(Date.now()));
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  // Load carousel products from DB whenever Home is visited
  useEffect(() => {
    if (location.pathname !== '/') return;

    const loadHomeProducts = async () => {
      try {
        setHomeProductsLoading(true);
        const data = await productApi.getAll({ limit: 50 });
        setHomeProducts((data?.products || []) as HomeProduct[]);
      } catch (e) {
        console.error('Failed to load home carousel products', e);
        setHomeProducts([]);
      } finally {
        setHomeProductsLoading(false);
      }
    };

    loadHomeProducts();
  }, [location.pathname]);

  // ── Auth handlers ──
  const handleLogin = (userData: any) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    navigate('/');
  };

  const handleRegister = (userData: any) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    navigate('/');
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  const handleUserUpdate = (updatedUser: any) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  // ── Cart handlers ──
  const handleAddToCart = (product: any) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product._id);
      if (existing) {
        return prev.map((item) =>
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
      cartApi
        .addItem(user.email, product._id, 1)
        .catch((err) => console.error('Failed to sync cart', err));
    }

    setToastMessage(`${product.name} added to cart!`);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const increaseQuantity = (id: string) => {
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: item.quantity + 1 } : item))
    );
  };

  const decreaseQuantity = (id: string) => {
    setCartItems((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const openFlashSale = () => {
    setIsFlashSaleOpen(true);
    localStorage.setItem(FLASHSALE_LAST_SHOWN_KEY, String(Date.now()));
  };

  const closeFlashSale = () => {
    setIsFlashSaleOpen(false);
    localStorage.setItem(FLASHSALE_LAST_SHOWN_KEY, String(Date.now()));
  };

  return (
    <div className="app">
      {toastMessage && <div className="toast">{toastMessage}</div>}

      <FlashSale
        isOpen={isFlashSaleOpen}
        onClose={closeFlashSale}
        user={user}
      />

      <header className="app-header">
        <div className="header-container">
          <Link to="/" className="logo">
            <img src="/favicon.png" alt="Valdy Store" className="logo-image" />
          </Link>

          <nav className="nav-menu">
            <Link to="/" className="nav-link" aria-label="Home" title="Home">
              <span className="nav-icon" aria-hidden="true">🏠</span>
              <span className="nav-text">Home</span>
            </Link>
            <Link to="/catalog" className="nav-link" aria-label="Shop" title="Shop">
              <span className="nav-icon" aria-hidden="true">🛍️</span>
              <span className="nav-text">Shop</span>
            </Link>
            <Link to="/orders" className="nav-link" aria-label="Orders" title="Orders">
              <span className="nav-icon" aria-hidden="true">📦</span>
              <span className="nav-text">Order</span>
            </Link>
          </nav>

          <div className="header-actions">
            <button className="icon-button" onClick={() => navigate('/cart')}>
              🛒 {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>

            {user ? (
              <div className="user-menu">
                <button className="user-button user-desktop" onClick={() => navigate('/profile')}>
                  👤 {user.profile?.firstName || 'User'}
                </button>
                <button className="btn-logout user-desktop" onClick={handleLogout}>
                  Logout
                </button>
                <button className="icon-button user-mobile" onClick={() => navigate('/profile')} aria-label="Profile" title="Profile">👤</button>
                <button className="icon-button user-mobile" onClick={handleLogout} aria-label="Logout" title="Logout">🚪</button>
              </div>
            ) : (
              <div className="auth-buttons">
                <button className="btn-secondary auth-desktop" onClick={() => navigate('/login')}>Login</button>
                <button className="btn-primary auth-desktop" onClick={() => navigate('/register')}>Sign Up</button>
                <button className="icon-button auth-mobile" onClick={() => navigate('/login')} aria-label="Login" title="Login">🔑</button>
                <button className="icon-button auth-mobile" onClick={() => navigate('/register')} aria-label="Register" title="Register">📝</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        <Routes>

          {/* HOME */}
          <Route
            path="/"
            element={
              <div className="home-page">
                <section className="hero-section">
                  <h1 className="hero-title">Welcome to Valdy Store</h1>
                  <p className="hero-subtitle">Discover amazing deals on electronics and more!</p>

                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="btn-primary btn-large" onClick={() => navigate('/catalog')}>
                      Shop Now →
                    </button>
                    <button className="btn-secondary btn-large" onClick={openFlashSale}>
                      Flash Sale ⚡
                    </button>
                  </div>
                </section>

                {homeProductsLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    Loading products...
                  </div>
                ) : (
                  <>
                    <FlashSaleCarousel
                      user={user}
                    />
                    <HomeCarousel
                      products={homeProducts}
                      onView={(id) => navigate(`/products/${id}`)}
                      onAddToCart={(p) => handleAddToCart(p)}
                    />
                  </>
                )}
              </div>
            }
          />

          {/* LOGIN */}
          <Route
            path="/login"
            element={
              <LoginPage
                onLoginSuccess={handleLogin}
                onNavigateToRegister={() => navigate('/register')}
              />
            }
          />

          {/* REGISTER */}
          <Route
            path="/register"
            element={
              <RegisterPage
                onRegisterSuccess={handleRegister}
                onNavigateToLogin={() => navigate('/login')}
              />
            }
          />

          {/* CATALOG */}
          <Route
            path="/catalog"
            element={
              <ProductCatalogPage
                onAddToCart={handleAddToCart}
                onViewProduct={(id) => navigate(`/products/${id}`)}
              />
            }
          />

          {/* CART */}
          <Route
            path="/cart"
            element={
              <CartPage
                cartItems={cartItems}
                cartTotal={cartTotal}
                onIncrease={increaseQuantity}
                onDecrease={decreaseQuantity}
                onRemove={removeFromCart}
                userId={user?.email}
              />
            }
          />

          {/* PROFILE */}
          <Route
            path="/profile"
            element={
              user ? (
                <ProfilePage user={user} onUserUpdate={handleUserUpdate} />
              ) : (
                <LoginPage
                  onLoginSuccess={handleLogin}
                  onNavigateToRegister={() => navigate('/register')}
                />
              )
            }
          />

          {/* CHECKOUT */}
          <Route
            path="/checkout"
            element={
              user ? (
                <CheckoutWrapper
                  user={user}
                  cartItems={cartItems}
                  onOrderComplete={() => {
                    setCartItems([]);
                    navigate('/orders');
                  }}
                />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* ORDER DETAIL — must be before /orders */}
          <Route
            path="/orders/:orderNumber"
            element={user ? <OrderDetailPage user={user} /> : <Navigate to="/login" replace />}
          />

          {/* ORDERS LIST */}
          <Route
            path="/orders"
            element={user ? <OrdersPage user={user} /> : <Navigate to="/login" replace />}
          />

          {/* PRODUCT DETAIL */}
          <Route
            path="/products/:productId"
            element={<ProductDetailPage onAddToCart={handleAddToCart} user={user} />}
          />

        </Routes>
      </main>

      <footer className="app-footer">
        <div className="footer-container">
          <p>&copy; 2026 Valdy Store. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
