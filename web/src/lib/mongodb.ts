import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;

// Reuse the connection across HMR reloads in dev and across serverless
// invocations in prod by stashing the connect *promise* on globalThis. Caching
// the promise (not just the resolved Db) means two concurrent first-callers
// await the same connect instead of each opening a new MongoClient and churning
// the connection pool.
const globalForMongo = globalThis as unknown as {
  _mongoConnect?: Promise<Db>;
};

async function connect(): Promise<Db> {
  if (!MONGODB_URI) throw new Error("MONGODB_URI is not set");
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  return client.db("geekbid");
}

export function getDb(): Promise<Db> {
  if (!globalForMongo._mongoConnect) {
    globalForMongo._mongoConnect = connect().catch((err) => {
      // Never cache a failed connection — let the next caller retry a fresh one.
      globalForMongo._mongoConnect = undefined;
      throw err;
    });
  }
  return globalForMongo._mongoConnect;
}
