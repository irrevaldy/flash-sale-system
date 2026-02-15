// src/controllers/saleController.ts

import { Request, Response } from 'express';
import saleService from '../services/saleService';
import purchaseService from '../services/purchaseService';

export class SaleController {
  /**
   * GET /api/sale/status
   * Get current sale status
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await saleService.getSaleStatus();
      res.json(status);
    } catch (error) {
      console.error('Error in getStatus:', error);
      
      // If sale not configured, return helpful message
      if (error instanceof Error && error.message.includes('not configured')) {
        res.status(503).json({
          error: 'Sale not initialized',
          message: 'The flash sale has not been configured yet. Please initialize a sale first.',
          hint: 'POST to /api/sale/init to initialize a sale',
        });
      } else {
        res.status(500).json({
          error: 'Failed to get sale status',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * POST /api/sale/init
   * Initialize a new sale (admin endpoint)
   */
  async initializeSale(req: Request, res: Response): Promise<void> {
    try {
      const { startTime, endTime, totalStock, productName } = req.body;

      // Validation
      if (!startTime || !endTime || !totalStock || !productName) {
        res.status(400).json({
          error: 'Missing required fields',
          required: ['startTime', 'endTime', 'totalStock', 'productName'],
        });
        return;
      }

      await saleService.initializeSale({
        startTime,
        endTime,
        totalStock: parseInt(totalStock),
        productName,
      });

      res.json({
        success: true,
        message: 'Sale initialized successfully',
      });
    } catch (error) {
      console.error('Error in initializeSale:', error);
      res.status(500).json({
        error: 'Failed to initialize sale',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/sale/user/:userId
   * Check if user has purchased
   */
  async checkUserPurchase(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId || typeof userId !== 'string') {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const purchaseStatus = await purchaseService.checkUserPurchase(userId);
      res.json(purchaseStatus);
    } catch (error) {
      console.error('Error in checkUserPurchase:', error);
      res.status(500).json({
        error: 'Failed to check user purchase status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/sale/stats
   * Get sale statistics (admin endpoint)
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const status = await saleService.getSaleStatus();
      const totalPurchases = await purchaseService.getTotalPurchases();

      res.json({
        ...status,
        totalPurchases,
        soldPercentage: ((totalPurchases / status.totalStock) * 100).toFixed(2),
      });
    } catch (error) {
      console.error('Error in getStats:', error);
      res.status(500).json({
        error: 'Failed to get sale statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default new SaleController();
