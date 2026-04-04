// Rate limiting middleware for sensitive endpoints (login, password change).
// Uses express-rate-limit with in-memory store (suitable for single-instance deploys).

const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,                   // 15 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many attempts, please try again later', statusCode: 429 } },
});

module.exports = { authLimiter };
