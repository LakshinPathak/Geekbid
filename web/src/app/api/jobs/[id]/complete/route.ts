import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { sendJobCompletedSummaryEmail } from "@/lib/email";
import { creditReferralOnFirstJobCompletion } from "@/lib/referrals";

// PATCH /api/jobs/[id]/complete — Client marks job as completed
export async function PATCH(
 req: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const { payload } = auth;
 if (payload.role !== "client" && payload.role !== "admin") {
 return NextResponse.json({ error: "Only clients can mark jobs complete" }, { status: 403 });
 }

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

 if (payload.role !== "admin" && job.clientId !== payload.userId) {
 return NextResponse.json({ error: "You can only complete your own jobs" }, { status: 403 });
 }

 if (!["accepted", "in_progress"].includes(job.status)) {
 return NextResponse.json({ error: "Job must be accepted or in progress to mark complete" }, { status: 400 });
 }

 await db.collection("jobs").updateOne(
 { _id: job._id },
 { $set: { status: "completed", completedAt: new Date().toISOString() } }
 );

 // Release escrow — this is the route the frontend actually calls
 // (store.tsx completeJob), so this must happen here, not only in the
 // PATCH-action version of this endpoint.
 await db.collection("transactions").updateOne(
 { jobId: job._id.toString(), escrowStatus: "held" },
 { $set: { escrowStatus: "released", releasedAt: new Date().toISOString(), releasedBy: payload.userId } }
 );

 if (job.acceptedBy) {
 creditReferralOnFirstJobCompletion(job.acceptedBy).catch((err) =>
 console.error("[Referral Credit Failed]", err)
 );
 }

 // Send summary emails to both parties
 const client = await db.collection("users").findOne({ _id: new ObjectId(job.clientId) }).catch(() => null);
 if (job.acceptedBy) {
 const freelancer = await db.collection("users").findOne({ _id: new ObjectId(job.acceptedBy) }).catch(() => null);
 if (client?.email && freelancer?.email) {
 await sendJobCompletedSummaryEmail(
 client.email, client.fullName ?? "Client",
 freelancer.email, freelancer.fullName ?? "Freelancer",
 job.title, job.acceptedPrice ?? job.minimumPrice
 ).catch(console.error);
 }
 }

 return NextResponse.json({ ok: true, message: "Job marked as completed" });
 } catch (err) {
 console.error("[Jobs/:id/complete PATCH Error]", err);
 return NextResponse.json({ error: "Failed to complete job" }, { status: 500 });
 }
}
