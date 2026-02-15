"use strict";
// src/controllers/purchaseController.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchaseController = void 0;
const purchaseService_1 = __importDefault(require("../services/purchaseService"));
class PurchaseController {
    /**
     * POST /api/sale/purchase
     * Attempt to purchase an item
     */
    async attemptPurchase(req, res) {
        try {
            const { userId } = req.body;
            if (!userId) {
                res.status(400).json({
                    success: false,
                    message: 'User ID is required',
                });
                return;
            }
            const result = await purchaseService_1.default.attemptPurchase(userId);
            // Set appropriate status code
            const statusCode = result.success ? 200 : 400;
            res.status(statusCode).json(result);
        }
        catch (error) {
            console.error('Error in attemptPurchase:', error);
            res.status(500).json({
                success: false,
                message: 'System error occurred. Please try again',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}
exports.PurchaseController = PurchaseController;
exports.default = new PurchaseController();
