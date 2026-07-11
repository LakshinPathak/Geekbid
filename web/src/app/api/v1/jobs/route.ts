import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { compareSync } from "bcryptjs";
import { ObjectId } from "mongodb";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/sanitize";
import { getPlanConfig, getPlanConfigWithOverrides } from "@/lib/plans";

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

 // API access itself is a paid feature — a free-tier user who somehow still
 // holds an api_keys row (e.g. downgraded after generating one) must not be
 // able to use it.
 const apiUser = await db.collection("users").findOne({ _id: new ObjectId(userId) });
 const apiConfig = getPlanConfig(apiUser?.plan);
 if (!apiConfig.hasApiAccess) {
 return NextResponse.json(
 { success: false, error: { code: "ERR_PLAN_LIMIT", message: "API access requires a Plus or Premium plan." } },
 { status: 403 }
 );
 }

 // Per-key throttle — this is the only door into the app that isn't behind
 // a browser session, so nothing else bounds how fast a script can call it.
 if (!(await checkRateLimit(`v1:${userId}`, apiConfig.apiRateLimit, 60 * 1000))) {
 return NextResponse.json(
 { success: false, error: { code: "ERR_RATE_LIMITED", message: "Too many requests. Try again shortly." } },
 { status: 429 }
 );
 }

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

 const db = await getDb();

 // Same category whitelist and job cap as the internal job-creation API —
 // jobs created through the API-key door must follow the same rules as jobs
 // created through the UI, not bypass them.
 const validCategories = ["ai_ml", "web_dev", "mobile", "devops", "security", "data_eng", "blockchain", "design", "writing", "video", "qa", "other"];

 const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
 const config = await getPlanConfigWithOverrides(user?.plan, db);

 // API access itself is a paid feature — a free-tier user who somehow still
 // holds an api_keys row (e.g. downgraded after generating one) must not be
 // able to use it.
 if (!config.hasApiAccess) {
 return NextResponse.json(
 { success: false, error: { code: "ERR_PLAN_LIMIT", message: "API access requires a Plus or Premium plan." } },
 { status: 403 }
 );
 }

 // Per-key throttle — this is the only door into the app that isn't behind
 // a browser session, so nothing else bounds how fast a script can call it.
 if (!(await checkRateLimit(`v1:${userId}`, config.apiRateLimit, 60 * 1000))) {
 return NextResponse.json(
 { success: false, error: { code: "ERR_RATE_LIMITED", message: "Too many requests. Try again shortly." } },
 { status: 429 }
 );
 }

 const body = await req.json();
 const { title, description, skillsRequired, startingPrice, minimumPrice, decayRatePerHour, estimatedHours, deadlineAt, category } = body;

 if (!title) {
 return NextResponse.json(
 { success: false, error: { code: "ERR_VALIDATION", message: "title required" } },
 { status: 400 }
 );
 }

 // A truthy-only check (!startingPrice) lets a non-numeric truthy string
 // like "abc" through, which Number() then silently turns into NaN — same
 // gap as the internal /api/jobs route, closed the same way here.
 const numStartingPrice = Number(startingPrice);
 const numMinimumPrice = Number(minimumPrice);
 const numDecayRate = Number(decayRatePerHour) || 10;
 const numEstimatedHours = Number(estimatedHours) || 0;
 if (
 !Number.isFinite(numStartingPrice) || numStartingPrice <= 0 ||
 !Number.isFinite(numMinimumPrice) || numMinimumPrice < 0
 ) {
 return NextResponse.json(
 { success: false, error: { code: "ERR_VALIDATION", message: "startingPrice and minimumPrice must be valid numbers (startingPrice greater than 0, minimumPrice not negative)" } },
 { status: 400 }
 );
 }
 if (numMinimumPrice > numStartingPrice) {
 return NextResponse.json(
 { success: false, error: { code: "ERR_VALIDATION", message: "minimumPrice cannot be greater than startingPrice" } },
 { status: 400 }
 );
 }

 const jobCategory = validCategories.includes(category) ? category : "other";

 let jobQuotaReserved = false;
 if (user) {
 const limits = user.planLimits ?? { jobsPostedThisMonth: 0, monthResetAt: new Date(0).toISOString() };
 if (new Date(limits.monthResetAt) < new Date()) {
 await db.collection("users").updateOne({ _id: user._id }, {
 $set: { "planLimits.jobsPostedThisMonth": 0, "planLimits.bidsPlacedThisMonth": 0, "planLimits.monthResetAt": new Date(Date.now() + 30 * 24 * 3600000).toISOString() }
 });
 }
 // Atomic check-and-increment (matches the internal /api/jobs POST route) —
 // a plain findOne-then-updateOne here let two concurrent API-key requests
 // both read "under the cap" before either write landed.
 const capped = await db.collection("users").findOneAndUpdate(
 {
 _id: user._id,
 $or: [
 { "planLimits.jobsPostedThisMonth": { $lt: config.limits.jobsPerMonth } },
 { "planLimits.jobsPostedThisMonth": { $exists: false } },
 ],
 },
 { $inc: { "planLimits.jobsPostedThisMonth": 1 } }
 );
 if (!capped) {
 return NextResponse.json(
 { success: false, error: { code: "ERR_PLAN_LIMIT", message: `${config.name} plan limit: ${config.limits.jobsPerMonth} jobs/month. Upgrade for more.` } },
 { status: 403 }
 );
 }
 jobQuotaReserved = true;
 }

 const now = new Date().toISOString();
 const job = {
 clientId: userId,
 title, description: description ?? "",
 skillsRequired: skillsRequired ?? [],
 startingPrice: numStartingPrice,
 minimumPrice: numMinimumPrice,
 decayRatePerHour: numDecayRate,
 estimatedHours: numEstimatedHours,
 postedAt: now,
 deadlineAt: deadlineAt ?? new Date(Date.now() + 48 * 3600000).toISOString(),
 status: "open",
 category: jobCategory,
 featured: false,
 visibility: "public",
 platformFeePercent: config.platformFeePercent,
 // Adaptive pricing fields — required by the pricing engine and feed elsewhere in the app
 pricingMode: body.pricingMode === "fixed" ? "fixed" : "adaptive",
 bidCount: 0,
 uniqueBidderCount: 0,
 lastBidAt: null,
 lowestCounterBid: null,
 priceHistory: [{ price: numStartingPrice, at: now, event: "posted" }],
 };

 const result = await db.collection("jobs").insertOne(job);

 // Free-plan counter was already incremented atomically above alongside the
 // cap check; only non-free plans still need a plain increment here.
 if (!jobQuotaReserved) {
 await db.collection("users").updateOne(
 { _id: new ObjectId(userId) },
 { $inc: { "planLimits.jobsPostedThisMonth": 1 } }
 );
 }

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
