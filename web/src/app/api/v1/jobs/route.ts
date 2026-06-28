import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { compareSync } from "bcryptjs";

async function authenticateApiKey(req: NextRequest) {
 const apiKey = req.headers.get("x-api-key");
 if (!apiKey) return null;

 const db = await getDb();
 const keys = await db.collection("api_keys")
 .find({ revokedAt: { $exists: false } })
 .toArray();

 for (const k of keys) {
 if (compareSync(apiKey, k.key)) {
 await db.collection("api_keys").updateOne(
 { _id: k._id },
 { $set: { lastUsedAt: new Date().toISOString() } }
 );
 return k.userId;
 }
 }
 return null;
}

// GET /api/v1/jobs — public API endpoint
export async function GET(req: NextRequest) {
 try {
 const userId = await authenticateApiKey(req);
 if (!userId) {
 return NextResponse.json(
 { success: false, error: { code: "ERR_UNAUTHORIZED", message: "Valid API key required via X-API-Key header" } },
 { status: 401 }
 );
 }

 const db = await getDb();
 const { searchParams } = new URL(req.url);
 const status = searchParams.get("status") ?? "open";
 const category = searchParams.get("category");
 const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);
 const page = Math.max(Number(searchParams.get("page")) || 1, 1);

 const filter: Record<string, unknown> = {};
 if (status !== "all") filter.status = status;
 if (category) filter.category = category;

 const [jobs, total] = await Promise.all([
 db.collection("jobs").find(filter).sort({ postedAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
 db.collection("jobs").countDocuments(filter),
 ]);

 return NextResponse.json({
 success: true,
 data: jobs.map(j => ({ ...j, _id: j._id.toString(), id: j._id.toString() })),
 meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
 });
 } catch (err) {
 console.error("[V1 Jobs GET Error]", err);
 return NextResponse.json(
 { success: false, error: { code: "ERR_INTERNAL", message: "Internal server error" } },
 { status: 500 }
 );
 }
}

// POST /api/v1/jobs — create job via public API
export async function POST(req: NextRequest) {
 try {
 const userId = await authenticateApiKey(req);
 if (!userId) {
 return NextResponse.json(
 { success: false, error: { code: "ERR_UNAUTHORIZED", message: "Valid API key required via X-API-Key header" } },
 { status: 401 }
 );
 }

 const body = await req.json();
 const { title, description, skillsRequired, startingPrice, minimumPrice, decayRatePerHour, estimatedHours, deadlineAt, category } = body;

 if (!title || !startingPrice || !minimumPrice) {
 return NextResponse.json(
 { success: false, error: { code: "ERR_VALIDATION", message: "title, startingPrice, and minimumPrice required" } },
 { status: 400 }
 );
 }

 const db = await getDb();
 const job = {
 clientId: userId,
 title, description: description ?? "",
 skillsRequired: skillsRequired ?? [],
 startingPrice: Number(startingPrice),
 minimumPrice: Number(minimumPrice),
 decayRatePerHour: Number(decayRatePerHour) || 10,
 estimatedHours: Number(estimatedHours) || 0,
 postedAt: new Date().toISOString(),
 deadlineAt: deadlineAt ?? new Date(Date.now() + 48 * 3600000).toISOString(),
 status: "open",
 category: category ?? "other",
 featured: false,
 };

 const result = await db.collection("jobs").insertOne(job);

 return NextResponse.json({
 success: true,
 data: { ...job, _id: result.insertedId.toString(), id: result.insertedId.toString() },
 }, { status: 201 });
 } catch (err) {
 console.error("[V1 Jobs POST Error]", err);
 return NextResponse.json(
 { success: false, error: { code: "ERR_INTERNAL", message: "Internal server error" } },
 { status: 500 }
 );
 }
}
