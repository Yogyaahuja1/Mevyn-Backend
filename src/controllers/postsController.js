// Posts controller — CRUD for blog posts with soft delete, change tracking,
// anonymous author support, and visible/internal metadata separation.

const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../config/db');
const { COLLECTIONS } = require('../helpers/collections');
const { AppError } = require('../middleware/errorHandler');
const log = require('../helpers/logger');

function col() {
  return getDB().collection(COLLECTIONS.POSTS);
}

// Convert title to URL-friendly slug: "My Post!" -> "my-post"
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Generate unique slug, appending -2, -3 etc. if taken
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

// Excludes internal metadata from public responses
const PUBLIC_PROJECTION = {
  _id: 0, created_by: 0, created_at: 0,
  updated_at: 0, deleted_at: 0, change_log: 0,
};

// Wipe authors array if post is marked anonymous
function stripAuthorsIfAnonymous(post) {
  if (post && post.anonymous) post.authors = [];
  return post;
}

// GET /api/posts — public, paginated list of published posts
async function listPublished(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { status: 'published', deleted_at: null };
    if (req.query.tag) filter.tags = req.query.tag;
    if (req.query.series) filter.series = req.query.series;

    // Run data fetch + count in parallel for speed
    const [data, total] = await Promise.all([
      col()
        .find(filter, { projection: PUBLIC_PROJECTION })
        .sort({ published_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      col().countDocuments(filter),
    ]);

    res.json({
      data: data.map(stripAuthorsIfAnonymous),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/posts/:identifier — single published post by slug or uuid
async function getByIdentifier(req, res, next) {
  try {
    const { identifier } = req.params;
    const filter = {
      $or: [{ slug: identifier }, { uuid: identifier }],
      status: 'published',
      deleted_at: null,
    };

    const post = await col().findOne(filter, { projection: PUBLIC_PROJECTION });
    if (!post) throw new AppError(404, 'Post not found');

    res.json(stripAuthorsIfAnonymous(post));
  } catch (err) {
    next(err);
  }
}

// POST /api/posts — create new post (defaults to draft)
async function create(req, res, next) {
  try {
    const {
      title, authors, anonymous, excerpt, cover_image,
      tags, body_html, content_blocks, status, series,
    } = req.body;

    const now = new Date();
    const post = {
      uuid: uuidv4(),
      title,
      slug: await uniqueSlug(title),
      authors: authors || [{ uuid: req.admin.uuid, name: req.admin.name }],
      anonymous: anonymous || false,
      excerpt: excerpt || '',
      cover_image: cover_image || '',
      tags: tags || [],
      series: series || '',
      published_at: status === 'published' ? now : null,
      body_html: body_html || '',
      content_blocks: content_blocks || [],
      status: status || 'draft',
      created_by: req.admin.uuid,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      change_log: [{
        admin_uuid: req.admin.uuid,
        admin_name: req.admin.name,
        action: 'created',
        timestamp: now,
        summary: 'Post created',
      }],
    };

    await col().insertOne(post);
    log.debug(`Post created: "${title}" by ${req.admin.name}`);

    const { _id, ...result } = post;
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

// PUT /api/posts/:uuid — partial update, auto re-slugs on title change
async function update(req, res, next) {
  try {
    const { uuid } = req.params;
    const existing = await col().findOne({ uuid, deleted_at: null });
    if (!existing) throw new AppError(404, 'Post not found');

    const allowed = [
      'title', 'authors', 'anonymous', 'excerpt', 'cover_image',
      'tags', 'body_html', 'content_blocks', 'status', 'series',
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      throw new AppError(400, 'No valid fields to update');
    }

    const now = new Date();
    updates.updated_at = now;

    // Set published_at on first publish only
    if (updates.status === 'published' && !existing.published_at) {
      updates.published_at = now;
    }

    // Re-generate slug if title changed
    if (updates.title && updates.title !== existing.title) {
      updates.slug = await uniqueSlug(updates.title);
    }

    // Append to change log for audit trail
    const logEntry = {
      admin_uuid: req.admin.uuid,
      admin_name: req.admin.name,
      action: 'updated',
      timestamp: now,
      summary: `Updated fields: ${Object.keys(updates).filter(k => k !== 'updated_at').join(', ')}`,
    };

    const result = await col().findOneAndUpdate(
      { uuid },
      { $set: updates, $push: { change_log: logEntry } },
      { returnDocument: 'after', projection: { _id: 0 } }
    );

    log.debug(`Post updated: ${uuid}`);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/posts/:uuid — soft delete (sets deleted_at, keeps data)
async function softDelete(req, res, next) {
  try {
    const { uuid } = req.params;
    const now = new Date();

    const logEntry = {
      admin_uuid: req.admin.uuid,
      admin_name: req.admin.name,
      action: 'deleted',
      timestamp: now,
      summary: 'Post soft-deleted',
    };

    const result = await col().findOneAndUpdate(
      { uuid, deleted_at: null },
      { $set: { deleted_at: now, updated_at: now }, $push: { change_log: logEntry } },
      { returnDocument: 'after', projection: { _id: 0 } }
    );

    if (!result) throw new AppError(404, 'Post not found');
    log.info(`Post soft-deleted: ${uuid}`);
    res.json({ message: 'Post deleted', uuid });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/posts/:uuid/restore — undo soft delete
async function restore(req, res, next) {
  try {
    const { uuid } = req.params;
    const now = new Date();

    const logEntry = {
      admin_uuid: req.admin.uuid,
      admin_name: req.admin.name,
      action: 'restored',
      timestamp: now,
      summary: 'Post restored from deletion',
    };

    const result = await col().findOneAndUpdate(
      { uuid, deleted_at: { $ne: null } },
      { $set: { deleted_at: null, updated_at: now }, $push: { change_log: logEntry } },
      { returnDocument: 'after', projection: { _id: 0 } }
    );

    if (!result) throw new AppError(404, 'Post not found or not deleted');
    log.info(`Post restored: ${uuid}`);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /api/posts/drafts/all — admin view, includes drafts + deleted + internal metadata
async function listAll(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    // ?deleted=true → only deleted | ?deleted=all → everything | omit → active only
    if (req.query.deleted === 'true') {
      filter.deleted_at = { $ne: null };
    } else if (req.query.deleted !== 'all') {
      filter.deleted_at = null;
    }

    const [data, total] = await Promise.all([
      col()
        .find(filter, { projection: { _id: 0 } })
        .sort({ updated_at: -1 })
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

module.exports = {
  listPublished, getByIdentifier, create,
  update, softDelete, restore, listAll,
};
