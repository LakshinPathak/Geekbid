const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

let cachedClient = null;
let cachedDb = null;

/**
 * Returns a singleton MongoDB database connection.
 * Reuses the connection across requests to avoid exhausting pool.
 * @returns {Promise<import('mongodb').Db>}
 */
async function getDb() {
  if (cachedDb) return cachedDb;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set in environment variables');
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  cachedClient = client;
  cachedDb = client.db('geekbid');

  console.log('[mongodb] Connected to geekbid database');
  return cachedDb;
}

/**
 * Graceful shutdown — closes the MongoDB connection.
 */
async function closeDb() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
    console.log('[mongodb] Connection closed');
  }
}

module.exports = { getDb, closeDb };
