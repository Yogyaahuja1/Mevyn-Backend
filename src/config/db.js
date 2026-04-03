// MongoDB connection module — connects once on startup, shares via getDB().

const { MongoClient } = require('mongodb');
const log = require('../helpers/logger');

let db = null;

async function connectDB() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  db = client.db(process.env.DB_NAME);
  log.success(`Connected to MongoDB: ${process.env.DB_NAME}`);
  return db;
}

function getDB() {
  if (!db) throw new Error('Database not connected. Call connectDB() first.');
  return db;
}

module.exports = { connectDB, getDB };
