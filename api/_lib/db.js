/* Koneksi MongoDB yang di-cache antar pemanggilan serverless */
'use strict';

const { MongoClient } = require(process.env.MONGO_MODULE || 'mongodb');

const DB_NAME = process.env.MONGODB_DB || 'block_tower_defense';
let clientPromise = null;
let indexesReady = null;

function getClient() {
  if (!process.env.MONGODB_URI) throw Object.assign(new Error('MONGODB_URI belum diatur'), { status: 500 });
  if (!clientPromise) {
    const client = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 });
    clientPromise = client.connect().catch(err => { clientPromise = null; throw err; });
  }
  return clientPromise;
}

async function db() {
  const client = await getClient();
  const d = client.db(DB_NAME);
  if (!indexesReady) indexesReady = ensureIndexes(d).catch(err => { indexesReady = null; console.error('index', err); });
  await indexesReady;
  return d;
}

/** Index dibuat sekali per instance (idempoten) */
async function ensureIndexes(d) {
  await Promise.all([
    d.collection('users').createIndex({ googleId: 1 }, { unique: true, sparse: true }),
    d.collection('users').createIndex({ friendCode: 1 }, { unique: true }),
    d.collection('users').createIndex({ lastSeen: -1 }),
    d.collection('friendships').createIndex({ a: 1, b: 1 }, { unique: true }),
    d.collection('friendships').createIndex({ b: 1, status: 1 }),
    d.collection('rooms').createIndex({ code: 1 }, { unique: true }),
    d.collection('rooms').createIndex({ updatedAt: 1 }, { expireAfterSeconds: 6 * 3600 }),
    d.collection('relay').createIndex({ room: 1, to: 1, _id: 1 }),
    d.collection('relay').createIndex({ createdAt: 1 }, { expireAfterSeconds: 120 }),
    d.collection('invites').createIndex({ to: 1 }),
    d.collection('invites').createIndex({ createdAt: 1 }, { expireAfterSeconds: 600 }),
    d.collection('runs').createIndex({ mode: 1, score: -1 }),
    d.collection('runs').createIndex({ user: 1, score: -1 }),
    d.collection('units').createIndex({ owner: 1 }),
    d.collection('trades').createIndex({ to: 1, status: 1 }),
    d.collection('trades').createIndex({ from: 1, status: 1 }),
    d.collection('payments').createIndex({ user: 1, createdAt: -1 }),
  ]);
}

module.exports = { db };
