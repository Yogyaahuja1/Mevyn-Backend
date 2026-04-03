// Collection name constants + MongoDB index setup.
// Frozen object prevents accidental name mutations.

const { getDB } = require('../config/db');
const log = require('./logger');

const COLLECTIONS = Object.freeze({
  POSTS: 'posts',
  EVENTS: 'events',
  ADMINS: 'admins',
});

// Creates all required indexes — safe to call on every startup (idempotent)
async function setupIndexes() {
  const db = getDB();

  await db.collection(COLLECTIONS.POSTS).createIndexes([
    { key: { uuid: 1 }, unique: true },
    { key: { slug: 1 }, unique: true },
    { key: { status: 1, published_at: -1 } },
    { key: { tags: 1 } },
    { key: { series: 1 } },
  ]);

  await db.collection(COLLECTIONS.EVENTS).createIndexes([
    { key: { uuid: 1 }, unique: true },
    { key: { slug: 1 }, unique: true },
    { key: { date: 1 } },
    { key: { status: 1, date: 1 } },
  ]);

  await db.collection(COLLECTIONS.ADMINS).createIndexes([
    { key: { uuid: 1 }, unique: true },
    { key: { email: 1 }, unique: true },
  ]);

  log.success('Database indexes ensured');
}

module.exports = { COLLECTIONS, setupIndexes };
