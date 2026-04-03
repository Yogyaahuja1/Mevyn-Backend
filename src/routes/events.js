// Event routes — public listing/detail + authenticated CRUD with soft delete.

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/eventsController');

const router = Router();

// Public
router.get('/', ctrl.listEvents);
router.get('/:identifier', ctrl.getByIdentifier);

// Protected
router.post(
  '/',
  authenticate,
  validate({
    title: { required: true, type: 'string', maxLength: 300 },
    date: { required: true, type: 'string' },
    description: { type: 'string' },
    end_date: { type: 'string' },
    location: { type: 'object' },
    cover_image: { type: 'string' },
    registration_url: { type: 'string' },
    is_virtual: { type: 'boolean' },
    status: { type: 'string', enum: ['upcoming', 'cancelled', 'completed'] },
  }),
  ctrl.create
);

router.put(
  '/:uuid',
  authenticate,
  validate({
    title: { type: 'string', maxLength: 300 },
    date: { type: 'string' },
    description: { type: 'string' },
    end_date: { type: 'string' },
    location: { type: 'object' },
    cover_image: { type: 'string' },
    registration_url: { type: 'string' },
    is_virtual: { type: 'boolean' },
    status: { type: 'string', enum: ['upcoming', 'cancelled', 'completed'] },
  }),
  ctrl.update
);

router.delete('/:uuid', authenticate, ctrl.softDelete);
router.patch('/:uuid/restore', authenticate, ctrl.restore);

module.exports = router;
