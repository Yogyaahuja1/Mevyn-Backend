// Admins controller — login, CRUD for admin/editor accounts, seed admin.
// Passwords are bcrypt-hashed, never returned in responses.

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../config/db');
const { COLLECTIONS } = require('../helpers/collections');
const { AppError } = require('../middleware/errorHandler');
const log = require('../helpers/logger');

const SALT_ROUNDS = 12;

function col() {
  return getDB().collection(COLLECTIONS.ADMINS);
}

// Exclude password_hash from all query results
const SAFE_PROJECTION = { password_hash: 0 };

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const admin = await col().findOne({ email });

    // Same error for missing/inactive/wrong-password to prevent email enumeration
    if (!admin || !admin.is_active) {
      throw new AppError(401, 'Invalid credentials');
    }

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) throw new AppError(401, 'Invalid credentials');

    // Sign JWT with admin identity
    const token = jwt.sign(
      { uuid: admin.uuid, email: admin.email, role: admin.role, name: admin.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    await col().updateOne({ _id: admin._id }, { $set: { last_login_at: new Date() } });
    log.debug(`Admin logged in: ${email}`);
    res.json({ token });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const admin = await col().findOne({ uuid: req.admin.uuid }, { projection: SAFE_PROJECTION });
    if (!admin) throw new AppError(404, 'Account not found');
    res.json(admin);
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;
    const admin = await col().findOne({ uuid: req.admin.uuid });
    if (!admin) throw new AppError(404, 'Account not found');

    const valid = await bcrypt.compare(current_password, admin.password_hash);
    if (!valid) throw new AppError(401, 'Current password is incorrect');

    const password_hash = await bcrypt.hash(new_password, SALT_ROUNDS);
    await col().updateOne(
      { _id: admin._id },
      { $set: { password_hash, updated_at: new Date() } }
    );

    log.info(`Password changed for: ${admin.email}`);
    res.json({ message: 'Password updated' });
  } catch (err) {
    next(err);
  }
}

async function createAdmin(req, res, next) {
  try {
    const { email, password, name, role } = req.body;

    const existing = await col().findOne({ email });
    if (existing) throw new AppError(409, 'Email already in use');

    const now = new Date();
    const admin = {
      uuid: uuidv4(),
      email,
      password_hash: await bcrypt.hash(password, SALT_ROUNDS),
      name,
      role: role || 'editor',
      is_active: true,
      created_at: now,
      updated_at: now,
      last_login_at: null,
    };

    await col().insertOne(admin);
    log.info(`Admin created: ${email} (${admin.role})`);

    // Strip password_hash before returning
    const { password_hash, ...safe } = admin;
    res.status(201).json(safe);
  } catch (err) {
    next(err);
  }
}

async function listAdmins(req, res, next) {
  try {
    const admins = await col().find({}, { projection: SAFE_PROJECTION }).toArray();
    res.json(admins);
  } catch (err) {
    next(err);
  }
}

async function updateAdmin(req, res, next) {
  try {
    const { uuid } = req.params;
    const updates = {};
    const allowed = ['name', 'email', 'role', 'is_active'];

    // Whitelist approach — ignore any fields not in the allowed list
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      throw new AppError(400, 'No valid fields to update');
    }

    updates.updated_at = new Date();

    const result = await col().findOneAndUpdate(
      { uuid },
      { $set: updates },
      { returnDocument: 'after', projection: SAFE_PROJECTION }
    );

    if (!result) throw new AppError(404, 'Admin not found');
    log.debug(`Admin updated: ${uuid}`);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function deactivateAdmin(req, res, next) {
  try {
    const { uuid } = req.params;

    // Prevent locking yourself out
    if (uuid === req.admin.uuid) {
      throw new AppError(400, 'Cannot deactivate your own account');
    }

    const result = await col().findOneAndUpdate(
      { uuid },
      { $set: { is_active: false, updated_at: new Date() } },
      { returnDocument: 'after', projection: SAFE_PROJECTION }
    );

    if (!result) throw new AppError(404, 'Admin not found');
    log.warn(`Admin deactivated: ${result.email}`);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// Creates initial admin on first startup if no admins exist
async function seedAdmin() {
  const count = await col().countDocuments();
  if (count > 0) return;

  const email = process.env.SEED_ADMIN_EMAIL || 'admin@mevyn.com';
  const password = process.env.SEED_ADMIN_PASSWORD || 'changeme123';

  const now = new Date();
  await col().insertOne({
    uuid: uuidv4(),
    email,
    password_hash: await bcrypt.hash(password, SALT_ROUNDS),
    name: 'Admin',
    role: 'admin',
    is_active: true,
    created_at: now,
    updated_at: now,
    last_login_at: null,
  });

  log.warn(`Seed admin created: ${email} (change the password!)`);
}

module.exports = {
  login, getMe, changePassword, createAdmin,
  listAdmins, updateAdmin, deactivateAdmin, seedAdmin,
};
