'use strict';

const rateLimit = require('express-rate-limit');

/**
 * Global API rate limiter:
 * 120 requests per minute per IP
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down and try again later.' },
});

/**
 * Strict limiter for sensitive authentication endpoints:
 * 10 attempts per 15 minutes per IP (protects against brute force & credential stuffing)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
});

/**
 * Report submission limiter:
 * 15 reports per 10 minutes per IP (prevents spam and quota exhaustion)
 */
const reportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'You are submitting reports too quickly. Please wait a moment.' },
});

module.exports = {
  apiLimiter,
  authLimiter,
  reportLimiter,
};
