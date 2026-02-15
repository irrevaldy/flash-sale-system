"use strict";
// src/middleware/rateLimiter.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusLimiter = exports.purchaseLimiter = exports.apiLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Determine if we're in test environment
const isTest = process.env.NODE_ENV === 'test';
/**
 * General API rate limiter
 * Prevents abuse by limiting requests per IP
 */
exports.apiLimiter = (0, express_rate_limit_1.default)({
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
exports.purchaseLimiter = (0, express_rate_limit_1.default)({
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
exports.statusLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: isTest ? 1000 : 60, // Much higher limit in tests
    message: 'Too many status requests, please slow down',
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isTest, // Skip rate limiting entirely in test mode
});
