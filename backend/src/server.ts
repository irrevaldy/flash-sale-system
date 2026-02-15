// src/server.ts

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import saleController from './controllers/saleController';
import purchaseController from './controllers/purchaseController';
import { apiLimiter, purchaseLimiter, statusLimiter } from './middleware/rateLimiter';
import saleService from './services/saleService';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting to all routes
app.use('/api/', apiLimiter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Sale routes
app.get('/api/sale/status', statusLimiter, (req, res) => saleController.getStatus(req, res));
app.post('/api/sale/init', (req, res) => saleController.initializeSale(req, res));
app.get('/api/sale/stats', (req, res) => saleController.getStats(req, res));
app.get('/api/sale/user/:userId', (req, res) => saleController.checkUserPurchase(req, res));

// Purchase route
app.post('/api/sale/purchase', purchaseLimiter, (req, res) => purchaseController.attemptPurchase(req, res));

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Initialize default sale
async function initializeDefaultSale() {
  console.log('🔍 Checking for existing sale...');
  
  try {
    const status = await saleService.getSaleStatus();
    console.log('✅ Existing sale found:', status.productName);
    console.log(`   Stock: ${status.remainingStock}/${status.totalStock}`);
    console.log(`   Status: ${status.status}`);
    return true;
  } catch (error) {
    console.log('📝 No existing sale found. Creating default sale...');
    
    try {
      const now = new Date();
      const startTime = new Date(now.getTime() - 5 * 60 * 1000); // Started 5 minutes ago
      const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Ends in 24 hours

      await saleService.initializeSale({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        totalStock: 100,
        productName: 'Limited Edition Flash Sale Widget',
      });
      
      console.log('✅ Default sale initialized successfully!');
      console.log('   Product: Limited Edition Flash Sale Widget');
      console.log('   Stock: 100');
      console.log('   Duration: 24 hours');
      return true;
    } catch (initError) {
      console.error('❌ Failed to initialize sale:', initError);
      return false;
    }
  }
}

// Start server with proper initialization
async function startServer() {
  console.log('');
  console.log('🚀 Starting Flash Sale Server...');
  console.log('================================');
  console.log('');
  
  // CRITICAL: Initialize sale BEFORE starting server
  const saleInitialized = await initializeDefaultSale();
  
  if (!saleInitialized) {
    console.error('');
    console.error('⚠️  WARNING: Sale not initialized!');
    console.error('   Server will start but /api/sale/status will fail.');
    console.error('   Run this to initialize manually:');
    console.error('   curl -X POST http://localhost:' + PORT + '/api/sale/init \\');
    console.error('     -H "Content-Type: application/json" \\');
    console.error('     -d \'{"startTime":"2026-02-15T00:00:00Z","endTime":"2026-02-16T23:59:59Z","totalStock":100,"productName":"Test Sale"}\'');
    console.error('');
  }
  
  // Start listening
  app.listen(PORT, () => {
    console.log('');
    console.log('================================');
    console.log(`🎉 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health: http://localhost:${PORT}/health`);
    console.log(`📊 API: http://localhost:${PORT}/api`);
    console.log('================================');
    console.log('');
    
    if (saleInitialized) {
      console.log('✅ Ready to accept requests!');
      console.log('');
      console.log('Test commands:');
      console.log(`  curl http://localhost:${PORT}/api/sale/status`);
      console.log(`  curl -X POST http://localhost:${PORT}/api/sale/purchase -H "Content-Type: application/json" -d '{"userId":"test@example.com"}'`);
    } else {
      console.log('⚠️  Initialize sale before making purchases!');
    }
    console.log('');
  });
}

// Catch any startup errors
startServer().catch((error) => {
  console.error('');
  console.error('❌ Failed to start server:', error);
  console.error('');
  process.exit(1);
});

export default app;
