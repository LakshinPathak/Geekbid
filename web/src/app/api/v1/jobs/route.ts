import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { compareSync } from "bcryptjs";
import { ObjectId } from "mongodb";
import crypto from "crypto";

async function authenticateApiKey(req: NextRequest) {
 const apiKey = req.headers.get("x-api-key");
 if (!apiKey) return null;

 const db = await getDb();
 const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

 // Fast indexed lookup by hash — avoids running bcrypt.compareSync against
 // every row in the table on every request (O(n) bcrypt is both slow and a
 // DoS vector as the key table grows).
 const fastMatch = await db.collection("api_keys").findOne({ keyHash, revokedAt: { $exists: false } });
 if (fastMatch) {
 await db.collection("api_keys").updateOne(
 { _id: fastMatch._id },
 { $set: { lastUsedAt: new Date().toISOString() } }
 );
 return fastMatch.userId;
 }

 // Fallback for keys created before the keyHash migration — opportunistically
 // backfills keyHash on first successful use so this path is only ever hit once per key.
 const legacyKeys = await db.collection("api_keys")
 .find({ revokedAt: { $exists: false }, keyHash: { $exists: false } })
 .toArray();
 for (const k of legacyKeys) {
 if (compareSync(apiKey, k.key)) {
 await db.collection("api_keys").updateOne(
 { _id: k._id },
 { $set: { lastUsedAt: new Date().toISOString(), keyHash } }
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

 // Same category whitelist and free-plan job cap as the internal job-creation
 // API — jobs created through the API-key door must follow the same rules as
 // jobs created through the UI, not bypass them.
 const validCategories = ["ai_ml", "web_dev", "mobile", "devops", "security", "data_eng", "blockchain", "design", "qa", "other"];
 const jobCategory = validCategories.includes(category) ? category : "other";

 const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
 if (user) {
 const plan = user.plan ?? "free";
 if (plan === "free") {
 const limits = user.planLimits ?? { jobsPostedThisMonth: 0, monthResetAt: new Date(0).toISOString() };
 if (new Date(limits.monthResetAt) < new Date()) {
 await db.collection("users").updateOne({ _id: user._id }, {
 $set: { "planLimits.jobsPostedThisMonth": 0, "planLimits.bidsPlacedThisMonth": 0, "planLimits.monthResetAt": new Date(Date.now() + 30 * 24 * 3600000).toISOString() }
 });
 } else if (limits.jobsPostedThisMonth >= 3) {
 return NextResponse.json(
 { success: false, error: { code: "ERR_PLAN_LIMIT", message: "Free plan limit: 3 jobs/month. Upgrade to Pro for unlimited." } },
 { status: 403 }
 );
 }
 }
 }

 const now = new Date().toISOString();
 const job = {
 clientId: userId,
 title, description: description ?? "",
 skillsRequired: skillsRequired ?? [],
 startingPrice: Number(startingPrice),
 minimumPrice: Number(minimumPrice),
 decayRatePerHour: Number(decayRatePerHour) || 10,
 estimatedHours: Number(estimatedHours) || 0,
 postedAt: now,
 deadlineAt: deadlineAt ?? new Date(Date.now() + 48 * 3600000).toISOString(),
 status: "open",
 category: jobCategory,
 featured: false,
 visibility: "public",
 // Adaptive pricing fields — required by the pricing engine and feed elsewhere in the app
 pricingMode: body.pricingMode === "fixed" ? "fixed" : "adaptive",
 bidCount: 0,
 uniqueBidderCount: 0,
 lastBidAt: null,
 lowestCounterBid: null,
 priceHistory: [{ price: Number(startingPrice), at: now, event: "posted" }],
 };

 const result = await db.collection("jobs").insertOne(job);

 await db.collection("users").updateOne(
 { _id: new ObjectId(userId) },
 { $inc: { "planLimits.jobsPostedThisMonth": 1 } }
 );

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
