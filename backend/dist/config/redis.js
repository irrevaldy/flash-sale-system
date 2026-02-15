"use strict";
// src/config/redis.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
class MockRedis {
    // Singleton pattern
    constructor() {
        this.data = new Map();
        this.sets = new Map();
        this.hashes = new Map(); // Separate storage for hashes
        console.log('[MockRedis] Singleton instance created');
    }
    static getInstance() {
        if (!MockRedis.instance) {
            MockRedis.instance = new MockRedis();
        }
        return MockRedis.instance;
    }
    async get(key) {
        const value = this.data.get(key);
        console.log(`[MockRedis] GET ${key} = ${value || 'null'}`);
        return value || null;
    }
    async set(key, value) {
        this.data.set(key, value);
        console.log(`[MockRedis] SET ${key} = ${value}`);
        return 'OK';
    }
    async hset(key, field, value) {
        if (!this.hashes.has(key)) {
            this.hashes.set(key, new Map());
        }
        const hash = this.hashes.get(key);
        const isNew = !hash.has(field);
        hash.set(field, value);
        console.log(`[MockRedis] HSET ${key}.${field} = ${value}`);
        return isNew ? 1 : 0;
    }
    async hgetall(key) {
        const hash = this.hashes.get(key);
        if (!hash) {
            console.log(`[MockRedis] HGETALL ${key} = {} (not found)`);
            return {};
        }
        const result = {};
        hash.forEach((value, field) => {
            result[field] = value;
        });
        console.log(`[MockRedis] HGETALL ${key} =`, result);
        return result;
    }
    async incr(key) {
        const current = parseInt(this.data.get(key) || '0');
        const newValue = current + 1;
        this.data.set(key, newValue.toString());
        console.log(`[MockRedis] INCR ${key} = ${newValue}`);
        return newValue;
    }
    async decr(key) {
        const current = parseInt(this.data.get(key) || '0');
        const newValue = current - 1;
        this.data.set(key, newValue.toString());
        console.log(`[MockRedis] DECR ${key} = ${newValue}`);
        return newValue;
    }
    async sadd(key, ...members) {
        if (!this.sets.has(key)) {
            this.sets.set(key, new Set());
        }
        const set = this.sets.get(key);
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
    async sismember(key, member) {
        const set = this.sets.get(key);
        const exists = set && set.has(member) ? 1 : 0;
        console.log(`[MockRedis] SISMEMBER ${key} ${member} = ${exists}`);
        return exists;
    }
    async smembers(key) {
        const set = this.sets.get(key);
        const members = set ? Array.from(set) : [];
        console.log(`[MockRedis] SMEMBERS ${key} = ${members.length} members`);
        return members;
    }
    async del(...keys) {
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
    async eval(script, numKeys, ...args) {
        console.log(`[MockRedis] EVAL script execution`);
        // Handle INIT_SALE_SCRIPT
        if (script.includes('HSET') && script.includes('redis.call')) {
            const configKey = args[0];
            const stockKey = args[1];
            const startTime = args[2];
            const endTime = args[3];
            const totalStock = args[4];
            const productName = args[5];
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
            const stockKey = args[0];
            const purchaseKey = args[1];
            const userId = args[2];
            const timestamp = args[3];
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
    async flushall() {
        this.data.clear();
        this.sets.clear();
        this.hashes.clear();
        console.log(`[MockRedis] FLUSHALL - all data cleared`);
        return 'OK';
    }
    async ping() {
        return 'PONG';
    }
}
let redisClient;
const USE_MOCK_REDIS = process.env.USE_MOCK_REDIS === 'true' || !process.env.REDIS_URL;
if (USE_MOCK_REDIS) {
    console.log('📦 Using Mock Redis (in-memory - singleton)');
    redisClient = MockRedis.getInstance();
}
else {
    console.log('🔌 Connecting to Redis...');
    redisClient = new ioredis_1.default(process.env.REDIS_URL, {
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
exports.default = redisClient;
