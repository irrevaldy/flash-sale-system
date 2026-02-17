// src/server.ts
import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import { connectDatabase } from './config/database';
import redisClient from './config/redis';

// Controllers
import productController from './controllers/productController';
import cartController from './controllers/cartController';
import orderController from './controllers/orderController';
import userController from './controllers/userController';
import { apiLimiter } from './middleware/rateLimiter';
import paymentRoutes from './routes/paymentRoutes';
import flashSaleRoutes from './routes/flashSaleRoutes';

import { requireAuth } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use('/api/payments', paymentRoutes);   // ⚠️ must be before express.json() for webhook raw body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting
app.use('/api/', apiLimiter);

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    await redisClient.ping();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        mongodb: 'connected',
        redis: 'connected',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ==================== FLASH SALE ROUTES ====================
app.use('/api/flash-sale', flashSaleRoutes);

// ==================== PRODUCT ROUTES ====================
app.get('/api/products', productController.getProducts.bind(productController));
app.get('/api/products/categories', productController.getCategories.bind(productController));
app.get('/api/products/slug/:slug', productController.getProductBySlug.bind(productController));
app.get('/api/products/:id', productController.getProduct.bind(productController));
app.post('/api/products', productController.createProduct.bind(productController));
app.put('/api/products/:id', productController.updateProduct.bind(productController));
app.delete('/api/products/:id', productController.deleteProduct.bind(productController));

// ==================== CART ROUTES ====================
app.get('/api/cart/:userId', cartController.getCart.bind(cartController));
app.get('/api/cart/:userId/summary', cartController.getCartSummary.bind(cartController));
app.post('/api/cart/:userId/items', cartController.addToCart.bind(cartController));
app.put('/api/cart/:userId/items/:productId', cartController.updateCartItem.bind(cartController));
app.delete('/api/cart/:userId/items/:productId', cartController.removeFromCart.bind(cartController));
app.delete('/api/cart/:userId', cartController.clearCart.bind(cartController));

// ==================== ORDER ROUTES ====================
app.post('/api/orders/checkout', orderController.checkout.bind(orderController));
app.get('/api/orders/:userId', orderController.getUserOrders.bind(orderController));
app.get('/api/orders/detail/:orderNumber', orderController.getOrder.bind(orderController));
app.get('/api/orders/stats/:userId', orderController.getUserStats.bind(orderController));
app.put('/api/orders/:orderNumber/status', orderController.updateOrderStatus.bind(orderController));
app.post('/api/orders/:orderNumber/cancel', orderController.cancelOrder.bind(orderController));

// ==================== USER ROUTES ====================
app.post('/api/users/register', userController.register.bind(userController));
app.post('/api/users/login', userController.login.bind(userController));
app.post('/api/users/refresh', userController.refresh.bind(userController));
app.get('/api/users/:email', requireAuth, userController.getProfile.bind(userController));
app.put('/api/users/:email', requireAuth, userController.updateProfile.bind(userController));
app.get('/api/users/:email/dashboard', requireAuth, userController.getDashboard.bind(userController));
app.post('/api/users/:email/addresses', requireAuth, userController.addAddress.bind(userController));
app.delete('/api/users/:email/addresses/:addressId', requireAuth, userController.removeAddress.bind(userController));

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Start server
async function startServer() {
  try {
    console.log('');
    console.log('🚀 Starting Enhanced Flash Sale E-Commerce Platform...');
    console.log('='.repeat(60));
    console.log('');

    await connectDatabase();

    app.listen(PORT, () => {
      console.log('');
      console.log('='.repeat(60));
      console.log(`🎉 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📊 API base URL: http://localhost:${PORT}/api`);
      console.log('='.repeat(60));
      console.log('');
      console.log('✅ Available Endpoints:');
      console.log('  Products:       GET    /api/products');
      console.log('  Cart:           GET    /api/cart/:userId');
      console.log('  Checkout:       POST   /api/orders/checkout');
      console.log('  Orders:         GET    /api/orders/:userId');
      console.log('  Register:       POST   /api/users/register');
      console.log('  Login:          POST   /api/users/login');
      console.log('  Flash Sale:     GET    /api/flash-sale/status');
      console.log('  Flash Purchase: POST   /api/flash-sale/purchase');
      console.log('  Flash Check:    GET    /api/flash-sale/check/:userId');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => { process.exit(0); });
process.on('SIGINT',  async () => { process.exit(0); });

startServer();

export default app;
