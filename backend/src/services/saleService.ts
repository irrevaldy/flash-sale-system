// src/services/saleService.ts

import redisClient from '../config/redis';
import { SaleConfig, SaleStatus } from '../types';
import { INIT_SALE_SCRIPT } from '../utils/luaScripts';

export class SaleService {
  private readonly SALE_CONFIG_KEY = 'sale:config';
  private readonly SALE_STOCK_KEY = 'sale:stock';
  private readonly SALE_PURCHASES_KEY = 'sale:purchases';

  /**
   * Initialize a new flash sale
   */
  async initializeSale(config: SaleConfig): Promise<void> {
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
      if (typeof redisClient.eval === 'function') {
        await redisClient.eval(
          INIT_SALE_SCRIPT,
          2,
          this.SALE_CONFIG_KEY,
          this.SALE_STOCK_KEY,
          config.startTime,
          config.endTime,
          config.totalStock.toString(),
          config.productName
        );
      } else {
        // Fallback for mock Redis
        await redisClient.hset(this.SALE_CONFIG_KEY, 'startTime', config.startTime);
        await redisClient.hset(this.SALE_CONFIG_KEY, 'endTime', config.endTime);
        await redisClient.hset(this.SALE_CONFIG_KEY, 'totalStock', config.totalStock.toString());
        await redisClient.hset(this.SALE_CONFIG_KEY, 'productName', config.productName);
        await redisClient.set(this.SALE_STOCK_KEY, config.totalStock.toString());
      }

      console.log(`✅ Sale initialized: ${config.productName} (${config.totalStock} items)`);
    } catch (error) {
      console.error('Error initializing sale:', error);
      throw error;
    }
  }

  /**
   * Get current sale status
   */
  async getSaleStatus(): Promise<SaleStatus> {
    try {
      const config = await redisClient.hgetall(this.SALE_CONFIG_KEY);
      
      if (!config || !config.startTime) {
        throw new Error('Sale not configured');
      }

      const remainingStock = parseInt(await redisClient.get(this.SALE_STOCK_KEY) || '0');
      const totalStock = parseInt(config.totalStock);
      const now = new Date();
      const startTime = new Date(config.startTime);
      const endTime = new Date(config.endTime);

      let status: SaleStatus['status'];
      
      if (remainingStock <= 0) {
        status = 'sold_out';
      } else if (now < startTime) {
        status = 'upcoming';
      } else if (now > endTime) {
        status = 'ended';
      } else {
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
    } catch (error) {
      console.error('Error getting sale status:', error);
      throw error;
    }
  }

  /**
   * Check if sale is currently active
   */
  async isSaleActive(): Promise<boolean> {
    const status = await this.getSaleStatus();
    return status.status === 'active';
  }

  /**
   * Get remaining stock
   */
  async getRemainingStock(): Promise<number> {
    const stock = await redisClient.get(this.SALE_STOCK_KEY);
    return parseInt(stock || '0');
  }

  /**
   * Reset sale (for testing)
   */
  async resetSale(): Promise<void> {
    await redisClient.del(
      this.SALE_CONFIG_KEY,
      this.SALE_STOCK_KEY,
      this.SALE_PURCHASES_KEY
    );
    console.log('🔄 Sale reset');
  }
}

export default new SaleService();
