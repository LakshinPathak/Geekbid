import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { authenticateRequest } from "@/lib/auth";
import { getAdaptivePrice } from "@/lib/pricing";
import { sendJobAcceptedEmail, sendBookingConfirmationEmail, sendJobCompletedSummaryEmail } from "@/lib/email";
import { creditReferralOnFirstJobCompletion } from "@/lib/referrals";
import { splitEscrow, DEFAULT_PLATFORM_FEE_PERCENT } from "@/lib/money";
import { getPlanConfig } from "@/lib/plans";
import { resetPlanLimitsIfStale } from "@/lib/reset-plan-limits";
import type { Db } from "mongodb";

// Shared by accept_best and accept_bid — the two client-award actions differ
// only in *which* freelancer/price they award (globally lowest bid vs a
// specific chosen bid); everything after that (atomic claim, escrow, emails,
// chat room, notifications) is identical, so it's factored out here instead
// of duplicated per action.
async function awardJobToFreelancer(
 db: Db,
 awardJob: any,
 freelancerId: string,
 finalPrice: number,
 id: string
): Promise<{ status: number; body: Record<string, unknown> }> {
 const acceptedAt = new Date().toISOString();
 const awardFilter = awardJob._id ? { _id: awardJob._id, status: "open" } : { id, status: "open" };
 const awardedJob = await db.collection("jobs").findOneAndUpdate(awardFilter, {
 $set: { status: "accepted", acceptedBy: freelancerId, finalPrice, acceptedAt },
 $push: { priceHistory: { price: finalPrice, at: acceptedAt, event: "accepted" } } as any,
 });
 if (!awardedJob) {
 return { status: 409, body: { error: "Job was already accepted by another request" } };
 }
 // Use the fee locked onto the job at creation time (blueprint §17), not a
 // flat default — a Plus/Premium client's 7%/5% rate must not silently
 // become 10% just because escrow release re-derives the split here.
 const escrow = splitEscrow(finalPrice, awardJob.platformFeePercent ?? DEFAULT_PLATFORM_FEE_PERCENT);
 const escrowTxResult = await db.collection("transactions").insertOne({
 jobId: id, clientId: awardJob.clientId, freelancerId,
 grossAmount: escrow.gross, platformFee: escrow.platformFee,
 netAmount: escrow.netAmount,
 escrowStatus: "held", createdAt: acceptedAt,
 purpose: "job_escrow",
 });
 // Link so complete/dispute always target this exact row instead of an
 // ambiguous {jobId, escrowStatus:"held"} filter — a job can also carry an
 // unrelated "held" transaction from a featured-boost payment.
 await db.collection("jobs").updateOne(
 { _id: awardJob._id },
 { $set: { escrowTransactionId: escrowTxResult.insertedId.toString() } }
 );
 const [awardClient, awardFreelancer] = await Promise.all([
 db.collection("users").findOne({ _id: new ObjectId(awardJob.clientId) }, { projection: { email: 1, name: 1, fullName: 1 } }),
 db.collection("users").findOne({ _id: new ObjectId(freelancerId) }, { projection: { email: 1, name: 1, fullName: 1 } }).catch(() => null),
 ]);
 if (awardClient?.email) {
 sendJobAcceptedEmail(
 awardClient.email, awardClient.fullName ?? awardClient.name ?? "Client",
 awardFreelancer?.fullName ?? awardFreelancer?.name ?? "Freelancer",
 awardJob.title ?? "Untitled Job", finalPrice, id
 ).catch((err) => console.error("[Email Failed] jobAccepted:", err));
 }
 if (awardFreelancer?.email) {
 sendBookingConfirmationEmail(
 awardFreelancer.email, awardFreelancer.fullName ?? awardFreelancer.name ?? "Freelancer",
 awardClient?.fullName ?? awardClient?.name ?? "Client",
 awardJob.title ?? "Untitled Job", finalPrice, finalPrice, id
 ).catch((err) => console.error("[Email Failed] bookingConfirmation:", err));
 }

 // ── POST-ACCEPTANCE: Auto-create chat room + system message ──
 let roomId: string | undefined;
 try {
 const roomParticipants = [awardJob.clientId, freelancerId].sort();
 const existingRoom = await db.collection("chat_rooms").findOne({
 jobId: id, participantIds: { $all: roomParticipants },
 });
 if (existingRoom) {
 roomId = existingRoom._id.toString();
 } else {
 const roomResult = await db.collection("chat_rooms").insertOne({
 jobId: id, participantIds: roomParticipants,
 createdAt: acceptedAt, updatedAt: acceptedAt,
 });
 roomId = roomResult.insertedId.toString();
 await db.collection("chat_messages").insertOne({
 roomId, senderId: "system",
 text: `🎉 Job "${awardJob.title}" accepted at $${finalPrice.toLocaleString()}. You can now discuss project details here.`,
 createdAt: acceptedAt,
 });
 }
 } catch (chatErr) {
 console.error("[Post-Accept] Chat room creation failed:", chatErr);
 }

 // ── POST-ACCEPTANCE: In-app notifications ──
 try {
 const jobTitle = awardJob.title ?? "Untitled Job";
 const clientName = awardClient?.fullName ?? awardClient?.name ?? "Client";
 const freelancerName = awardFreelancer?.fullName ?? awardFreelancer?.name ?? "Freelancer";
 await db.collection("notifications").insertMany([
 {
 userId: awardJob.clientId, type: "job_accepted", isRead: false,
 title: `${freelancerName} has been awarded "${jobTitle}"`,
 body: `Final price: $${finalPrice.toLocaleString()}. You can now message them.`,
 jobId: id, createdAt: acceptedAt,
 },
 {
 userId: freelancerId, type: "job_accepted", isRead: false,
 title: `You've been awarded "${jobTitle}"`,
 body: `Final price: $${finalPrice.toLocaleString()}. Start the conversation with ${clientName}.`,
 jobId: id, createdAt: acceptedAt,
 },
 ]);
 } catch (notifErr) {
 console.error("[Post-Accept] Notification creation failed:", notifErr);
 }

 // ── POST-ACCEPTANCE: Let losing bidders know the job was awarded to someone else ──
 try {
 const jobTitle = awardJob.title ?? "Untitled Job";
 const otherBidderIds = await db.collection("bids").distinct("freelancerId", {
 jobId: id,
 freelancerId: { $ne: freelancerId },
 });
 if (otherBidderIds.length > 0) {
 await db.collection("notifications").insertMany(
 otherBidderIds.map((otherId: string) => ({
 userId: otherId, type: "job_awarded_other", isRead: false,
 title: `"${jobTitle}" was awarded to another freelancer`,
 body: "Your bid wasn't selected this time. Keep an eye on the feed for new jobs.",
 jobId: id, createdAt: acceptedAt,
 }))
 );
 }
 } catch (otherBidderErr) {
 console.error("[Post-Accept] Losing-bidder notification failed:", otherBidderErr);
 }

 return { status: 200, body: { ok: true, finalPrice, freelancerId, roomId } };
}

// GET /api/jobs/[id] — public for open/public jobs; invite-only and direct
// offers require the caller to be the client, the offered/invited
// freelancer, or an admin
export async function GET(
 req: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
 const { id } = await params;
 const db = await getDb();

 let job;
 try {
 job = await db.collection("jobs").findOne({ _id: new ObjectId(id) });
 } catch {
 job = await db.collection("jobs").findOne({ id });
 }

 if (!job) {
 return NextResponse.json({ error: "Job not found" }, { status: 404 });
 }

 // The feed's GET /api/jobs already hides invite_only jobs from the public
 // list, but this by-id lookup (used by e.g. notification links) had no
 // such check — anyone with the URL could read a private job's price,
 // description, and offeredTo. Direct offers are also visibility:
 // "invite_only" (set at creation), so this one check covers both.
 if (job.visibility === "invite_only") {
 const auth = await authenticateRequest(req);
 const callerId = "error" in auth ? null : auth.payload.userId;
 const isAdmin = "error" in auth ? false : auth.payload.role === "admin";
 let authorized = isAdmin || callerId === job.clientId || (!!callerId && callerId === job.offeredTo);
 if (!authorized && callerId) {
 const invite = await db.collection("invites").findOne({ jobId: id, freelancerId: callerId });
 authorized = !!invite;
 }
 if (!authorized) {
 return NextResponse.json(
 { error: "Not authorized to view this job" },
 { status: callerId ? 403 : 401 }
 );
 }
 }

 return NextResponse.json({
 ...job,
 _id: job._id.toString(),
 id: job._id.toString(),
 });
 } catch (err) {
 console.error("[Job GET Error]", err);
 return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
 }
}

// PATCH /api/jobs/[id] — accept | complete job (protected)
// Cancellation is handled exclusively by /api/jobs/[id]/cancel/route.ts, which
// does the atomic findOneAndUpdate({status:"open"}) claim this file's old
// duplicate "cancel" branch was missing (ISSUE-62) — do not re-add a cancel
// action here without that same atomic guard.
export async function PATCH(
 req: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
 const { id } = await params;
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const body = await req.json();
 const action = body.action ?? "accept";

 // ── COMPLETE ─────────────────────────────────────────────────────────────
 if (action === "complete") {
 if (auth.payload.role !== "client") {
 return NextResponse.json({ error: "Only clients can mark jobs complete" }, { status: 403 });
 }
 const db = await getDb();
 let job: any;
 try { job = await db.collection("jobs").findOne({ _id: new ObjectId(id) }); }
 catch { job = await db.collection("jobs").findOne({ id }); }
 if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.clientId !== auth.payload.userId) return NextResponse.json({ error: "You can only complete your own jobs" }, { status: 403 });
 // Atomically claim completion — see api/jobs/[id]/complete/route.ts for
 // why a bare findOne+updateOne here let two concurrent requests both pass
 // the status check and both fire the summary emails below.
 const filter = job._id ? { _id: job._id, status: "accepted" } : { id, status: "accepted" };
 const claimedJob = await db.collection("jobs").findOneAndUpdate(filter, { $set: { status: "completed", completedAt: new Date().toISOString() } });
 if (!claimedJob) return NextResponse.json({ error: "Job must be accepted before completing" }, { status: 400 });
 // Release escrow — target the exact row created at accept time
 // (job.escrowTransactionId), not any {jobId, escrowStatus:"held"} row.
 // A job can also have an unrelated "held" transaction from a featured-boost
 // payment (api/payments PATCH tags jobId on those too); a bare filter like
 // the old one could release/refund that instead of the real job escrow.
 // Falls back to the tagged-purpose filter for any pre-migration rows that
 // predate escrowTransactionId.
 if (job.escrowTransactionId) {
 await db.collection("transactions").updateOne(
 { _id: new ObjectId(job.escrowTransactionId), escrowStatus: "held" },
 { $set: { escrowStatus: "released", releasedAt: new Date().toISOString() } }
 );
 } else {
 await db.collection("transactions").updateOne(
 { jobId: id, purpose: "job_escrow", escrowStatus: "held" },
 { $set: { escrowStatus: "released", releasedAt: new Date().toISOString() } }
 );
 }
 // Send summary emails
 const client = await db.collection("users").findOne({ _id: new ObjectId(job.clientId) }, { projection: { email: 1, fullName: 1, name: 1 } });
 const freelancer = job.acceptedBy ? await db.collection("users").findOne({ _id: new ObjectId(job.acceptedBy) }, { projection: { email: 1, fullName: 1, name: 1 } }) : null;
 if (client?.email && freelancer?.email) {
 sendJobCompletedSummaryEmail(
 client.email, client.fullName ?? client.name ?? "Client",
 freelancer.email, freelancer.fullName ?? freelancer.name ?? "Freelancer",
 job.title ?? "Untitled Job", job.finalPrice ?? 0
 ).catch((err) => console.error("[Email Failed]", err));
 }
 if (job.acceptedBy) {
 creditReferralOnFirstJobCompletion(job.acceptedBy).catch((err) =>
 console.error("[Referral Credit Failed]", err)
 );
 }
 return NextResponse.json({ ok: true, message: "Job completed and escrow released" });
 }

 // ── ACCEPT_BEST (client awards job to lowest bidder) ─────────────────────
 if (action === "accept_best") {
 if (auth.payload.role !== "client") {
 return NextResponse.json({ error: "Only clients can award jobs" }, { status: 403 });
 }
 const db = await getDb();
 let awardJob: any;
 try { awardJob = await db.collection("jobs").findOne({ _id: new ObjectId(id) }); }
 catch { awardJob = await db.collection("jobs").findOne({ id }); }
 if (!awardJob) return NextResponse.json({ error: "Job not found" }, { status: 404 });
 if (awardJob.clientId !== auth.payload.userId) {
 return NextResponse.json({ error: "You can only award your own jobs" }, { status: 403 });
 }
 if (awardJob.status !== "open") return NextResponse.json({ error: "Job is not open" }, { status: 400 });
 const lowestBid = await db.collection("bids").findOne({ jobId: id }, { sort: { bidPrice: 1 } });
 if (!lowestBid) return NextResponse.json({ error: "No bids on this job yet" }, { status: 400 });
 const finalPrice = Number(Number(lowestBid.bidPrice).toFixed(2));
 const result = await awardJobToFreelancer(db, awardJob, lowestBid.freelancerId, finalPrice, id);
 return NextResponse.json(result.body, { status: result.status });
 }

 // ── ACCEPT_BID (client awards a specific bid, not necessarily the lowest) ──
 // Every per-row "Accept" in the bid comparison table visually implies
 // awarding *that* freelancer — but until this action existed, every one of
 // those buttons called accept_best under the hood, so clicking next to a
 // higher bidder could silently award the job to someone else entirely.
 if (action === "accept_bid") {
 if (auth.payload.role !== "client") {
 return NextResponse.json({ error: "Only clients can award jobs" }, { status: 403 });
 }
 const { bidId } = body;
 if (!bidId) return NextResponse.json({ error: "bidId required" }, { status: 400 });
 const db = await getDb();
 let awardJob: any;
 try { awardJob = await db.collection("jobs").findOne({ _id: new ObjectId(id) }); }
 catch { awardJob = await db.collection("jobs").findOne({ id }); }
 if (!awardJob) return NextResponse.json({ error: "Job not found" }, { status: 404 });
 if (awardJob.clientId !== auth.payload.userId) {
 return NextResponse.json({ error: "You can only award your own jobs" }, { status: 403 });
 }
 if (awardJob.status !== "open") return NextResponse.json({ error: "Job is not open" }, { status: 400 });
 let chosenBid: any;
 try { chosenBid = await db.collection("bids").findOne({ _id: new ObjectId(bidId) }); }
 catch { return NextResponse.json({ error: "Invalid bidId" }, { status: 400 }); }
 if (!chosenBid || chosenBid.jobId !== id) {
 return NextResponse.json({ error: "Bid not found for this job" }, { status: 404 });
 }
 const finalPrice = Number(Number(chosenBid.bidPrice).toFixed(2));
 const result = await awardJobToFreelancer(db, awardJob, chosenBid.freelancerId, finalPrice, id);
 return NextResponse.json(result.body, { status: result.status });
 }

 // ── ACCEPT (default — freelancer accepts at current decay price) ──────────
 if (auth.payload.role !== "freelancer") {
 return NextResponse.json(
 { error: "Only freelancers can accept jobs" },
 { status: 403 }
 );
 }
 const db = await getDb();

 let job;
 try {
 job = await db.collection("jobs").findOne({ _id: new ObjectId(id) });
 } catch {
 job = await db.collection("jobs").findOne({ id });
 }

 if (!job)
 return NextResponse.json({ error: "Job not found" }, { status: 404 });
 if (job.status !== "open")
 return NextResponse.json({ error: "Job not open" }, { status: 400 });
 // Direct-offer jobs are exclusive to one freelancer and must go through
 // /api/jobs/offer-response (which checks offeredTo) — otherwise any
 // freelancer could win it out from under the intended recipient.
 if (job.type === "direct_offer") {
 return NextResponse.json(
 { error: "This job is a direct offer and can only be accepted or declined by the freelancer it was sent to." },
 { status: 400 }
 );
 }

 // ── Server-side price computation — NEVER trust client price ──
 const now = new Date();
 let finalPrice: number;

 if (job.pricingMode === "fixed") {
 // Fixed decay: simple formula
 const elapsedMs = Math.max(
 now.getTime() - new Date(job.postedAt).getTime(),
 0
 );
 const elapsedHours = elapsedMs / (1000 * 60 * 60);
 finalPrice = Math.max(
 job.startingPrice - job.decayRatePerHour * elapsedHours,
 job.minimumPrice
 );
 } else {
 // Adaptive: recompute from real bid data in DB
 const bidCount = await db
 .collection("bids")
 .countDocuments({ jobId: id });
 const uniqueBidders = await db
 .collection("bids")
 .distinct("freelancerId", { jobId: id });
 const lastBid = await db.collection("bids").findOne(
 { jobId: id },
 { sort: { createdAt: -1 }, projection: { createdAt: 1 } }
 );
 const lowestCounter = await db.collection("bids").findOne(
 { jobId: id, bidType: "counter" },
 { sort: { bidPrice: 1 }, projection: { bidPrice: 1 } }
 );

 finalPrice = getAdaptivePrice(
 {
 startingPrice: job.startingPrice,
 minimumPrice: job.minimumPrice,
 decayRatePerHour: job.decayRatePerHour,
 postedAt: job.postedAt,
 pricingMode: "adaptive",
 bidCount,
 uniqueBidderCount: uniqueBidders.length,
 lastBidAt: lastBid?.createdAt ?? null,
 lowestCounterBid: lowestCounter?.bidPrice ?? null,
 },
 now
 );
 }

 finalPrice = Number(finalPrice.toFixed(2));

 // Bid-quota enforcement — accepting a job is equivalent to placing a winning
 // bid and must count against the same monthly cap as POST /api/bids. Reserve
 // the quota BEFORE attempting to claim the job below so a failed reservation
 // never leaves the job in a claimed-but-uncounted state.
 const acceptingUser = await db.collection("users").findOne({ _id: new ObjectId(auth.payload.userId) });
 const acceptConfig = getPlanConfig(acceptingUser?.plan);
 let bidQuotaReserved = false;
 if (acceptingUser) {
 const limits = acceptingUser.planLimits ?? { bidsPlacedThisMonth: 0, monthResetAt: new Date(0).toISOString() };
 await resetPlanLimitsIfStale(db, acceptingUser._id, limits.monthResetAt);
 const bidCapped = await db.collection("users").findOneAndUpdate(
 {
 _id: acceptingUser._id,
 $or: [
 { "planLimits.bidsPlacedThisMonth": { $lt: acceptConfig.limits.bidsPerMonth } },
 { "planLimits.bidsPlacedThisMonth": { $exists: false } },
 ],
 },
 { $inc: { "planLimits.bidsPlacedThisMonth": 1 } }
 );
 if (!bidCapped) {
 return NextResponse.json({ error: `${acceptConfig.name} plan limit: ${acceptConfig.limits.bidsPerMonth} bids/month. Upgrade for more.` }, { status: 403 });
 }
 bidQuotaReserved = true;
 }

 // Log divergence if client sent a different price (diagnostic only)
 const clientPrice = Number(body.finalPrice);
 if (Math.abs(clientPrice - finalPrice) > 1) {
 console.warn(
 `[Price Divergence] job=${id} client=$${clientPrice} server=$${finalPrice}`
 );
 }

 const filter = job._id ? { _id: job._id, status: "open" } : { id, status: "open" };
 const acceptedAt = now.toISOString();

 const acceptedJob = await db.collection("jobs").findOneAndUpdate(filter, {
 $set: {
 status: "accepted",
 acceptedBy: auth.payload.userId,
 finalPrice,
 acceptedAt,
 },
 $push: {
 priceHistory: {
 price: finalPrice,
 at: acceptedAt,
 event: "accepted",
 },
 } as any,
 });
 if (!acceptedJob) {
 // Roll back the quota reservation above — this attempt never actually
 // claimed the job, so it must not count against the freelancer's cap.
 if (bidQuotaReserved) {
 await db.collection("users").updateOne(
 { _id: new ObjectId(auth.payload.userId) },
 { $inc: { "planLimits.bidsPlacedThisMonth": -1 } }
 );
 }
 return NextResponse.json({ error: "Job was already accepted by another request" }, { status: 409 });
 }

 // Create bid record
 await db.collection("bids").insertOne({
 jobId: id,
 freelancerId: auth.payload.userId,
 bidType: "accept",
 bidPrice: finalPrice,
 createdAt: acceptedAt,
 });

 // Create escrow transaction — use the job's locked fee (§17), not the flat default.
 const escrow = splitEscrow(finalPrice, job.platformFeePercent ?? DEFAULT_PLATFORM_FEE_PERCENT);
 const escrowTxResult = await db.collection("transactions").insertOne({
 jobId: id,
 clientId: job.clientId,
 freelancerId: auth.payload.userId,
 grossAmount: escrow.gross,
 platformFee: escrow.platformFee,
 netAmount: escrow.netAmount,
 escrowStatus: "held",
 createdAt: acceptedAt,
 purpose: "job_escrow",
 });
 // Link so complete/dispute always target this exact row instead of an
 // ambiguous {jobId, escrowStatus:"held"} filter — a job can also carry an
 // unrelated "held" transaction from a featured-boost payment.
 await db.collection("jobs").updateOne(
 acceptedJob._id ? { _id: acceptedJob._id } : { id },
 { $set: { escrowTransactionId: escrowTxResult.insertedId.toString() } }
 );

 // Fire-and-forget: notify the client their job was accepted
 const client = job.clientId
 ? await db.collection("users").findOne(
 { _id: new ObjectId(job.clientId) },
 { projection: { email: 1, fullName: 1, name: 1 } }
 )
 : null;
 const freelancer = await db.collection("users").findOne(
 { _id: new ObjectId(auth.payload.userId) },
 { projection: { fullName: 1, name: 1, email: 1 } }
 );
 if (client?.email) {
 sendJobAcceptedEmail(
 client.email,
 client.fullName ?? client.name ?? "Client",
 freelancer?.fullName ?? freelancer?.name ?? "A freelancer",
 job.title ?? "Untitled Job",
 finalPrice,
 id
 ).catch((err) => console.error("[Email Failed] jobAccepted:", err));
 }

 // Also notify the freelancer with their booking confirmation
 if (freelancer?.email) {
 sendBookingConfirmationEmail(
 freelancer.email,
 freelancer.fullName ?? freelancer.name ?? "Freelancer",
 client?.fullName ?? client?.name ?? "Client",
 job.title ?? "Untitled Job",
 finalPrice, finalPrice,
 id
 ).catch((err) => console.error("[Email Failed] bookingConfirmation:", err));
 }

 // ── POST-ACCEPTANCE: Auto-create chat room + system message ──
 let roomId: string | undefined;
 if (job.clientId) {
 try {
 const roomParticipants = [job.clientId, auth.payload.userId].sort();
 const existingRoom = await db.collection("chat_rooms").findOne({
 jobId: id, participantIds: { $all: roomParticipants },
 });
 if (existingRoom) {
 roomId = existingRoom._id.toString();
 } else {
 const roomResult = await db.collection("chat_rooms").insertOne({
 jobId: id, participantIds: roomParticipants,
 createdAt: acceptedAt, updatedAt: acceptedAt,
 });
 roomId = roomResult.insertedId.toString();
 await db.collection("chat_messages").insertOne({
 roomId, senderId: "system",
 text: `🎉 Job "${job.title}" accepted at $${finalPrice.toLocaleString()}. You can now discuss project details here.`,
 createdAt: acceptedAt,
 });
 }
 } catch (chatErr) {
 console.error("[Post-Accept] Chat room creation failed:", chatErr);
 }

 // ── POST-ACCEPTANCE: In-app notifications ──
 try {
 const jobTitle = job.title ?? "Untitled Job";
 const clientName = client?.fullName ?? client?.name ?? "Client";
 const freelancerName = freelancer?.fullName ?? freelancer?.name ?? "Freelancer";
 await db.collection("notifications").insertMany([
 {
 userId: job.clientId, type: "job_accepted", isRead: false,
 title: `${freelancerName} accepted "${jobTitle}"`,
 body: `Final price: $${finalPrice.toLocaleString()}. You can now message them.`,
 jobId: id, createdAt: acceptedAt,
 },
 {
 userId: auth.payload.userId, type: "job_accepted", isRead: false,
 title: `You accepted "${jobTitle}"`,
 body: `Final price: $${finalPrice.toLocaleString()}. Start the conversation with ${clientName}.`,
 jobId: id, createdAt: acceptedAt,
 },
 ]);
 } catch (notifErr) {
 console.error("[Post-Accept] Notification creation failed:", notifErr);
 }
 }

 return NextResponse.json({ ok: true, finalPrice, roomId });
 } catch (err) {
 console.error("[Job PATCH Error]", err);
 return NextResponse.json(
 { error: "Failed to accept job" },
 { status: 500 }
 );
 }
}
