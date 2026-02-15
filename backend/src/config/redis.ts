// src/config/redis.ts

import Redis from 'ioredis';

class MockRedis {
  private static instance: MockRedis;
  private data: Map<string, any> = new Map();
  private sets: Map<string, Set<string>> = new Map();
  private hashes: Map<string, Map<string, string>> = new Map(); // Separate storage for hashes

  // Singleton pattern
  private constructor() {
    console.log('[MockRedis] Singleton instance created');
  }

  public static getInstance(): MockRedis {
    if (!MockRedis.instance) {
      MockRedis.instance = new MockRedis();
    }
    return MockRedis.instance;
  }

  async get(key: string): Promise<string | null> {
    const value = this.data.get(key);
    console.log(`[MockRedis] GET ${key} = ${value || 'null'}`);
    return value || null;
  }

  async set(
    key: string,
    value: string,
    mode?: string,
    duration?: number
  ): Promise<'OK'> {
    this.data.set(key, value);
    console.log(`[MockRedis] SET ${key} = ${value}`);

    // Ignore expiration logic for mock (optional to implement)
    return 'OK';
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    if (!this.hashes.has(key)) {
      this.hashes.set(key, new Map());
    }
    const hash = this.hashes.get(key)!;
    const isNew = !hash.has(field);
    hash.set(field, value);
    console.log(`[MockRedis] HSET ${key}.${field} = ${value}`);
    return isNew ? 1 : 0;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const hash = this.hashes.get(key);
    if (!hash) {
      console.log(`[MockRedis] HGETALL ${key} = {} (not found)`);
      return {};
    }
    const result: Record<string, string> = {};
    hash.forEach((value, field) => {
      result[field] = value;
    });
    console.log(`[MockRedis] HGETALL ${key} =`, result);
    return result;
  }

  async incr(key: string): Promise<number> {
    const current = parseInt(this.data.get(key) || '0');
    const newValue = current + 1;
    this.data.set(key, newValue.toString());
    console.log(`[MockRedis] INCR ${key} = ${newValue}`);
    return newValue;
  }

  async decr(key: string): Promise<number> {
    const current = parseInt(this.data.get(key) || '0');
    const newValue = current - 1;
    this.data.set(key, newValue.toString());
    console.log(`[MockRedis] DECR ${key} = ${newValue}`);
    return newValue;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set());
    }
    const set = this.sets.get(key)!;
    let added = 0;
    members.forEach(member => {
      if (!set.has(member)) {
        set.add(member);
        added++;
      }
    });
    console.log(`[MockRedis] SADD ${key} added ${added} members`);
    return added;
  }

  async sismember(key: string, member: string): Promise<number> {
    const set = this.sets.get(key);
    const exists = set && set.has(member) ? 1 : 0;
    console.log(`[MockRedis] SISMEMBER ${key} ${member} = ${exists}`);
    return exists;
  }

  async smembers(key: string): Promise<string[]> {
    const set = this.sets.get(key);
    const members = set ? Array.from(set) : [];
    console.log(`[MockRedis] SMEMBERS ${key} = ${members.length} members`);
    return members;
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    keys.forEach(key => {
      if (this.data.has(key)) {
        this.data.delete(key);
        deleted++;
      }
      if (this.sets.has(key)) {
        this.sets.delete(key);
        deleted++;
      }
      if (this.hashes.has(key)) {
        this.hashes.delete(key);
        deleted++;
      }
    });
    console.log(`[MockRedis] DEL deleted ${deleted} keys`);
    return deleted;
  }

  async eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<any> {
    console.log(`[MockRedis] EVAL script execution`);
    
    // Handle INIT_SALE_SCRIPT
    if (script.includes('HSET') && script.includes('redis.call')) {
      const configKey = args[0] as string;
      const stockKey = args[1] as string;
      const startTime = args[2] as string;
      const endTime = args[3] as string;
      const totalStock = args[4] as string;
      const productName = args[5] as string;

      console.log(`[MockRedis] Executing INIT_SALE_SCRIPT`);
      
      // Execute the initialization
      await this.hset(configKey, 'startTime', startTime);
      await this.hset(configKey, 'endTime', endTime);
      await this.hset(configKey, 'totalStock', totalStock);
      await this.hset(configKey, 'productName', productName);
      await this.set(stockKey, totalStock);
      
      console.log(`[MockRedis] INIT_SALE_SCRIPT completed`);
      return 'OK';
    }
    
    // Handle CHECK_AND_PURCHASE_SCRIPT
    if (script.includes('check_and_purchase') || script.includes('SISMEMBER')) {
      const stockKey = args[0] as string;
      const purchaseKey = args[1] as string;
      const userId = args[2] as string;
      const timestamp = args[3] as string;

      // Check if user already purchased by looking for any entry starting with userId
      const members = await this.smembers(purchaseKey);
      const hasPurchased = members.some(member => member.startsWith(userId + ':'));
      
      if (hasPurchased) {
        console.log(`[MockRedis] User ${userId} already purchased`);
        return 'ALREADY_PURCHASED';
      }

      // Check stock
      const stock = parseInt(await this.get(stockKey) || '0');
      if (stock <= 0) {
        console.log(`[MockRedis] Stock sold out`);
        return 'SOLD_OUT';
      }

      // Atomic decrement and add to purchase set
      await this.decr(stockKey);
      await this.sadd(purchaseKey, `${userId}:${timestamp}`);
      
      const remainingStock = parseInt(await this.get(stockKey) || '0');
      console.log(`[MockRedis] Purchase successful, remaining: ${remainingStock}`);
      return remainingStock;
    }

    return null;
  }

  async flushall(): Promise<'OK'> {
    this.data.clear();
    this.sets.clear();
    this.hashes.clear();
    console.log(`[MockRedis] FLUSHALL - all data cleared`);
    return 'OK';
  }

  async ping(): Promise<'PONG'> {
    return 'PONG';
  }
}

let redisClient: Redis | MockRedis;

const USE_MOCK_REDIS = process.env.USE_MOCK_REDIS === 'true' || !process.env.REDIS_URL;

if (USE_MOCK_REDIS) {
  console.log('📦 Using Mock Redis (in-memory - singleton)');
  redisClient = MockRedis.getInstance();
} else {
  console.log('🔌 Connecting to Redis...');
  redisClient = new Redis(process.env.REDIS_URL!, {
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  });

  redisClient.on('connect', () => {
    console.log('✅ Redis connected');
  });

  redisClient.on('error', (err) => {
    console.error('❌ Redis error:', err);
  });
}

export default redisClient;
