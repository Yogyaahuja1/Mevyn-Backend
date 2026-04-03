// Post routes — public listing/detail + authenticated CRUD.
// /drafts/all MUST come before /:identifier to avoid route collision.

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/postsController');

const router = Router();

// Public
router.get('/', ctrl.listPublished);
router.get('/drafts/all', authenticate, ctrl.listAll); // before /:identifier
router.get('/:identifier', ctrl.getByIdentifier);

// Protected
router.post(
  '/',
  authenticate,
  validate({
    title: { required: true, type: 'string', maxLength: 300 },
    body_html: { type: 'string' },
    authors: { type: 'array' },
    anonymous: { type: 'boolean' },
    excerpt: { type: 'string', maxLength: 500 },
    cover_image: { type: 'string' },
    tags: { type: 'array' },
    content_blocks: { type: 'array' },
    status: { type: 'string', enum: ['draft', 'published'] },
  }),
  ctrl.create
);

router.put(
  '/:uuid',
  authenticate,
  validate({
    title: { type: 'string', maxLength: 300 },
    body_html: { type: 'string' },
    authors: { type: 'array' },
    anonymous: { type: 'boolean' },
    excerpt: { type: 'string', maxLength: 500 },
    cover_image: { type: 'string' },
    tags: { type: 'array' },
    content_blocks: { type: 'array' },
    status: { type: 'string', enum: ['draft', 'published'] },
  }),
  ctrl.update
);

router.delete('/:uuid', authenticate, ctrl.softDelete);
router.patch('/:uuid/restore', authenticate, ctrl.restore);

module.exports = router;
