"use strict";
// src/server.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const saleController_1 = __importDefault(require("./controllers/saleController"));
const purchaseController_1 = __importDefault(require("./controllers/purchaseController"));
const rateLimiter_1 = require("./middleware/rateLimiter");
const saleService_1 = __importDefault(require("./services/saleService"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Apply rate limiting to all routes
app.use('/api/', rateLimiter_1.apiLimiter);
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
// Sale routes
app.get('/api/sale/status', rateLimiter_1.statusLimiter, (req, res) => saleController_1.default.getStatus(req, res));
app.post('/api/sale/init', (req, res) => saleController_1.default.initializeSale(req, res));
app.get('/api/sale/stats', (req, res) => saleController_1.default.getStats(req, res));
app.get('/api/sale/user/:userId', (req, res) => saleController_1.default.checkUserPurchase(req, res));
// Purchase route
app.post('/api/sale/purchase', rateLimiter_1.purchaseLimiter, (req, res) => purchaseController_1.default.attemptPurchase(req, res));
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
    });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.path,
    });
});
// Initialize default sale
async function initializeDefaultSale() {
    console.log('🔍 Checking for existing sale...');
    try {
        const status = await saleService_1.default.getSaleStatus();
        console.log('✅ Existing sale found:', status.productName);
        console.log(`   Stock: ${status.remainingStock}/${status.totalStock}`);
        console.log(`   Status: ${status.status}`);
        return true;
    }
    catch (error) {
        console.log('📝 No existing sale found. Creating default sale...');
        try {
            const now = new Date();
            const startTime = new Date(now.getTime() - 5 * 60 * 1000); // Started 5 minutes ago
            const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Ends in 24 hours
            await saleService_1.default.initializeSale({
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
        }
        catch (initError) {
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
        }
        else {
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
exports.default = app;
