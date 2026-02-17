import { useState, useEffect, useRef } from 'react';
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

const FLASHSALE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const FLASHSALE_LAST_SHOWN_KEY = 'flashsale_last_shown_ts';

function HomeProductCarousel({
  title,
  subtitle,
  products,
  onView,
  onAddToCart,
}: {
  title: string;
  subtitle?: string;
  products: HomeProduct[];
  onView: (id: string) => void;
  onAddToCart: (p: HomeProduct) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!el) return;

    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (delta === 0) return;

    e.preventDefault();
    el.scrollLeft += delta;
  };

  if (!products.length) return null;

  return (
    <section className="home-carousel">
      <div className="home-carousel-header">
        <div>
          <h2 className="home-carousel-title">{title}</h2>
          {subtitle && <p className="home-carousel-subtitle">{subtitle}</p>}
        </div>
      </div>

      <div
        ref={trackRef}
        className="home-carousel-track"
        onWheel={onWheel}
        aria-label="Product carousel"
      >
        {products.map((p) => {
          const img = p.images?.[0] || 'https://via.placeholder.com/600x400?text=Product';
          const discount =
            p.compareAtPrice && p.compareAtPrice > p.price
              ? Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100)
              : 0;

          return (
            <div key={p._id} className="home-carousel-card">
              {discount > 0 && <div className="home-carousel-badge">{discount}% OFF</div>}

              <button
                type="button"
                className="home-carousel-imageBtn"
                onClick={() => onView(p._id)}
                aria-label={`View ${p.name}`}
              >
                <img src={img} alt={p.name} className="home-carousel-image" />
              </button>

              <div className="home-carousel-content">
                <div className="home-carousel-name" title={p.name}>
                  {p.name}
                </div>

                <div className="home-carousel-priceRow">
                  <span className="home-carousel-price">${Number(p.price).toFixed(2)}</span>
                  {p.compareAtPrice && p.compareAtPrice > p.price && (
                    <span className="home-carousel-compare">
                      ${Number(p.compareAtPrice).toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="home-carousel-actions">
                  <button className="home-carousel-btnSecondary" onClick={() => onView(p._id)}>
                    View
                  </button>
                  <button className="home-carousel-btnPrimary" onClick={() => onAddToCart(p)}>
                    Add
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState<any>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [toastMessage, setToastMessage] = useState('');
  const [isFlashSaleOpen, setIsFlashSaleOpen] = useState(false);

  // Home carousel products (from DB)
  const [homeProducts, setHomeProducts] = useState<HomeProduct[]>([]);
  const [homeProductsLoading, setHomeProductsLoading] = useState(false);

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  // Load stored user
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  // ✅ Auto-open FlashSale on Home if not shown in last 5 minutes
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

  // ✅ Load carousel products from DB whenever Home is visited
  useEffect(() => {
    if (location.pathname !== '/') return;

    const loadHomeProducts = async () => {
      try {
        setHomeProductsLoading(true);
        // adjust limit as you want
        const data = await productApi.getAll({ limit: 12 });
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

  const handleUserUpdate = (updatedUser: any) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  // ============================== CART HANDLERS
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

      {/* FlashSale Popup */}
      <FlashSale
        isOpen={isFlashSaleOpen}
        onClose={closeFlashSale}
        onAddToCart={(p) => handleAddToCart(p)}
      />

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
            <Link to="/orders" className="nav-link">
              Order
            </Link>
          </nav>

          <div className="header-actions">
            <button className="icon-button" onClick={() => navigate('/cart')}>
              🛒 {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>

            {/* User Section */}
            {user ? (
              <div className="user-menu">
                {/* Desktop */}
                <button className="user-button user-desktop" onClick={() => navigate('/profile')}>
                  👤 {user.profile?.firstName || 'User'}
                </button>
                <button className="btn-logout user-desktop" onClick={handleLogout}>
                  Logout
                </button>

                {/* Mobile (icons only) */}
                <button
                  className="icon-button user-mobile"
                  onClick={() => navigate('/profile')}
                  aria-label="Profile"
                  title="Profile"
                >
                  👤
                </button>
                <button
                  className="icon-button user-mobile"
                  onClick={handleLogout}
                  aria-label="Logout"
                  title="Logout"
                >
                  🚪
                </button>
              </div>
            ) : (
              <div className="auth-buttons">
                {/* Desktop */}
                <button className="btn-secondary auth-desktop" onClick={() => navigate('/login')}>
                  Login
                </button>
                <button className="btn-primary auth-desktop" onClick={() => navigate('/register')}>
                  Sign Up
                </button>

                {/* Mobile (icons only) */}
                <button
                  className="icon-button auth-mobile"
                  onClick={() => navigate('/login')}
                  aria-label="Login"
                  title="Login"
                >
                  🔑
                </button>
                <button
                  className="icon-button auth-mobile"
                  onClick={() => navigate('/register')}
                  aria-label="Register"
                  title="Register"
                >
                  📝
                </button>
              </div>
            )}

          </div>
        </div>
      </header>

      <main className="app-main">
        <Routes>
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
                      Flash Sale
                    </button>
                  </div>
                </section>

                {/* ✅ Carousel below hero */}
                {homeProductsLoading ? (
                  <div style={{ maxWidth: 1200, margin: '16px auto', padding: '0 16px', color: '#6b7280' }}>
                    Loading featured products...
                  </div>
                ) : (
                  <HomeProductCarousel
                    title="Featured Products"
                    products={homeProducts}
                    onView={(id) => navigate(`/products/${id}`)}
                    onAddToCart={(p) => handleAddToCart(p)}
                  />
                )}
              </div>
            }
          />

          <Route
            path="/login"
            element={
              <LoginPage onLoginSuccess={handleLogin} onNavigateToRegister={() => navigate('/register')} />
            }
          />

          <Route
            path="/register"
            element={
              <RegisterPage onRegisterSuccess={handleRegister} onNavigateToLogin={() => navigate('/login')} />
            }
          />

          <Route
            path="/catalog"
            element={
              <ProductCatalogPage onAddToCart={handleAddToCart} onViewProduct={(id) => navigate(`/products/${id}`)} />
            }
          />

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

          <Route
            path="/profile"
            element={
              user ? (
                <ProfilePage user={user} onUserUpdate={handleUserUpdate} />
              ) : (
                <LoginPage onLoginSuccess={handleLogin} onNavigateToRegister={() => navigate('/register')} />
              )
            }
          />

          <Route
            path="/checkout"
            element={
              user ? (
                <CheckoutPage
                  user={user}
                  cartItems={cartItems}
                  cartTotal={cartTotal}
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

          <Route
            path="/orders/:orderNumber"
            element={user ? <OrderDetailPage user={user} /> : <Navigate to="/login" replace />}
          />

          <Route
            path="/orders"
            element={user ? <OrdersPage user={user} /> : <Navigate to="/login" replace />}
          />

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
