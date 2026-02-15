"use strict";
// src/utils/luaScripts.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.INIT_SALE_SCRIPT = exports.CHECK_AND_PURCHASE_SCRIPT = void 0;
/**
 * Atomic purchase script using Redis Lua
 * This ensures that check-purchase-record happens atomically
 * preventing race conditions and overselling
 */
exports.CHECK_AND_PURCHASE_SCRIPT = `
-- Keys: [1] = stock_key, [2] = purchase_key
-- Args: [1] = userId, [2] = timestamp

local stock_key = KEYS[1]
local purchase_key = KEYS[2]
local user_id = ARGV[1]
local timestamp = ARGV[2]

-- Check if user already purchased
local user_entry = user_id .. ':' .. timestamp
local has_purchased = redis.call('SISMEMBER', purchase_key, user_entry)

if has_purchased == 1 then
    return 'ALREADY_PURCHASED'
end

-- Check stock availability
local stock = tonumber(redis.call('GET', stock_key) or 0)

if stock <= 0 then
    return 'SOLD_OUT'
end

-- Atomically decrement stock and record purchase
redis.call('DECR', stock_key)
redis.call('SADD', purchase_key, user_entry)

-- Return remaining stock
local remaining = tonumber(redis.call('GET', stock_key) or 0)
return remaining
`;
/**
 * Script to initialize sale configuration
 */
exports.INIT_SALE_SCRIPT = `
-- Keys: [1] = config_key, [2] = stock_key
-- Args: [1] = startTime, [2] = endTime, [3] = totalStock, [4] = productName

local config_key = KEYS[1]
local stock_key = KEYS[2]
local start_time = ARGV[1]
local end_time = ARGV[2]
local total_stock = tonumber(ARGV[3])
local product_name = ARGV[4]

-- Set sale configuration
redis.call('HSET', config_key, 'startTime', start_time)
redis.call('HSET', config_key, 'endTime', end_time)
redis.call('HSET', config_key, 'totalStock', total_stock)
redis.call('HSET', config_key, 'productName', product_name)

-- Set initial stock
redis.call('SET', stock_key, total_stock)

return 'OK'
`;
