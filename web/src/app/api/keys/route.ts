import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { hashSync } from "bcryptjs";

function generateApiKey(): string {
 const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
 let key = "gbk_";
 for (let i = 0; i < 32; i++) {
 key += chars.charAt(Math.floor(Math.random() * chars.length));
 }
 return key;
}

// GET /api/keys — list user's API keys (masked)
export async function GET(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const db = await getDb();
 const keys = await db
 .collection("api_keys")
 .find({ userId: auth.payload.userId, revokedAt: { $exists: false } })
 .sort({ createdAt: -1 })
 .toArray();

 return NextResponse.json(
 keys.map((k) => ({
 _id: k._id.toString(),
 id: k._id.toString(),
 name: k.name,
 prefix: k.prefix,
 lastUsedAt: k.lastUsedAt,
 createdAt: k.createdAt,
 }))
 );
 } catch (err) {
 console.error("[Keys GET Error]", err);
 return NextResponse.json({ error: "Failed to fetch keys" }, { status: 500 });
 }
}

// POST /api/keys — generate new API key
export async function POST(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const body = await req.json();
 const { name } = body;

 if (!name) return NextResponse.json({ error: "Key name required" }, { status: 400 });

 const rawKey = generateApiKey();
 const hashedKey = hashSync(rawKey, 10);
 const prefix = rawKey.slice(0, 8) + "...";

 const db = await getDb();
 const doc = {
 userId: auth.payload.userId,
 key: hashedKey,
 prefix,
 name: name.trim().slice(0, 50),
 createdAt: new Date().toISOString(),
 };

 const result = await db.collection("api_keys").insertOne(doc);

 return NextResponse.json({
 id: result.insertedId.toString(),
 name: doc.name,
 key: rawKey,
 prefix,
 createdAt: doc.createdAt,
 warning: "This is the only time you will see this key. Store it securely.",
 }, { status: 201 });
 } catch (err) {
 console.error("[Keys POST Error]", err);
 return NextResponse.json({ error: "Failed to generate key" }, { status: 500 });
 }
}

// DELETE /api/keys — revoke an API key
export async function DELETE(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const { searchParams } = new URL(req.url);
 const keyId = searchParams.get("id");
 if (!keyId) return NextResponse.json({ error: "Key id required" }, { status: 400 });

 const db = await getDb();
 const result = await db.collection("api_keys").updateOne(
 { _id: new ObjectId(keyId), userId: auth.payload.userId },
 { $set: { revokedAt: new Date().toISOString() } }
 );

 if (result.matchedCount === 0) {
 return NextResponse.json({ error: "Key not found" }, { status: 404 });
 }

 return NextResponse.json({ ok: true });
 } catch (err) {
 console.error("[Keys DELETE Error]", err);
 return NextResponse.json({ error: "Failed to revoke key" }, { status: 500 });
 }
}
