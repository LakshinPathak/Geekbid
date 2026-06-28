import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getDb(): Promise<Db> {
 if (cachedDb) return cachedDb;
 const client = new MongoClient(MONGODB_URI);
 await client.connect();
 cachedClient = client;
 cachedDb = client.db("geekbid");
 return cachedDb;
}
