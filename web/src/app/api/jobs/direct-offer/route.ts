import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { sendDirectOfferEmail } from "@/lib/email";
import { getPlanConfigWithOverrides } from "@/lib/plans";
import { resetPlanLimitsIfStale } from "@/lib/reset-plan-limits";

// POST /api/jobs/direct-offer — client creates direct offer to specific freelancer
export async function POST(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 if (auth.payload.role !== "client") {
 return NextResponse.json({ error: "Only clients can create direct offers" }, { status: 403 });
 }

 const body = await req.json();
 const { title, description, skillsRequired, price, freelancerId, estimatedHours, category } = body;

 if (!title || !freelancerId || !price) {
 return NextResponse.json({ error: "title, freelancerId, and price required" }, { status: 400 });
 }
 // Same finite/positive check as POST /api/jobs — without it, a NaN/≤0
 // price flows straight into startingPrice/minimumPrice below and breaks
 // escrow math and the accept-offer emails downstream.
 const numPrice = Number(price);
 if (!Number.isFinite(numPrice) || numPrice <= 0) {
 return NextResponse.json({ error: "price must be a valid number greater than 0" }, { status: 400 });
 }

 const db = await getDb();

 // Check freelancer exists and has GeekScore > 500
 const freelancer = await db.collection("users").findOne({ _id: new ObjectId(freelancerId) });
 if (!freelancer) return NextResponse.json({ error: "Freelancer not found" }, { status: 404 });
 if (freelancer.role !== "freelancer") return NextResponse.json({ error: "User is not a freelancer" }, { status: 400 });
 if ((freelancer.geekScore ?? 0) < 500) {
 return NextResponse.json({ error: "Direct hire requires freelancer GeekScore > 500" }, { status: 400 });
 }

 // Same job-quota enforcement as the regular job-posting route — a direct
 // offer is still a job creation and must count against the same monthly cap.
 const client = await db.collection("users").findOne({ _id: new ObjectId(auth.payload.userId) });
 const config = await getPlanConfigWithOverrides(client?.plan, db);
 let jobQuotaReserved = false;
 if (client) {
 const limits = client.planLimits ?? { jobsPostedThisMonth: 0, monthResetAt: new Date(0).toISOString() };
 await resetPlanLimitsIfStale(db, client._id, limits.monthResetAt);
 const capped = await db.collection("users").findOneAndUpdate(
 {
 _id: client._id,
 $or: [
 { "planLimits.jobsPostedThisMonth": { $lt: config.limits.jobsPerMonth } },
 { "planLimits.jobsPostedThisMonth": { $exists: false } },
 ],
 },
 { $inc: { "planLimits.jobsPostedThisMonth": 1 } }
 );
 if (!capped) {
 return NextResponse.json({ error: `${config.name} plan limit: ${config.limits.jobsPerMonth} jobs/month. Upgrade for more.` }, { status: 403 });
 }
 jobQuotaReserved = true;
 }

 const job = {
 clientId: auth.payload.userId,
 title,
 description: description ?? "",
 skillsRequired: skillsRequired ?? [],
 startingPrice: numPrice,
 minimumPrice: numPrice,
 decayRatePerHour: 0,
 estimatedHours: Number(estimatedHours) || 0,
 postedAt: new Date().toISOString(),
 deadlineAt: new Date(Date.now() + 7 * 24 * 3600000).toISOString(),
 status: "open",
 category: category ?? "other",
 featured: false,
 // Direct offers must stay out of the public feed — otherwise any
 // freelancer could accept it through the general accept flow before the
 // intended recipient ever responds. The public GET /api/jobs/[id] lookup
 // (used by the notification link) doesn't filter on visibility, so the
 // offeredTo freelancer can still open and respond to it directly.
 visibility: "invite_only",
 type: "direct_offer",
 offeredTo: freelancerId,
 offerStatus: "pending",
 platformFeePercent: config.platformFeePercent,
 };

 const result = await db.collection("jobs").insertOne(job);

 if (!jobQuotaReserved) {
 await db.collection("users").updateOne(
 { _id: new ObjectId(auth.payload.userId) },
 { $inc: { "planLimits.jobsPostedThisMonth": 1 } }
 );
 }

 // Create notification for freelancer
 await db.collection("notifications").insertOne({
 userId: freelancerId,
 type: "general",
 title: "Direct Hire Offer",
 body: `You received a direct offer: "${title}" for $${price}`,
 jobId: result.insertedId.toString(),
 isRead: false,
 createdAt: new Date().toISOString(),
 });

 // Fire-and-forget: email the freelancer about the offer
 if (freelancer.email) {
 sendDirectOfferEmail(
 freelancer.email,
 freelancer.fullName ?? freelancer.name ?? "Freelancer",
 title,
 Number(price),
 result.insertedId.toString()
 ).catch(() => {});
 }

 return NextResponse.json(
 { ...job, _id: result.insertedId.toString(), id: result.insertedId.toString() },
 { status: 201 }
 );
 } catch (err) {
 console.error("[Direct Offer POST Error]", err);
 return NextResponse.json({ error: "Failed to create direct offer" }, { status: 500 });
 }
}
