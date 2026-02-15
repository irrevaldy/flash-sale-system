"use strict";
// src/services/saleService.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaleService = void 0;
const redis_1 = __importDefault(require("../config/redis"));
const luaScripts_1 = require("../utils/luaScripts");
class SaleService {
    constructor() {
        this.SALE_CONFIG_KEY = 'sale:config';
        this.SALE_STOCK_KEY = 'sale:stock';
        this.SALE_PURCHASES_KEY = 'sale:purchases';
    }
    /**
     * Initialize a new flash sale
     */
    async initializeSale(config) {
        try {
            // Validate times
            const startTime = new Date(config.startTime);
            const endTime = new Date(config.endTime);
            if (endTime <= startTime) {
                throw new Error('End time must be after start time');
            }
            if (config.totalStock <= 0) {
                throw new Error('Total stock must be positive');
            }
            // Use Lua script for atomic initialization (for real Redis)
            if (typeof redis_1.default.eval === 'function') {
                await redis_1.default.eval(luaScripts_1.INIT_SALE_SCRIPT, 2, this.SALE_CONFIG_KEY, this.SALE_STOCK_KEY, config.startTime, config.endTime, config.totalStock.toString(), config.productName);
            }
            else {
                // Fallback for mock Redis
                await redis_1.default.hset(this.SALE_CONFIG_KEY, 'startTime', config.startTime);
                await redis_1.default.hset(this.SALE_CONFIG_KEY, 'endTime', config.endTime);
                await redis_1.default.hset(this.SALE_CONFIG_KEY, 'totalStock', config.totalStock.toString());
                await redis_1.default.hset(this.SALE_CONFIG_KEY, 'productName', config.productName);
                await redis_1.default.set(this.SALE_STOCK_KEY, config.totalStock.toString());
            }
            console.log(`✅ Sale initialized: ${config.productName} (${config.totalStock} items)`);
        }
        catch (error) {
            console.error('Error initializing sale:', error);
            throw error;
        }
    }
    /**
     * Get current sale status
     */
    async getSaleStatus() {
        try {
            const config = await redis_1.default.hgetall(this.SALE_CONFIG_KEY);
            if (!config || !config.startTime) {
                throw new Error('Sale not configured');
            }
            const remainingStock = parseInt(await redis_1.default.get(this.SALE_STOCK_KEY) || '0');
            const totalStock = parseInt(config.totalStock);
            const now = new Date();
            const startTime = new Date(config.startTime);
            const endTime = new Date(config.endTime);
            let status;
            if (remainingStock <= 0) {
                status = 'sold_out';
            }
            else if (now < startTime) {
                status = 'upcoming';
            }
            else if (now > endTime) {
                status = 'ended';
            }
            else {
                status = 'active';
            }
            return {
                status,
                startTime: config.startTime,
                endTime: config.endTime,
                totalStock,
                remainingStock,
                productName: config.productName,
            };
        }
        catch (error) {
            console.error('Error getting sale status:', error);
            throw error;
        }
    }
    /**
     * Check if sale is currently active
     */
    async isSaleActive() {
        const status = await this.getSaleStatus();
        return status.status === 'active';
    }
    /**
     * Get remaining stock
     */
    async getRemainingStock() {
        const stock = await redis_1.default.get(this.SALE_STOCK_KEY);
        return parseInt(stock || '0');
    }
    /**
     * Reset sale (for testing)
     */
    async resetSale() {
        await redis_1.default.del(this.SALE_CONFIG_KEY, this.SALE_STOCK_KEY, this.SALE_PURCHASES_KEY);
        console.log('🔄 Sale reset');
    }
}
exports.SaleService = SaleService;
exports.default = new SaleService();
