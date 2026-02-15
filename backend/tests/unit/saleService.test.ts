// tests/unit/saleService.test.ts

import saleService from '../../src/services/saleService';
import redisClient from '../../src/config/redis';

describe('SaleService', () => {
  beforeEach(async () => {
    // Reset Redis before each test
    await saleService.resetSale();
  });

  afterAll(async () => {
    await saleService.resetSale();
  });

  describe('initializeSale', () => {
    it('should initialize a sale with valid config', async () => {
      const config = {
        startTime: '2026-02-14T10:00:00Z',
        endTime: '2026-02-14T12:00:00Z',
        totalStock: 100,
        productName: 'Test Product',
      };

      await saleService.initializeSale(config);

      const status = await saleService.getSaleStatus();
      expect(status.totalStock).toBe(100);
      expect(status.productName).toBe('Test Product');
    });

    it('should throw error if end time is before start time', async () => {
      const config = {
        startTime: '2026-02-14T12:00:00Z',
        endTime: '2026-02-14T10:00:00Z',
        totalStock: 100,
        productName: 'Test Product',
      };

      await expect(saleService.initializeSale(config)).rejects.toThrow();
    });

    it('should throw error if stock is negative', async () => {
      const config = {
        startTime: '2026-02-14T10:00:00Z',
        endTime: '2026-02-14T12:00:00Z',
        totalStock: -10,
        productName: 'Test Product',
      };

      await expect(saleService.initializeSale(config)).rejects.toThrow();
    });
  });

  describe('getSaleStatus', () => {
    it('should return status as "upcoming" before start time', async () => {
      const futureStart = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const futureEnd = new Date(Date.now() + 120 * 60 * 1000).toISOString();

      await saleService.initializeSale({
        startTime: futureStart,
        endTime: futureEnd,
        totalStock: 50,
        productName: 'Future Sale',
      });

      const status = await saleService.getSaleStatus();
      expect(status.status).toBe('upcoming');
    });

    it('should return status as "active" during sale period', async () => {
      const pastStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const futureEnd = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      await saleService.initializeSale({
        startTime: pastStart,
        endTime: futureEnd,
        totalStock: 50,
        productName: 'Active Sale',
      });

      const status = await saleService.getSaleStatus();
      expect(status.status).toBe('active');
    });

    it('should return status as "ended" after end time', async () => {
      const pastStart = new Date(Date.now() - 120 * 60 * 1000).toISOString();
      const pastEnd = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      await saleService.initializeSale({
        startTime: pastStart,
        endTime: pastEnd,
        totalStock: 50,
        productName: 'Ended Sale',
      });

      const status = await saleService.getSaleStatus();
      expect(status.status).toBe('ended');
    });
  });

  describe('isSaleActive', () => {
    it('should return true when sale is active', async () => {
      const pastStart = new Date(Date.now() - 10 * 1000).toISOString();
      const futureEnd = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      await saleService.initializeSale({
        startTime: pastStart,
        endTime: futureEnd,
        totalStock: 50,
        productName: 'Active Sale',
      });

      const isActive = await saleService.isSaleActive();
      expect(isActive).toBe(true);
    });

    it('should return false when sale has not started', async () => {
      const futureStart = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const futureEnd = new Date(Date.now() + 120 * 60 * 1000).toISOString();

      await saleService.initializeSale({
        startTime: futureStart,
        endTime: futureEnd,
        totalStock: 50,
        productName: 'Future Sale',
      });

      const isActive = await saleService.isSaleActive();
      expect(isActive).toBe(false);
    });
  });
});
