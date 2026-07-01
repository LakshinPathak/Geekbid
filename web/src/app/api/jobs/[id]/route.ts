import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { authenticateRequest } from "@/lib/auth";
import { getAdaptivePrice } from "@/lib/pricing";
import { sendJobAcceptedEmail, sendBookingConfirmationEmail, sendJobCancelledEmail, sendJobCompletedSummaryEmail } from "@/lib/email";
import { creditReferralOnFirstJobCompletion } from "@/lib/referrals";

// GET /api/jobs/[id] — public
export async function GET(
 _req: NextRequest,
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

// PATCH /api/jobs/[id] — accept | cancel | complete job (protected)
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

 // ── CANCEL ──────────────────────────────────────────────────────────────
 if (action === "cancel") {
 if (auth.payload.role !== "client") {
 return NextResponse.json({ error: "Only clients can cancel jobs" }, { status: 403 });
 }
 const db = await getDb();
 let job: any;
 try { job = await db.collection("jobs").findOne({ _id: new ObjectId(id) }); }
 catch { job = await db.collection("jobs").findOne({ id }); }
 if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.clientId !== auth.payload.userId) return NextResponse.json({ error: "You can only cancel your own jobs" }, { status: 403 });
 if (job.status !== "open") return NextResponse.json({ error: "Only open jobs can be cancelled" }, { status: 400 });
 const filter = job._id ? { _id: job._id } : { id };
 await db.collection("jobs").updateOne(filter, { $set: { status: "cancelled", cancelledAt: new Date().toISOString() } });
 // Notify all bidders
 const bidders = await db.collection("bids").distinct("freelancerId", { jobId: id });
 for (const fid of bidders) {
 const f = await db.collection("users").findOne({ _id: new ObjectId(fid) }, { projection: { email: 1, fullName: 1, name: 1 } });
 if (f?.email) sendJobCancelledEmail(f.email, f.fullName ?? f.name ?? "Freelancer", job.title ?? "Untitled Job").catch((err) => console.error("[Email Failed]", err));
 }
 return NextResponse.json({ ok: true, message: "Job cancelled" });
 }

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
 if (job.status !== "accepted") return NextResponse.json({ error: "Job must be accepted before completing" }, { status: 400 });
 const filter = job._id ? { _id: job._id } : { id };
 await db.collection("jobs").updateOne(filter, { $set: { status: "completed", completedAt: new Date().toISOString() } });
 // Release escrow
 await db.collection("transactions").updateOne(
 { jobId: id, escrowStatus: "held" },
 { $set: { escrowStatus: "released", releasedAt: new Date().toISOString() } }
 );
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
 const acceptedAt = new Date().toISOString();
 const freelancerId = lowestBid.freelancerId;
 const awardFilter = awardJob._id ? { _id: awardJob._id, status: "open" } : { id, status: "open" };
 const awardedJob = await db.collection("jobs").findOneAndUpdate(awardFilter, {
 $set: { status: "accepted", acceptedBy: freelancerId, finalPrice, acceptedAt },
 $push: { priceHistory: { price: finalPrice, at: acceptedAt, event: "accepted" } } as any,
 });
 if (!awardedJob) {
 return NextResponse.json({ error: "Job was already accepted by another request" }, { status: 409 });
 }
 const fee = Number((finalPrice * 0.1).toFixed(2));
 await db.collection("transactions").insertOne({
 jobId: id, clientId: awardJob.clientId, freelancerId,
 grossAmount: finalPrice, platformFee: fee,
 netAmount: Number((finalPrice - fee).toFixed(2)),
 escrowStatus: "held", createdAt: acceptedAt,
 });
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

 return NextResponse.json({ ok: true, finalPrice, freelancerId, roomId });
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

 // Create escrow transaction
 const fee = Number((finalPrice * 0.1).toFixed(2));
 await db.collection("transactions").insertOne({
 jobId: id,
 clientId: job.clientId,
 freelancerId: auth.payload.userId,
 grossAmount: finalPrice,
 platformFee: fee,
 netAmount: Number((finalPrice - fee).toFixed(2)),
 escrowStatus: "held",
 createdAt: acceptedAt,
 });

 // Fire-and-forget: notify the client their job was accepted
 const client = job.clientId
 ? await db.collection("users").findOne(
 { _id: new ObjectId(job.clientId) },
 { projection: { email: 1, name: 1 } }
 )
 : null;
 const freelancer = await db.collection("users").findOne(
 { _id: new ObjectId(auth.payload.userId) },
 { projection: { name: 1, email: 1 } }
 );
 if (client?.email) {
 sendJobAcceptedEmail(
 client.email,
 client.name ?? "Client",
 freelancer?.name ?? "A freelancer",
 job.title ?? "Untitled Job",
 finalPrice,
 id
 ).catch((err) => console.error("[Email Failed] jobAccepted:", err));
 }

 // Also notify the freelancer with their booking confirmation
 if (freelancer?.email) {
 sendBookingConfirmationEmail(
 freelancer.email,
 freelancer.name ?? "Freelancer",
 client?.name ?? "Client",
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
 const clientName = client?.name ?? "Client";
 const freelancerName = freelancer?.name ?? "Freelancer";
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
