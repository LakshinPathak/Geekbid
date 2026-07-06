import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { getPlanConfig } from "@/lib/plans";

// PATCH /api/jobs/feature — toggle featured status
export async function PATCH(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const body = await req.json();
 const { jobId, featured } = body;

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
 if (config.limits.featuredBoostsPerMonth <= 0) {
 return NextResponse.json({ error: `${config.name} plan does not include featured boosts. Upgrade or purchase a one-off boost.` }, { status: 403 });
 }
 if (client) {
 const limits = client.planLimits ?? { featuredBoostsUsedThisMonth: 0, monthResetAt: new Date(0).toISOString() };
 if (new Date(limits.monthResetAt) < new Date()) {
 await db.collection("users").updateOne({ _id: client._id }, {
 $set: { "planLimits.jobsPostedThisMonth": 0, "planLimits.bidsPlacedThisMonth": 0, "planLimits.featuredBoostsUsedThisMonth": 0, "planLimits.monthResetAt": new Date(Date.now() + 30 * 24 * 3600000).toISOString() }
 });
 }
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
 if (!capped) {
 // Phase 3 will offer a pay-per-boost fallback here instead of a hard block.
 return NextResponse.json({ error: `${config.name} plan limit: ${config.limits.featuredBoostsPerMonth} featured boosts/month used. Upgrade for more.` }, { status: 403 });
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

 return NextResponse.json({ ok: true, featured: !!featured });
 } catch (err) {
 console.error("[Feature PATCH Error]", err);
 return NextResponse.json({ error: "Failed to update featured status" }, { status: 500 });
 }
}
