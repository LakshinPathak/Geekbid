import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { authenticateRequest } from "@/lib/auth";
import { getAdaptivePrice } from "@/lib/pricing";
import { sendJobAcceptedEmail, sendBookingConfirmationEmail, sendJobCancelledEmail, sendJobCompletedSummaryEmail } from "@/lib/email";

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
 if (job.status !== "open") return NextResponse.json({ error: "Only open jobs can be cancelled" }, { status: 400 });
 const filter = job._id ? { _id: job._id } : { id };
 await db.collection("jobs").updateOne(filter, { $set: { status: "cancelled", cancelledAt: new Date().toISOString() } });
 // Notify all bidders
 const bidders = await db.collection("bids").distinct("freelancerId", { jobId: id });
 for (const fid of bidders) {
 const f = await db.collection("users").findOne({ _id: new ObjectId(fid) }, { projection: { email: 1, fullName: 1, name: 1 } });
 if (f?.email) sendJobCancelledEmail(f.email, f.fullName ?? f.name ?? "Freelancer", job.title ?? "Untitled Job").catch(() => {});
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
 ).catch(() => {});
 }
 return NextResponse.json({ ok: true, message: "Job completed and escrow released" });
 }

 // ── ACCEPT (default) ─────────────────────────────────────────────────────
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

 const filter = job._id ? { _id: job._id } : { id };
 const acceptedAt = now.toISOString();

 await db.collection("jobs").updateOne(filter, {
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
 if (job.clientId) {
 const client = await db.collection("users").findOne(
 { _id: new ObjectId(job.clientId) },
 { projection: { email: 1, name: 1 } }
 );
 const freelancer = await db.collection("users").findOne(
 { _id: new ObjectId(auth.payload.userId) },
 { projection: { name: 1 } }
 );
 if (client?.email) {
 sendJobAcceptedEmail(
 client.email,
 client.name ?? "Client",
 freelancer?.name ?? "A freelancer",
 job.title ?? "Untitled Job",
 finalPrice,
 id
 ).catch(() => {});
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
 ).catch(() => {});
 }
 }

 return NextResponse.json({ ok: true, finalPrice });
 } catch (err) {
 console.error("[Job PATCH Error]", err);
 return NextResponse.json(
 { error: "Failed to accept job" },
 { status: 500 }
 );
 }
}
