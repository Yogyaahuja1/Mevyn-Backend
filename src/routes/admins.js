// Admin routes — login, profile, password change, account management.
// /me routes before /:uuid to avoid Express matching "me" as a uuid param.

const { Router } = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/adminsController');

const router = Router();

// Public
router.post(
  '/login',
  validate({
    email: { required: true, type: 'string' },
    password: { required: true, type: 'string' },
  }),
  ctrl.login
);

// Authenticated (any role)
router.get('/me', authenticate, ctrl.getMe);
router.put(
  '/me/password',
  authenticate,
  validate({
    current_password: { required: true, type: 'string' },
    new_password: { required: true, type: 'string' },
  }),
  ctrl.changePassword
);

// Admin-only
router.post(
  '/',
  authenticate,
  requireAdmin,
  validate({
    email: { required: true, type: 'string' },
    password: { required: true, type: 'string' },
    name: { required: true, type: 'string' },
    role: { type: 'string', enum: ['admin', 'editor'] },
  }),
  ctrl.createAdmin
);
router.get('/', authenticate, requireAdmin, ctrl.listAdmins);
router.put('/:uuid', authenticate, requireAdmin, ctrl.updateAdmin);
router.delete('/:uuid', authenticate, requireAdmin, ctrl.deactivateAdmin);

module.exports = router;
