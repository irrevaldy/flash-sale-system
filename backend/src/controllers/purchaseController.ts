// src/controllers/purchaseController.ts

import { Request, Response } from 'express';
import purchaseService from '../services/purchaseService';

export class PurchaseController {
  /**
   * POST /api/sale/purchase
   * Attempt to purchase an item
   */
  async attemptPurchase(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
        return;
      }

      const result = await purchaseService.attemptPurchase(userId);

      // Set appropriate status code
      const statusCode = result.success ? 200 : 400;
      
      res.status(statusCode).json(result);
    } catch (error) {
      console.error('Error in attemptPurchase:', error);
      res.status(500).json({
        success: false,
        message: 'System error occurred. Please try again',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default new PurchaseController();
