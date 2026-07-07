import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { sendDirectOfferEmail } from "@/lib/email";
import { getPlanConfigWithOverrides } from "@/lib/plans";

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
 if (new Date(limits.monthResetAt) < new Date()) {
 await db.collection("users").updateOne({ _id: client._id }, {
 $set: { "planLimits.jobsPostedThisMonth": 0, "planLimits.bidsPlacedThisMonth": 0, "planLimits.monthResetAt": new Date(Date.now() + 30 * 24 * 3600000).toISOString() }
 });
 }
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
 startingPrice: Number(price),
 minimumPrice: Number(price),
 decayRatePerHour: 0,
 estimatedHours: Number(estimatedHours) || 0,
 postedAt: new Date().toISOString(),
 deadlineAt: new Date(Date.now() + 7 * 24 * 3600000).toISOString(),
 status: "open",
 category: category ?? "other",
 featured: false,
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
