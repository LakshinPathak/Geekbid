import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId, type Document, type WithId } from "mongodb";
import { sendNewBidEmail, sendPriceTargetAlertEmail } from "@/lib/email";
import { getCurrentPrice } from "@/lib/utils";
import type { Job } from "@/lib/utils";
import { getPlanConfig } from "@/lib/plans";
import { withPlanHeader } from "@/lib/middleware/plan-header";
import { resetPlanLimitsIfStale } from "@/lib/reset-plan-limits";

// GET /api/bids?jobId=xxx (protected — bids include freelancer IDs and
// private bid messages, so a caller must only see bids they placed
// themselves or bids on jobs they personally posted; being merely
// authenticated is not enough, and neither is being *some* freelancer.)
export async function GET(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const jobId = req.nextUrl.searchParams.get("jobId");
 const db = await getDb();
 const filter: Record<string, unknown> = jobId ? { jobId } : {};

 if (auth.payload.role !== "admin") {
 const ownJobIds = await db
 .collection("jobs")
 .find({ clientId: auth.payload.userId }, { projection: { _id: 1 } })
 .toArray();
 const ownJobIdStrings = ownJobIds.map((j) => j._id.toString());
 filter.$or = [
 { freelancerId: auth.payload.userId },
 { jobId: { $in: ownJobIdStrings } },
 ];
 }

 const bids = await db
 .collection("bids")
 .find(filter)
 .sort({ createdAt: -1 })
 .limit(200)
 .toArray();
 return NextResponse.json(
 bids.map((b) => ({ ...b, _id: b._id.toString(), id: b._id.toString() }))
 );
 } catch (err) {
 console.error("[Bids GET Error]", err);
 return NextResponse.json({ error: "Failed to fetch bids" }, { status: 500 });
 }
}

// POST /api/bids — place a counter-bid (protected, freelancer only)
export async function POST(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 if (auth.payload.role !== "freelancer") {
 return NextResponse.json(
 { error: "Only freelancers can place bids" },
 { status: 403 }
 );
 }

 const { jobId, bidPrice, message } = await req.json();
 if (!jobId || !bidPrice) {
 return NextResponse.json(
 { error: "jobId and bidPrice are required" },
 { status: 400 }
 );
 }

 // Validate jobId is a well-formed ObjectId string BEFORE it's ever used
 // to build a Mongo filter. Falling back to `findOne({ id: jobId })` with
 // an unvalidated raw request value would let an object like
 // `{"$ne": null}` be smuggled straight into a filter (NoSQL injection).
 if (typeof jobId !== "string" || !/^[a-f\d]{24}$/i.test(jobId)) {
 return NextResponse.json({ error: "Invalid jobId" }, { status: 400 });
 }

 const db = await getDb();

 // A bid can only land on a job that's still open — otherwise a direct
 // request could bid on an already-accepted/cancelled job.
 let targetJob: WithId<Document> | null;
 try { targetJob = await db.collection("jobs").findOne({ _id: new ObjectId(jobId) }); }
 catch { targetJob = await db.collection("jobs").findOne({ id: jobId }); }
 if (!targetJob) {
 return NextResponse.json({ error: "Job not found" }, { status: 404 });
 }
 if (targetJob.status !== "open") {
 return NextResponse.json({ error: "This job is no longer open for bidding" }, { status: 400 });
 }
 // Direct-offer jobs are exclusive to one freelancer (offeredTo) and are
 // handled entirely through /api/jobs/offer-response — they must not be
 // biddable by anyone else.
 if (targetJob.type === "direct_offer") {
 return NextResponse.json({ error: "This job is a direct offer and is not open for bidding" }, { status: 400 });
 }
 // Invite-only jobs (the general "post + invite specific freelancers"
 // feature, not just direct offers) must only be biddable by a freelancer
 // who was actually invited — GET /api/jobs and GET /api/jobs/[id] already
 // hide these from anyone else, but that's a read-access check only. Without
 // this, a freelancer who obtains the jobId out-of-band (e.g. a shared link)
 // could place a bid on a job they were never invited to.
 if (targetJob.visibility === "invite_only") {
 const invite = await db.collection("invites").findOne({ jobId, freelancerId: auth.payload.userId });
 if (!invite) {
 return NextResponse.json({ error: "This job is invite-only and you have not been invited to bid on it" }, { status: 403 });
 }
 }

 // Enforce the same floor/ceiling the frontend already checks — a bid
 // placed directly against the API (bypassing store.tsx) must not be able
 // to undercut the client's floor price or exceed the current asking price.
 const currentPrice = getCurrentPrice(targetJob as unknown as Job, new Date());
 const numericBidPrice = Number(bidPrice);
 if (!Number.isFinite(numericBidPrice) || numericBidPrice <= 0) {
 return NextResponse.json({ error: "Invalid bid price" }, { status: 400 });
 }
 if (numericBidPrice < targetJob.minimumPrice) {
 return NextResponse.json({ error: `Must be ≥ floor $${targetJob.minimumPrice}` }, { status: 400 });
 }
 if (numericBidPrice > currentPrice) {
 return NextResponse.json({ error: `Must be ≤ $${currentPrice.toFixed(2)}` }, { status: 400 });
 }

 // 30-minute per-user bid cooldown (anti-spam / anti-freeze) — checked
 // before the quota reservation below so a cooldown rejection never
 // consumes a monthly bid slot the freelancer didn't actually get to use.
 const lastBidByUser = await db.collection("bids").findOne(
 { jobId, freelancerId: auth.payload.userId },
 { sort: { createdAt: -1 }, projection: { createdAt: 1 } }
 );
 if (lastBidByUser) {
 const minutesSinceLast =
 (Date.now() - new Date(lastBidByUser.createdAt).getTime()) / 60000;
 if (minutesSinceLast < 30) {
 return NextResponse.json(
 {
 error: `Wait ${Math.ceil(30 - minutesSinceLast)} min before bidding again on this job`,
 },
 { status: 429 }
 );
 }
 }

 // Plan limit enforcement for freelancers — applies to every tier, not just free.
 const user = await db.collection("users").findOne({ _id: new ObjectId(auth.payload.userId) });
 let bidQuotaReserved = false;
 const plan = user?.plan ?? "free";
 const config = getPlanConfig(plan);
 if (user) {
 const limits = user.planLimits ?? { bidsPlacedThisMonth: 0, monthResetAt: new Date(0).toISOString() };
 await resetPlanLimitsIfStale(db, user._id, limits.monthResetAt);
 // Atomic check-and-increment so two concurrent requests can't both
 // read "under the cap" before either write lands.
 const capped = await db.collection("users").findOneAndUpdate(
 {
 _id: user._id,
 $or: [
 { "planLimits.bidsPlacedThisMonth": { $lt: config.limits.bidsPerMonth } },
 { "planLimits.bidsPlacedThisMonth": { $exists: false } },
 ],
 },
 { $inc: { "planLimits.bidsPlacedThisMonth": 1 } }
 );
 if (!capped) {
 return NextResponse.json({ error: `${config.name} plan limit: ${config.limits.bidsPerMonth} bids/month. Upgrade for more.` }, { status: 403 });
 }
 bidQuotaReserved = true;
 }

 // Re-check the job is still open right before inserting — the quota and
 // cooldown checks above are several async round trips deep from the
 // status check at the top of this handler, and the job could have been
 // accepted by someone else in that window, leaving a stray bid recorded
 // against a job that's no longer live.
 const stillOpen = await db.collection("jobs").findOne({ _id: targetJob._id, status: "open" });
 if (!stillOpen) {
 if (bidQuotaReserved) {
 await db.collection("users").updateOne(
 { _id: new ObjectId(auth.payload.userId) },
 { $inc: { "planLimits.bidsPlacedThisMonth": -1 } }
 );
 }
 return NextResponse.json({ error: "This job is no longer open for bidding" }, { status: 400 });
 }

 const bid = {
 jobId,
 freelancerId: auth.payload.userId,
 bidType: "counter",
 bidPrice: Number(bidPrice),
 message: message ?? "",
 createdAt: new Date().toISOString(),
 };

 const result = await db.collection("bids").insertOne(bid);

 // ── Update job demand signals ──
 const updateOps: Record<string, unknown> = {
 $set: { lastBidAt: bid.createdAt },
 $inc: { bidCount: 1 },
 $push: {
 priceHistory: {
 $each: [
 {
 price: Number(bidPrice),
 at: bid.createdAt,
 event: "counter_bid",
 },
 ],
 $slice: -50, // keep last 50 entries max
 },
 },
 };

 // Reuse the job we already fetched above for the status check — no need
 // to query it a second time.
 const jobDoc = targetJob;
 if (
 jobDoc &&
 (jobDoc.lowestCounterBid === null ||
 jobDoc.lowestCounterBid === undefined ||
 Number(bidPrice) < jobDoc.lowestCounterBid)
 ) {
 (updateOps.$set as Record<string, unknown>).lowestCounterBid =
 Number(bidPrice);
 }

 // Count unique bidders (anti-gaming: one person can't inflate demand)
 const uniqueBidders = await db
 .collection("bids")
 .distinct("freelancerId", { jobId });
 (updateOps.$set as Record<string, unknown>).uniqueBidderCount =
 uniqueBidders.length;

 try {
 await db.collection("jobs").updateOne({ _id: new ObjectId(jobId) }, updateOps);
 } catch {
 await db.collection("jobs").updateOne({ id: jobId }, updateOps);
 }

 // Fire-and-forget: notify the client about the new bid
 if (jobDoc?.clientId) {
 const client = await db.collection("users").findOne(
 { _id: new ObjectId(jobDoc.clientId) },
 { projection: { email: 1, fullName: 1, name: 1 } }
 );
 if (client?.email) {
 const freelancerUser = await db.collection("users").findOne(
 { _id: new ObjectId(auth.payload.userId) },
 { projection: { fullName: 1, name: 1 } }
 );
 sendNewBidEmail(
 client.email,
 client.fullName ?? client.name ?? "Client",
 freelancerUser?.fullName ?? freelancerUser?.name ?? "A freelancer",
 jobDoc.title ?? "Untitled Job",
 Number(bidPrice),
 jobId
 ).catch(() => {});

 // Price target alert: if bid is within 110% of floor price
 if (jobDoc.minimumPrice && Number(bidPrice) <= jobDoc.minimumPrice * 1.1) {
 sendPriceTargetAlertEmail(
 client.email, client.fullName ?? client.name ?? "Client",
 freelancerUser?.fullName ?? freelancerUser?.name ?? "A freelancer",
 jobDoc.title ?? "Untitled Job",
 Number(bidPrice), jobDoc.minimumPrice,
 jobId, result.insertedId.toString()
 ).catch(() => {});
 }
 }
 }

 // Free-plan counter was already incremented atomically above alongside the
 // cap check; only non-free plans still need a plain increment here.
 if (!bidQuotaReserved) await db.collection("users").updateOne(
 { _id: new ObjectId(auth.payload.userId) },
 { $inc: { "planLimits.bidsPlacedThisMonth": 1 } }
 );
 return withPlanHeader(
 NextResponse.json(
 { ...bid, _id: result.insertedId.toString(), id: result.insertedId.toString() },
 { status: 201 }
 ),
 plan
 );
 } catch (err) {
 console.error("[Bids POST Error]", err);
 return NextResponse.json({ error: "Failed to place bid" }, { status: 500 });
 }
}
