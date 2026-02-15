"use strict";
// src/services/purchaseService.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchaseService = void 0;
const redis_1 = __importDefault(require("../config/redis"));
const types_1 = require("../types");
const luaScripts_1 = require("../utils/luaScripts");
const saleService_1 = __importDefault(require("./saleService"));
class PurchaseService {
    constructor() {
        this.SALE_STOCK_KEY = 'sale:stock';
        this.SALE_PURCHASES_KEY = 'sale:purchases';
    }
    /**
     * Attempt to purchase item for a user
     * Uses atomic Lua script to prevent race conditions
     */
    async attemptPurchase(userId) {
        try {
            // Validate user ID
            if (!userId || userId.trim().length === 0) {
                return {
                    success: false,
                    message: types_1.ErrorMessages.INVALID_USER_ID,
                };
            }
            // Check if sale is active
            const status = await saleService_1.default.getSaleStatus();
            if (status.status === 'upcoming') {
                return {
                    success: false,
                    message: types_1.ErrorMessages.SALE_NOT_STARTED,
                    remainingStock: status.remainingStock,
                };
            }
            if (status.status === 'ended') {
                return {
                    success: false,
                    message: types_1.ErrorMessages.SALE_ENDED,
                    remainingStock: status.remainingStock,
                };
            }
            if (status.status === 'sold_out') {
                return {
                    success: false,
                    message: types_1.ErrorMessages.SOLD_OUT,
                    remainingStock: 0,
                };
            }
            // Execute atomic purchase using Lua script
            const timestamp = new Date().toISOString();
            const result = await redis_1.default.eval(luaScripts_1.CHECK_AND_PURCHASE_SCRIPT, 2, this.SALE_STOCK_KEY, this.SALE_PURCHASES_KEY, userId, timestamp);
            // Handle result
            if (result === 'ALREADY_PURCHASED') {
                return {
                    success: false,
                    message: types_1.ErrorMessages.ALREADY_PURCHASED,
                    remainingStock: await saleService_1.default.getRemainingStock(),
                };
            }
            if (result === 'SOLD_OUT') {
                return {
                    success: false,
                    message: types_1.ErrorMessages.SOLD_OUT,
                    remainingStock: 0,
                };
            }
            // Success - result is the remaining stock
            const remainingStock = typeof result === 'number' ? result : parseInt(result);
            console.log(`✅ Purchase successful: ${userId} (${remainingStock} remaining)`);
            return {
                success: true,
                message: 'Purchase successful!',
                remainingStock,
            };
        }
        catch (error) {
            console.error('Error in purchase attempt:', error);
            return {
                success: false,
                message: types_1.ErrorMessages.SYSTEM_ERROR,
            };
        }
    }
    /**
     * Check if a user has already purchased
     */
    async checkUserPurchase(userId) {
        try {
            const members = await redis_1.default.smembers(this.SALE_PURCHASES_KEY);
            // Find user's purchase entry
            const userEntry = members.find(entry => entry.startsWith(userId + ':'));
            if (userEntry) {
                const timestamp = userEntry.split(':').slice(1).join(':'); // Handle emails with colons
                return {
                    hasPurchased: true,
                    purchaseTime: timestamp,
                };
            }
            return {
                hasPurchased: false,
            };
        }
        catch (error) {
            console.error('Error checking user purchase:', error);
            throw error;
        }
    }
    /**
     * Get total number of purchases
     */
    async getTotalPurchases() {
        try {
            const members = await redis_1.default.smembers(this.SALE_PURCHASES_KEY);
            return members.length;
        }
        catch (error) {
            console.error('Error getting total purchases:', error);
            return 0;
        }
    }
}
exports.PurchaseService = PurchaseService;
exports.default = new PurchaseService();
