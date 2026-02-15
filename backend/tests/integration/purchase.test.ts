// tests/integration/purchase.test.ts

import request from 'supertest';
import app from '../../src/server';
import saleService from '../../src/services/saleService';

describe('Purchase Integration Tests', () => {
  beforeEach(async () => {
    // Reset and initialize sale before each test
    await saleService.resetSale();
    
    const pastStart = new Date(Date.now() - 10 * 1000).toISOString();
    const futureEnd = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await saleService.initializeSale({
      startTime: pastStart,
      endTime: futureEnd,
      totalStock: 10,
      productName: 'Test Product',
    });
  });

  afterAll(async () => {
    await saleService.resetSale();
  });

  describe('POST /api/sale/purchase', () => {
    it('should successfully purchase when sale is active', async () => {
      const response = await request(app)
        .post('/api/sale/purchase')
        .send({ userId: 'user1@test.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('successful');
      expect(response.body.remainingStock).toBe(9);
    });

    it('should prevent duplicate purchase by same user', async () => {
      // First purchase
      await request(app)
        .post('/api/sale/purchase')
        .send({ userId: 'user2@test.com' })
        .expect(200);

      // Second purchase attempt
      const response = await request(app)
        .post('/api/sale/purchase')
        .send({ userId: 'user2@test.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already purchased');
    });

    it('should handle concurrent purchases correctly', async () => {
      const users = Array.from({ length: 10 }, (_, i) => `user${i}@test.com`);
      
      // Simulate concurrent purchases
      const purchasePromises = users.map(userId =>
        request(app)
          .post('/api/sale/purchase')
          .send({ userId })
      );

      const results = await Promise.all(purchasePromises);
      
      const successCount = results.filter(r => r.body.success).length;
      expect(successCount).toBe(10); // All should succeed as stock is 10

      // Check final status
      const statusResponse = await request(app)
        .get('/api/sale/status')
        .expect(200);

      expect(statusResponse.body.remainingStock).toBe(0);
      expect(statusResponse.body.status).toBe('sold_out');
    });

    it('should reject purchase when stock is sold out', async () => {
      // Buy all stock
      const users = Array.from({ length: 10 }, (_, i) => `user${i}@test.com`);
      await Promise.all(
        users.map(userId =>
          request(app)
            .post('/api/sale/purchase')
            .send({ userId })
        )
      );

      // Try to purchase when sold out
      const response = await request(app)
        .post('/api/sale/purchase')
        .send({ userId: 'lateuser@test.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('sold out');
    });

    it('should reject purchase without userId', async () => {
      const response = await request(app)
        .post('/api/sale/purchase')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/sale/status', () => {
    it('should return current sale status', async () => {
      const response = await request(app)
        .get('/api/sale/status')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('totalStock');
      expect(response.body).toHaveProperty('remainingStock');
      expect(response.body).toHaveProperty('productName');
      expect(response.body.totalStock).toBe(10);
    });
  });

  describe('GET /api/sale/user/:userId', () => {
    it('should return false for user who has not purchased', async () => {
      const response = await request(app)
        .get('/api/sale/user/newuser@test.com')
        .expect(200);

      expect(response.body.hasPurchased).toBe(false);
    });

    it('should return true for user who has purchased', async () => {
      // Make purchase
      await request(app)
        .post('/api/sale/purchase')
        .send({ userId: 'buyer@test.com' })
        .expect(200);

      // Check status
      const response = await request(app)
        .get('/api/sale/user/buyer@test.com')
        .expect(200);

      expect(response.body.hasPurchased).toBe(true);
      expect(response.body.purchaseTime).toBeDefined();
    });
  });

  describe('Race Condition Prevention', () => {
    it('should not oversell with concurrent requests for same user', async () => {
      // Multiple simultaneous requests from same user
      const purchasePromises = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/sale/purchase')
          .send({ userId: 'sameuser@test.com' })
      );

      const results = await Promise.all(purchasePromises);
      
      // Only one should succeed
      const successCount = results.filter(r => r.body.success).length;
      expect(successCount).toBe(1);

      // Stock should decrease by exactly 1
      const statusResponse = await request(app)
        .get('/api/sale/status')
        .expect(200);

      expect(statusResponse.body.remainingStock).toBe(9);
    });
  });
});
