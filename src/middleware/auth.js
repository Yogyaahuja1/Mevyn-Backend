// JWT authentication middleware.
// authenticate — verifies Bearer token, attaches req.admin
// requireAdmin — checks req.admin.role === 'admin' (use after authenticate)

const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');

function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError(401, 'Authentication required'));
  }

  // Extract token from "Bearer <token>"
  const token = header.split(' ')[1];

  try {
    // Verify signature + expiration, decode payload into req.admin
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded; // { uuid, email, role, name, iat, exp }
    next();
  } catch (err) {
    next(new AppError(401, 'Invalid or expired token'));
  }
}

function requireAdmin(req, res, next) {
  if (req.admin.role !== 'admin') {
    return next(new AppError(403, 'Admin access required'));
  }
  next();
}

module.exports = { authenticate, requireAdmin };
