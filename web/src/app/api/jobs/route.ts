import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { sendJobPostedEmail } from "@/lib/email";

// GET /api/jobs — list all jobs (public), supports ?category= filter
export async function GET(req: NextRequest) {
 try {
 const db = await getDb();
 const { searchParams } = new URL(req.url);
 const category = searchParams.get("category");

 const filter: Record<string, unknown> = {};
 if (category && category !== "all") {
 filter.category = category;
 }

 // Invite-only jobs must not show up in the public feed for everyone —
 // only the client who posted it, an invited freelancer, or an admin.
 // The endpoint itself stays public/unauthenticated for open jobs.
 const auth = await authenticateRequest(req);
 const callerId = "error" in auth ? null : auth.payload.userId;
 const isAdmin = "error" in auth ? false : auth.payload.role === "admin";

 if (!isAdmin) {
 const orClauses: Record<string, unknown>[] = [{ visibility: { $ne: "invite_only" } }];
 if (callerId) {
 orClauses.push({ visibility: "invite_only", clientId: callerId });
 const invitedJobIds = await db.collection("invites").distinct("jobId", { freelancerId: callerId });
 const invitedObjectIds = invitedJobIds
 .map((jid: string) => { try { return new ObjectId(jid); } catch { return null; } })
 .filter((oid): oid is ObjectId => oid !== null);
 if (invitedObjectIds.length > 0) {
 orClauses.push({ visibility: "invite_only", _id: { $in: invitedObjectIds } });
 }
 }
 filter.$or = orClauses;
 }

 const jobs = await db
 .collection("jobs")
 .find(filter)
 .sort({ featured: -1, postedAt: -1 })
 .limit(100)
 .toArray();
 return NextResponse.json(
 jobs.map((j) => ({ ...j, _id: j._id.toString(), id: j._id.toString() }))
 );
 } catch (err) {
 console.error("[Jobs GET Error]", err);
 return NextResponse.json(
 { error: "Failed to fetch jobs" },
 { status: 500 }
 );
 }
}

// POST /api/jobs — create a new job (protected)
export async function POST(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json(
 { error: auth.error },
 { status: auth.status }
 );
 }

 if (auth.payload.role !== "client") {
 return NextResponse.json(
 { error: "Only clients can post jobs" },
 { status: 403 }
 );
 }

 const body = await req.json();
 const {
 title,
 description,
 skillsRequired,
 startingPrice,
 minimumPrice,
 decayRatePerHour,
 estimatedHours,
 deadlineAt,
 category,
 } = body;

 if (!title) {
 return NextResponse.json(
 { error: "Title required" },
 { status: 400 }
 );
 }

 const validCategories = ["ai_ml", "web_dev", "mobile", "devops", "security", "data_eng", "blockchain", "design", "qa", "other"];
 const jobCategory = validCategories.includes(category) ? category : "other";

 const db = await getDb();

 // Plan limit enforcement
 const user = await db.collection("users").findOne({ _id: new ObjectId(auth.payload.userId) });
 let jobQuotaReserved = false;
 if (user) {
 const plan = user.plan ?? "free";
 if (plan === "free") {
 const limits = user.planLimits ?? { jobsPostedThisMonth: 0, monthResetAt: new Date(0).toISOString() };
 if (new Date(limits.monthResetAt) < new Date()) {
 await db.collection("users").updateOne({ _id: user._id }, {
 $set: { "planLimits.jobsPostedThisMonth": 0, "planLimits.bidsPlacedThisMonth": 0, "planLimits.monthResetAt": new Date(Date.now() + 30 * 24 * 3600000).toISOString() }
 });
 }
 // Atomic check-and-increment so two concurrent requests can't both
 // read "under the cap" before either write lands.
 const capped = await db.collection("users").findOneAndUpdate(
 {
 _id: user._id,
 $or: [
 { "planLimits.jobsPostedThisMonth": { $lt: 3 } },
 { "planLimits.jobsPostedThisMonth": { $exists: false } },
 ],
 },
 { $inc: { "planLimits.jobsPostedThisMonth": 1 } }
 );
 if (!capped) {
 return NextResponse.json({ error: "Free plan limit: 3 jobs/month. Upgrade to Pro for unlimited." }, { status: 403 });
 }
 jobQuotaReserved = true;
 }
 }
 const now = new Date().toISOString();
 const validVisibility = ["public", "invite_only"];
 const job = {
 clientId: auth.payload.userId,
 title,
 description: description ?? "",
 skillsRequired: skillsRequired ?? [],
 startingPrice: Number(startingPrice),
 minimumPrice: Number(minimumPrice),
 decayRatePerHour: Number(decayRatePerHour),
 estimatedHours: Number(estimatedHours),
 postedAt: now,
 deadlineAt:
 deadlineAt ?? new Date(Date.now() + 48 * 3600000).toISOString(),
 status: "open",
 category: jobCategory,
 featured: false,
 visibility: validVisibility.includes(body.visibility) ? body.visibility : "public",
 // Adaptive pricing fields
 pricingMode: body.pricingMode === "fixed" ? "fixed" : "adaptive",
 bidCount: 0,
 uniqueBidderCount: 0,
 lastBidAt: null,
 lowestCounterBid: null,
 priceHistory: [
 { price: Number(startingPrice), at: now, event: "posted" },
 ],
 };

 const result = await db.collection("jobs").insertOne(job);
 const jobId = result.insertedId.toString();
 // Free-plan counter was already incremented atomically above alongside the
 // cap check; only non-free plans still need a plain increment here.
 if (!jobQuotaReserved) {
 await db.collection("users").updateOne(
 { _id: new ObjectId(auth.payload.userId) },
 { $inc: { "planLimits.jobsPostedThisMonth": 1 } }
 );
 }

 // Fire-and-forget: send job posted confirmation to client
 const poster = await db.collection("users").findOne(
 { _id: new ObjectId(auth.payload.userId) },
 { projection: { email: 1, name: 1 } }
 );
 if (poster?.email) {
 sendJobPostedEmail(
 poster.email, poster.name ?? "Client",
 title, Number(startingPrice), Number(minimumPrice),
 job.pricingMode, job.deadlineAt, jobCategory, jobId
 ).catch(() => {});
 }

 return NextResponse.json(
 { ...job, _id: jobId, id: jobId },
 { status: 201 }
 );
 } catch (err) {
 console.error("[Jobs POST Error]", err);
 return NextResponse.json(
 { error: "Failed to create job" },
 { status: 500 }
 );
 }
}
