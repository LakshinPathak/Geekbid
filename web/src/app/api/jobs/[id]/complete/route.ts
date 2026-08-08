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

 // A job whose escrow is under an open dispute must not be marked complete.
 // Without this check, the atomic claim below only guards on job.status —
 // it has no idea a dispute exists — so it would happily flip the job to
 // "completed", the escrow-release step a few lines down would silently
 // no-op (its own CAS only matches escrowStatus:"held", not "disputed"),
 // and this endpoint would still report {ok:true} "Job marked as
 // completed" even though the money is frozen in dispute and neither party
 // was told the release failed.
 if (job.escrowTransactionId) {
 const escrowTx = await db.collection("transactions").findOne({ _id: new ObjectId(job.escrowTransactionId) });
 if (escrowTx?.escrowStatus === "disputed") {
 return NextResponse.json(
 { error: "This job's escrow is under an open dispute and cannot be marked complete until the dispute is resolved." },
 { status: 409 }
 );
 }
 }

 // Atomically claim the completion — a bare findOne+updateOne let two
 // concurrent complete requests both pass the status check and both fire
 // the summary emails below (the escrow release and referral credit happen
 // to be individually idempotent, but the duplicate emails weren't).
 // "in_progress" is a milestone status, never a job status — no write path
 // in the app ever sets job.status to that value, so it's dropped here.
 const claimedJob = await db.collection("jobs").findOneAndUpdate(
 { _id: job._id, status: "accepted" },
 { $set: { status: "completed", completedAt: new Date().toISOString() } }
 );
 if (!claimedJob) {
 return NextResponse.json({ error: "Job must be accepted to mark complete" }, { status: 400 });
 }

 // Release escrow — this is the route the frontend actually calls
 // (store.tsx completeJob), so this must happen here, not only in the
 // PATCH-action version of this endpoint.
 //
 // Target the exact row created at accept time (job.escrowTransactionId),
 // not any {jobId, escrowStatus:"held"} row — a job can also carry an
 // unrelated "held" transaction from a featured-boost payment (api/payments
 // PATCH tags jobId on those too), which a bare filter could release
 // instead of the real job escrow. Falls back to the tagged-purpose filter
 // for any pre-migration rows that predate escrowTransactionId.
 let escrowReleaseMatched: number;
 if (job.escrowTransactionId) {
 const releaseResult = await db.collection("transactions").updateOne(
 { _id: new ObjectId(job.escrowTransactionId), escrowStatus: "held" },
 { $set: { escrowStatus: "released", releasedAt: new Date().toISOString(), releasedBy: payload.userId } }
 );
 escrowReleaseMatched = releaseResult.matchedCount;
 } else {
 const releaseResult = await db.collection("transactions").updateOne(
 { jobId: job._id.toString(), purpose: "job_escrow", escrowStatus: "held" },
 { $set: { escrowStatus: "released", releasedAt: new Date().toISOString(), releasedBy: payload.userId } }
 );
 escrowReleaseMatched = releaseResult.matchedCount;
 }

 // Narrow race: a dispute could have been raised in the gap between the
 // pre-check above and the atomic completion claim. If the release above
 // matched nothing and the escrow is now disputed, roll the job back to
 // "accepted" instead of reporting success on a job whose money is stuck.
 if (escrowReleaseMatched === 0 && job.escrowTransactionId) {
 const escrowTxNow = await db.collection("transactions").findOne({ _id: new ObjectId(job.escrowTransactionId) });
 if (escrowTxNow?.escrowStatus === "disputed") {
 await db.collection("jobs").updateOne(
 { _id: job._id, status: "completed" },
 { $set: { status: "accepted" }, $unset: { completedAt: "" } }
 );
 return NextResponse.json(
 { error: "This job's escrow is under an open dispute and cannot be marked complete until the dispute is resolved." },
 { status: 409 }
 );
 }
 }

 if (job.acceptedBy) {
 creditReferralOnFirstJobCompletion(job.acceptedBy).catch((err) =>
 console.error("[Referral Credit Failed]", err)
 );
 }

 // Send summary emails to both parties — each recipient is emailed
 // independently inside sendJobCompletedSummaryEmail, so one party missing
 // an email address (e.g. an OAuth-only signup) must not suppress the
 // notification to the other party who has a valid one.
 const client = await db.collection("users").findOne({ _id: new ObjectId(job.clientId) }).catch(() => null);
 if (job.acceptedBy) {
 const freelancer = await db.collection("users").findOne({ _id: new ObjectId(job.acceptedBy) }).catch(() => null);
 if (client?.email || freelancer?.email) {
 await sendJobCompletedSummaryEmail(
 client?.email ?? "", client?.fullName ?? "Client",
 freelancer?.email ?? "", freelancer?.fullName ?? "Freelancer",
 job.title, job.finalPrice ?? job.minimumPrice
 ).catch(console.error);
 }
 }

 return NextResponse.json({ ok: true, message: "Job marked as completed" });
 } catch (err) {
 console.error("[Jobs/:id/complete PATCH Error]", err);
 return NextResponse.json({ error: "Failed to complete job" }, { status: 500 });
 }
}
