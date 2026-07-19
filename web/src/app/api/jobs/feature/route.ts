import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { getPlanConfig, FEATURED_BOOST_PRICE_INR, FEATURED_BOOST_CURRENCY } from "@/lib/plans";
import { withPlanHeader } from "@/lib/middleware/plan-header";
import { resetPlanLimitsIfStale } from "@/lib/reset-plan-limits";

// PATCH /api/jobs/feature — toggle featured status
export async function PATCH(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const body = await req.json();
 const { jobId, featured, paymentTransactionId } = body;

 if (!jobId) {
 return NextResponse.json({ error: "jobId required" }, { status: 400 });
 }

 const db = await getDb();
 const job = await db.collection("jobs").findOne({ _id: new ObjectId(jobId) });

 if (!job) {
 return NextResponse.json({ error: "Job not found" }, { status: 404 });
 }

 // Only admin or the job's client can feature
 if (auth.payload.role !== "admin" && job.clientId !== auth.payload.userId) {
 return NextResponse.json({ error: "Not authorized" }, { status: 403 });
 }

 // Turning a boost ON consumes one of the client's included monthly boosts —
 // un-featuring is always free and never counts against the quota. This still
 // applies when an admin does the featuring on the client's behalf, since the
 // boost is a resource attributed to the job's owner, not the caller.
 if (featured && !job.featured) {
 const client = await db.collection("users").findOne({ _id: new ObjectId(job.clientId) });
 const config = getPlanConfig(client?.plan);

 let quotaConsumed = false;
 if (client && config.limits.featuredBoostsPerMonth > 0) {
 const limits = client.planLimits ?? { featuredBoostsUsedThisMonth: 0, monthResetAt: new Date(0).toISOString() };
 await resetPlanLimitsIfStale(db, client._id, limits.monthResetAt);
 const capped = await db.collection("users").findOneAndUpdate(
 {
 _id: client._id,
 $or: [
 { "planLimits.featuredBoostsUsedThisMonth": { $lt: config.limits.featuredBoostsPerMonth } },
 { "planLimits.featuredBoostsUsedThisMonth": { $exists: false } },
 ],
 },
 { $inc: { "planLimits.featuredBoostsUsedThisMonth": 1 } }
 );
 quotaConsumed = !!capped;
 }

 // Included monthly boosts are exhausted (or the tier has none) — fall back
 // to a one-off pay-per-boost purchase instead of a hard block.
 if (!quotaConsumed) {
 if (!paymentTransactionId) {
 return NextResponse.json(
 {
 error: `${config.limits.featuredBoostsPerMonth > 0
 ? `${config.name} plan limit: ${config.limits.featuredBoostsPerMonth} featured boosts/month used.`
 : `${config.name} plan does not include featured boosts.`
 } Pay ₹${FEATURED_BOOST_PRICE_INR} for a one-off boost.`,
 code: "BOOST_QUOTA_EXCEEDED",
 boostPrice: FEATURED_BOOST_PRICE_INR,
 boostCurrency: FEATURED_BOOST_CURRENCY,
 },
 { status: 403 }
 );
 }

 let txObjectId: ObjectId;
 try {
 txObjectId = new ObjectId(paymentTransactionId);
 } catch {
 return NextResponse.json({ error: "Invalid payment transaction" }, { status: 400 });
 }

 // Atomically claim the payment so the same transaction can't fund two
 // different boosts — tag ties it to this exact job so a boost paid for
 // one job can't be replayed onto another. Also enforce the amount/currency
 // actually verified on the transaction, not just that *a* payment with the
 // right description exists (ISSUE-2) — otherwise a ₹1 verified payment
 // tagged with this job's description would be enough to claim the boost.
 const claimedTx = await db.collection("transactions").findOneAndUpdate(
 {
 _id: txObjectId,
 clientId: auth.payload.userId,
 description: `featured_boost:${jobId}`,
 verified: true,
 consumedAt: { $exists: false },
 grossAmount: { $gte: FEATURED_BOOST_PRICE_INR },
 currency: FEATURED_BOOST_CURRENCY,
 },
 { $set: { consumedAt: new Date().toISOString() } }
 );
 if (!claimedTx) {
 return NextResponse.json({ error: "Invalid or already-used payment for this boost" }, { status: 400 });
 }
 }
 }

 await db.collection("jobs").updateOne(
 { _id: new ObjectId(jobId) },
 {
 $set: {
 featured: !!featured,
 featuredAt: featured ? new Date().toISOString() : null,
 },
 }
 );

 const caller = await db.collection("users").findOne(
 { _id: new ObjectId(auth.payload.userId) },
 { projection: { plan: 1 } }
 );
 return withPlanHeader(
 NextResponse.json({ ok: true, featured: !!featured }),
 caller?.plan ?? "free"
 );
 } catch (err) {
 console.error("[Feature PATCH Error]", err);
 return NextResponse.json({ error: "Failed to update featured status" }, { status: 500 });
 }
}
