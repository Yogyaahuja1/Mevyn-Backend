// Events controller — CRUD for upcoming events with soft delete.

const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../config/db');
const { COLLECTIONS } = require('../helpers/collections');
const { AppError } = require('../middleware/errorHandler');
const log = require('../helpers/logger');

function col() {
  return getDB().collection(COLLECTIONS.EVENTS);
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function uniqueSlug(base) {
  let slug = slugify(base);
  let existing = await col().findOne({ slug });
  let suffix = 2;
  while (existing) {
    slug = `${slugify(base)}-${suffix}`;
    existing = await col().findOne({ slug });
    suffix++;
  }
  return slug;
}

// GET /api/events — public, paginated, sorted soonest-first
async function listEvents(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { deleted_at: null };
    if (req.query.status) filter.status = req.query.status;

    const [data, total] = await Promise.all([
      col()
        .find(filter, { projection: { _id: 0, deleted_at: 0, created_by: 0 } })
        .sort({ date: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      col().countDocuments(filter),
    ]);

    res.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/events/:identifier — single event by slug or uuid
async function getByIdentifier(req, res, next) {
  try {
    const { identifier } = req.params;
    const filter = {
      $or: [{ slug: identifier }, { uuid: identifier }],
      deleted_at: null,
    };

    const event = await col().findOne(filter, {
      projection: { _id: 0, deleted_at: 0, created_by: 0 },
    });
    if (!event) throw new AppError(404, 'Event not found');

    res.json(event);
  } catch (err) {
    next(err);
  }
}

// POST /api/events — create new event
async function create(req, res, next) {
  try {
    const {
      title, description, date, end_date, location,
      cover_image, registration_url, is_virtual, status,
    } = req.body;

    const now = new Date();
    const event = {
      uuid: uuidv4(),
      title,
      slug: await uniqueSlug(title),
      description: description || '',
      date: new Date(date),
      end_date: end_date ? new Date(end_date) : null,
      location: location || {},
      cover_image: cover_image || '',
      registration_url: registration_url || '',
      is_virtual: is_virtual || false,
      status: status || 'upcoming',
      created_by: req.admin.uuid,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    await col().insertOne(event);
    log.debug(`Event created: "${title}"`);

    const { _id, ...result } = event;
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

// PUT /api/events/:uuid — partial update
async function update(req, res, next) {
  try {
    const { uuid } = req.params;
    const existing = await col().findOne({ uuid, deleted_at: null });
    if (!existing) throw new AppError(404, 'Event not found');

    const allowed = [
      'title', 'description', 'date', 'end_date', 'location',
      'cover_image', 'registration_url', 'is_virtual', 'status',
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        // Convert date strings to Date objects
        if (key === 'date' || key === 'end_date') {
          updates[key] = req.body[key] ? new Date(req.body[key]) : null;
        } else {
          updates[key] = req.body[key];
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new AppError(400, 'No valid fields to update');
    }

    updates.updated_at = new Date();

    if (updates.title && updates.title !== existing.title) {
      updates.slug = await uniqueSlug(updates.title);
    }

    const result = await col().findOneAndUpdate(
      { uuid },
      { $set: updates },
      { returnDocument: 'after', projection: { _id: 0 } }
    );

    log.debug(`Event updated: ${uuid}`);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/events/:uuid — soft delete
async function softDelete(req, res, next) {
  try {
    const { uuid } = req.params;
    const now = new Date();

    const result = await col().findOneAndUpdate(
      { uuid, deleted_at: null },
      { $set: { deleted_at: now, updated_at: now } },
      { returnDocument: 'after', projection: { _id: 0 } }
    );

    if (!result) throw new AppError(404, 'Event not found');
    log.info(`Event soft-deleted: ${uuid}`);
    res.json({ message: 'Event deleted', uuid });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/events/:uuid/restore — undo soft delete
async function restore(req, res, next) {
  try {
    const { uuid } = req.params;
    const now = new Date();

    const result = await col().findOneAndUpdate(
      { uuid, deleted_at: { $ne: null } },
      { $set: { deleted_at: null, updated_at: now } },
      { returnDocument: 'after', projection: { _id: 0 } }
    );

    if (!result) throw new AppError(404, 'Event not found or not deleted');
    log.info(`Event restored: ${uuid}`);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listEvents, getByIdentifier, create,
  update, softDelete, restore,
};
