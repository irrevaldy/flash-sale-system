// src/services/purchaseService.ts

import redisClient from '../config/redis';
import { PurchaseResponse, UserPurchaseStatus, ErrorMessages } from '../types';
import { CHECK_AND_PURCHASE_SCRIPT } from '../utils/luaScripts';
import saleService from './saleService';

export class PurchaseService {
  private readonly SALE_STOCK_KEY = 'sale:stock';
  private readonly SALE_PURCHASES_KEY = 'sale:purchases';

  /**
   * Attempt to purchase item for a user
   * Uses atomic Lua script to prevent race conditions
   */
  async attemptPurchase(userId: string): Promise<PurchaseResponse> {
    try {
      // Validate user ID
      if (!userId || userId.trim().length === 0) {
        return {
          success: false,
          message: ErrorMessages.INVALID_USER_ID,
        };
      }

      // Check if sale is active
      const status = await saleService.getSaleStatus();
      
      if (status.status === 'upcoming') {
        return {
          success: false,
          message: ErrorMessages.SALE_NOT_STARTED,
          remainingStock: status.remainingStock,
        };
      }

      if (status.status === 'ended') {
        return {
          success: false,
          message: ErrorMessages.SALE_ENDED,
          remainingStock: status.remainingStock,
        };
      }

      if (status.status === 'sold_out') {
        return {
          success: false,
          message: ErrorMessages.SOLD_OUT,
          remainingStock: 0,
        };
      }

      // Execute atomic purchase using Lua script
      const timestamp = new Date().toISOString();
      const result = await redisClient.eval(
        CHECK_AND_PURCHASE_SCRIPT,
        2,
        this.SALE_STOCK_KEY,
        this.SALE_PURCHASES_KEY,
        userId,
        timestamp
      );

      // Handle result
      if (result === 'ALREADY_PURCHASED') {
        return {
          success: false,
          message: ErrorMessages.ALREADY_PURCHASED,
          remainingStock: await saleService.getRemainingStock(),
        };
      }

      if (result === 'SOLD_OUT') {
        return {
          success: false,
          message: ErrorMessages.SOLD_OUT,
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
    } catch (error) {
      console.error('Error in purchase attempt:', error);
      return {
        success: false,
        message: ErrorMessages.SYSTEM_ERROR,
      };
    }
  }

  /**
   * Check if a user has already purchased
   */
  async checkUserPurchase(userId: string): Promise<UserPurchaseStatus> {
    try {
      const members = await redisClient.smembers(this.SALE_PURCHASES_KEY);
      
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
    } catch (error) {
      console.error('Error checking user purchase:', error);
      throw error;
    }
  }

  /**
   * Get total number of purchases
   */
  async getTotalPurchases(): Promise<number> {
    try {
      const members = await redisClient.smembers(this.SALE_PURCHASES_KEY);
      return members.length;
    } catch (error) {
      console.error('Error getting total purchases:', error);
      return 0;
    }
  }
}

export default new PurchaseService();
