// Startup health checks — runs after boot to verify DB, indexes, seed admin, and routes.
// Server still starts even if tests fail; failures are logged as warnings.

const http = require('http');
const log = require('../helpers/logger');
const { getDB } = require('../config/db');
const { COLLECTIONS } = require('../helpers/collections');

async function testDBConnection() {
  try {
    await getDB().command({ ping: 1 });
    return { passed: true, label: 'Database connection' };
  } catch (err) {
    return { passed: false, label: 'Database connection', detail: err.message };
  }
}

async function testCollectionsExist() {
  try {
    const collections = await getDB().listCollections().toArray();
    const names = collections.map((c) => c.name);
    const missing = Object.values(COLLECTIONS).filter((n) => !names.includes(n));

    if (missing.length === 0) return { passed: true, label: 'Collections exist' };
    return {
      passed: false,
      label: 'Collections exist',
      detail: `Missing: ${missing.join(', ')} (created on first insert)`,
    };
  } catch (err) {
    return { passed: false, label: 'Collections exist', detail: err.message };
  }
}

async function testIndexes() {
  try {
    const db = getDB();
    const expected = {
      [COLLECTIONS.POSTS]: ['uuid', 'slug', 'tags'],
      [COLLECTIONS.EVENTS]: ['uuid', 'slug', 'date'],
      [COLLECTIONS.ADMINS]: ['uuid', 'email'],
    };

    const problems = [];

    // Iterate through each collection and check for expected index keys
    for (const [colName, keys] of Object.entries(expected)) {
      const indexes = await db.collection(colName).indexes();
      const indexedFields = indexes.flatMap((i) => Object.keys(i.key));
      for (const key of keys) {
        if (!indexedFields.includes(key)) problems.push(`${colName}.${key}`);
      }
    }

    if (problems.length === 0) return { passed: true, label: 'Database indexes' };
    return { passed: false, label: 'Database indexes', detail: `Missing: ${problems.join(', ')}` };
  } catch (err) {
    return { passed: false, label: 'Database indexes', detail: err.message };
  }
}

async function testSeedAdmin() {
  try {
    const count = await getDB().collection(COLLECTIONS.ADMINS).countDocuments();
    if (count > 0) {
      return { passed: true, label: `Seed admin (${count} account${count > 1 ? 's' : ''})` };
    }
    return { passed: false, label: 'Seed admin', detail: 'No admin accounts found' };
  } catch (err) {
    return { passed: false, label: 'Seed admin', detail: err.message };
  }
}

// Hit our own endpoints to verify they respond
async function testRoutes(port) {
  const routes = [
    { path: '/', expected: 200 },
    { path: '/api/posts', expected: 200 },
    { path: '/api/events', expected: 200 },
  ];

  const results = [];
  for (const route of routes) {
    try {
      const status = await makeRequest(port, route.path);
      results.push({
        passed: status === route.expected,
        label: `GET ${route.path} → ${status}`,
        detail: status !== route.expected ? `Expected ${route.expected}` : undefined,
      });
    } catch (err) {
      results.push({ passed: false, label: `GET ${route.path}`, detail: err.message });
    }
  }
  return results;
}

// Simple HTTP GET that returns status code
function makeRequest(port, path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${port}${path}`, (res) => {
      resolve(res.statusCode);
      res.resume();
    });
    req.on('error', reject);
    req.setTimeout(3000, () => {
      req.destroy();
      reject(new Error('Timed out'));
    });
  });
}

async function runStartupTests(port) {
  log.header('STARTUP TESTS');

  const results = [
    await testDBConnection(),
    await testCollectionsExist(),
    await testIndexes(),
    await testSeedAdmin(),
    ...(await testRoutes(port)),
  ];

  // Print each result
  for (const r of results) {
    log.testResult(r.passed, r.label, r.detail);
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log();
  log.divider();

  if (failed === 0) {
    log.success(`All ${results.length} startup tests passed`);
  } else {
    log.warn(`${passed}/${results.length} passed, ${failed} failed`);
  }

  return failed === 0;
}

module.exports = { runStartupTests };
