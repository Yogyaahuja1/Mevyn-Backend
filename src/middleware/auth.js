// JWT authentication middleware.
// authenticate — verifies Bearer token, then confirms the account is still active
//                in the DB and attaches req.admin with the CURRENT role/name.
// requireAdmin — checks req.admin.role === 'admin' (use after authenticate)
//
// Why the DB lookup: a JWT is valid until it expires (7d by default), no matter
// what happens to the account. Checking the DB on each request means deactivation,
// role changes and password changes take effect immediately instead of next week.

const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');
const { getDB } = require('../config/db');
const { COLLECTIONS } = require('../helpers/collections');

async function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError(401, 'Authentication required'));
  }

  // Extract token from "Bearer <token>"
  const token = header.split(' ')[1];

  let decoded;
  try {
    // Verify signature + expiration
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(new AppError(401, 'Invalid or expired token'));
  }

  try {
    const admin = await getDB()
      .collection(COLLECTIONS.ADMINS)
      .findOne(
        { uuid: decoded.uuid },
        { projection: { uuid: 1, email: 1, role: 1, name: 1, is_active: 1, password_changed_at: 1 } }
      );

    // Account deleted or deactivated since the token was issued
    if (!admin || !admin.is_active) {
      return next(new AppError(401, 'Account is no longer active'));
    }

    // Token issued before the last password change. iat is whole seconds, so compare
    // at second precision (a login in the same second as the change stays valid).
    if (admin.password_changed_at &&
        decoded.iat < Math.floor(new Date(admin.password_changed_at).getTime() / 1000)) {
      return next(new AppError(401, 'Session expired, please log in again'));
    }

    // Use fresh values from the DB, not the (possibly stale) token payload
    req.admin = { uuid: admin.uuid, email: admin.email, role: admin.role, name: admin.name };
    next();
  } catch (err) {
    next(err);
  }
}

function requireAdmin(req, res, next) {
  if (req.admin.role !== 'admin') {
    return next(new AppError(403, 'Admin access required'));
  }
  next();
}

module.exports = { authenticate, requireAdmin };
