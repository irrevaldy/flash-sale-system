// src/middleware/rateLimiter.ts

import rateLimit from 'express-rate-limit';

// Determine if we're in test environment
const isTest = process.env.NODE_ENV === 'test';

/**
 * General API rate limiter
 * Prevents abuse by limiting requests per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 1000 : 100, // Much higher limit in tests
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest, // Skip rate limiting entirely in test mode
});

/**
 * Strict limiter for purchase endpoint
 * Prevents spam purchases
 */
export const purchaseLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTest ? 1000 : 10, // Much higher limit in tests
  message: 'Too many purchase attempts, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skip: () => isTest, // Skip rate limiting entirely in test mode
});

/**
 * Lenient limiter for status checks
 */
export const statusLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTest ? 1000 : 60, // Much higher limit in tests
  message: 'Too many status requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest, // Skip rate limiting entirely in test mode
});
