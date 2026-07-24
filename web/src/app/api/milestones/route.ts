import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { sendMilestoneSubmittedEmail, sendMilestoneApprovedEmail } from "@/lib/email";
import { toCents, toDollars } from "@/lib/money";

// GET /api/milestones?jobId=xxx
export async function GET(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const { searchParams } = new URL(req.url);
 const jobId = searchParams.get("jobId");
 if (!jobId) {
 return NextResponse.json({ error: "jobId required" }, { status: 400 });
 }

 const db = await getDb();

 // Milestones carry amounts, titles, and status — only the job's client,
 // the freelancer it was awarded to, or an admin should be able to list
 // them, not any authenticated user who knows the jobId.
 let job;
 try { job = await db.collection("jobs").findOne({ _id: new ObjectId(jobId) }); }
 catch { job = await db.collection("jobs").findOne({ id: jobId }); }
 if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
 const isParty = job.clientId === auth.payload.userId || job.acceptedBy === auth.payload.userId;
 if (!isParty && auth.payload.role !== "admin") {
 return NextResponse.json({ error: "Not authorized to view these milestones" }, { status: 403 });
 }

 const milestones = await db
 .collection("milestones")
 .find({ jobId })
 .sort({ order: 1 })
 .toArray();

 return NextResponse.json(
 milestones.map((m) => ({ ...m, _id: m._id.toString(), id: m._id.toString() }))
 );
 } catch (err) {
 console.error("[Milestones GET Error]", err);
 return NextResponse.json({ error: "Failed to fetch milestones" }, { status: 500 });
 }
}

// POST /api/milestones — create milestones for a job (client only)
export async function POST(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const body = await req.json();
 const { jobId, milestones } = body;

 if (!jobId || !Array.isArray(milestones) || milestones.length === 0) {
 return NextResponse.json({ error: "jobId and milestones array required" }, { status: 400 });
 }
 if (!ObjectId.isValid(jobId)) {
 return NextResponse.json({ error: "Invalid jobId" }, { status: 400 });
 }

 const db = await getDb();
 const job = await db.collection("jobs").findOne({ _id: new ObjectId(jobId) });
 if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
 if (job.clientId !== auth.payload.userId) {
 return NextResponse.json({ error: "Only the job client can add milestones" }, { status: 403 });
 }
 // Milestones only make sense against an awarded job's escrow — creating
 // them on a still-open (not yet funded) or cancelled/completed job leaves
 // a breakdown that can never actually be paid out against.
 if (job.status !== "accepted") {
 return NextResponse.json({ error: "Job must be accepted before milestones can be added" }, { status: 400 });
 }

 // `Number(m.amount) || 0` alone let negative amounts through (`-500` is
 // truthy) — reject any non-positive milestone amount up front instead of
 // silently coercing it.
 for (const m of milestones as { title: string; description?: string; amount: number }[]) {
 const amt = Number(m.amount);
 if (!Number.isFinite(amt) || amt <= 0) {
 return NextResponse.json({ error: "Each milestone amount must be a positive number" }, { status: 400 });
 }
 }

 const docs = milestones.map((m: { title: string; description?: string; amount: number }, i: number) => ({
 jobId,
 title: (m.title ?? "").slice(0, 200),
 description: (m.description ?? "").slice(0, 1000),
 amount: Number(m.amount),
 order: i + 1,
 status: "pending",
 createdAt: new Date().toISOString(),
 }));

 const result = await db.collection("milestones").insertMany(docs);
 const ids = Object.values(result.insertedIds).map((id) => id.toString());

 return NextResponse.json(
 docs.map((d, i) => ({ ...d, _id: ids[i], id: ids[i] })),
 { status: 201 }
 );
 } catch (err) {
 console.error("[Milestones POST Error]", err);
 return NextResponse.json({ error: "Failed to create milestones" }, { status: 500 });
 }
}

// PATCH /api/milestones — update milestone status
export async function PATCH(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const body = await req.json();
 const { milestoneId, action } = body;

 if (!milestoneId || !action) {
 return NextResponse.json({ error: "milestoneId and action required" }, { status: 400 });
 }
 if (!ObjectId.isValid(milestoneId)) {
 return NextResponse.json({ error: "Invalid milestoneId" }, { status: 400 });
 }

 const db = await getDb();
 const milestone = await db.collection("milestones").findOne({ _id: new ObjectId(milestoneId) });
 if (!milestone) return NextResponse.json({ error: "Milestone not found" }, { status: 404 });

 if (!ObjectId.isValid(milestone.jobId)) {
 return NextResponse.json({ error: "Milestone has an invalid jobId" }, { status: 400 });
 }
 const job = await db.collection("jobs").findOne({ _id: new ObjectId(milestone.jobId) });
 if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

 const update: Record<string, unknown> = {};
 let requiredStatus: string;

 if (action === "start") {
 if (job.acceptedBy !== auth.payload.userId) {
 return NextResponse.json({ error: "Only the assigned freelancer can start a milestone" }, { status: 403 });
 }
 requiredStatus = "pending";
 update.status = "in_progress";
 } else if (action === "submit") {
 if (job.acceptedBy !== auth.payload.userId) {
 return NextResponse.json({ error: "Only the assigned freelancer can submit" }, { status: 403 });
 }
 requiredStatus = "in_progress";
 update.status = "submitted";
 update.submittedAt = new Date().toISOString();
 } else if (action === "approve") {
 if (job.clientId !== auth.payload.userId && auth.payload.role !== "admin") {
 return NextResponse.json({ error: "Only client or admin can approve" }, { status: 403 });
 }
 requiredStatus = "submitted";
 update.status = "approved";
 update.approvedAt = new Date().toISOString();
 } else {
 return NextResponse.json({ error: "Invalid action" }, { status: 400 });
 }

 // Guard every transition on the milestone's current status, atomically —
 // without this, "start"/"submit" had no check at all (unlike "approve",
 // which was already CAS-guarded for its escrow release below) and a
 // freelancer could e.g. call "start" on an already-approved/paid
 // milestone and silently revert it, or double-submit.
 const claimed = await db.collection("milestones").findOneAndUpdate(
 { _id: new ObjectId(milestoneId), status: requiredStatus },
 { $set: update }
 );
 if (!claimed) {
 return NextResponse.json(
 { error: `Milestone must be "${requiredStatus}" for this action (current status may have already changed)` },
 { status: 409 }
 );
 }

 // ── Partial escrow release for this milestone ──
 // Approving a milestone is supposed to release its share of the held
 // escrow (the UI calls this button "Approve & Release"); previously this
 // only flipped the milestone's status and never touched the transaction.
 if (action === "approve") {
 let released = false;
 let escrowError: string | null = null;
 try {
 // Atomically claim this milestone's release right first. The old code
 // checked `!milestone.escrowReleased` against a read taken at the top of
 // the request, so two concurrent "approve" calls (double-click, retried
 // request) could both pass the check before either write landed and both
 // release escrow for the same milestone. The $ne guard makes MongoDB
 // serialize the check-and-claim into one atomic operation.
 const escrowClaim = await db.collection("milestones").findOneAndUpdate(
 { _id: new ObjectId(milestoneId), escrowReleased: { $ne: true } },
 { $set: { escrowReleased: true } }
 );

 if (escrowClaim) {
 // Target the exact row created at accept time (job.escrowTransactionId),
 // not an ambiguous {jobId, escrowStatus:"held"} filter — a job can also
 // carry an unrelated "held" transaction from a featured-boost payment.
 // Falls back to the tagged-purpose filter for pre-migration rows that
 // predate escrowTransactionId, matching jobs/[id]/route.ts and
 // jobs/[id]/complete/route.ts.
 const tx = job.escrowTransactionId
 ? await db.collection("transactions").findOne({ _id: new ObjectId(job.escrowTransactionId), escrowStatus: "held" })
 : await db.collection("transactions").findOne({ jobId: milestone.jobId, purpose: "job_escrow", escrowStatus: "held" });
 if (!tx) {
 escrowError = "No held escrow transaction found for this job's milestone payout.";
 } else {
 // Exact integer-cent math: no float drift, and the "fully released" check is
 // an exact comparison instead of the old `>= gross - 0.01` fudge.
 const alreadyReleasedCents = toCents(tx.releasedAmount ?? 0);
 const grossCents = toCents(tx.grossAmount);
 const amountToReleaseCents = Math.min(toCents(milestone.amount || 0), grossCents - alreadyReleasedCents);
 if (amountToReleaseCents <= 0) {
 // Nothing left to release against this transaction (e.g. already
 // fully released by other milestones) — not a failure.
 released = true;
 } else {
 const newReleasedCents = alreadyReleasedCents + amountToReleaseCents;
 const isFullyReleased = newReleasedCents >= grossCents;
 // Compare-and-swap on the exact `releasedAmount` we read: if another
 // milestone on this same job released escrow between our read and
 // write, matchedCount is 0 and we treat this as a failed release
 // rather than silently marking the milestone released-with-no-payout.
 const txUpdate = await db.collection("transactions").updateOne(
 { _id: tx._id, escrowStatus: "held", releasedAmount: tx.releasedAmount ?? null },
 {
 $set: {
 releasedAmount: toDollars(newReleasedCents),
 ...(isFullyReleased
 ? { escrowStatus: "released", releasedAt: new Date().toISOString(), releasedBy: auth.payload.userId }
 : {}),
 },
 }
 );
 if (txUpdate.matchedCount > 0) {
 await db.collection("milestones").updateOne(
 { _id: new ObjectId(milestoneId) },
 { $set: { releasedAmount: toDollars(amountToReleaseCents), releasedAt: new Date().toISOString() } }
 );
 released = true;
 } else {
 escrowError = "Escrow release was contended by a concurrent update — please retry.";
 }
 }
 }
 } else {
 // Another request already claimed and released escrow for this
 // milestone — nothing more for this request to do.
 released = true;
 }
 } catch (err) {
 console.error("[Milestone Escrow Release Failed]", err);
 escrowError = "Escrow release failed unexpectedly.";
 }

 if (!released) {
 // Money never actually moved — don't leave the milestone marked
 // "approved"/escrowReleased, which would make the client believe the
 // freelancer was paid when they weren't. Roll back the status change
 // made by the CAS above and surface a clear error instead.
 await db.collection("milestones").updateOne(
 { _id: new ObjectId(milestoneId) },
 { $set: { status: requiredStatus }, $unset: { approvedAt: "", escrowReleased: "" } }
 );
 return NextResponse.json(
 { error: `Milestone approval could not release escrow (${escrowError ?? "unknown error"}). Please retry or contact support.` },
 { status: 409 }
 );
 }
 }

 // Fire-and-forget: milestone email notifications
 if (action === "submit" && job.clientId) {
 // Freelancer submitted → notify the client
 const client = await db.collection("users").findOne(
 { _id: new ObjectId(job.clientId) },
 { projection: { email: 1, fullName: 1 } }
 );
 const freelancer = await db.collection("users").findOne(
 { _id: new ObjectId(auth.payload.userId) },
 { projection: { fullName: 1 } }
 );
 if (client?.email) {
 sendMilestoneSubmittedEmail(
 client.email,
 client.fullName ?? "Client",
 freelancer?.fullName ?? "A freelancer",
 milestone.title ?? "Milestone",
 milestone.amount ?? 0,
 job.title ?? "Untitled Job"
 ).catch(() => {});
 }
 } else if (action === "approve" && job.acceptedBy) {
 // Client approved → notify the freelancer
 const freelancer = await db.collection("users").findOne(
 { _id: new ObjectId(job.acceptedBy) },
 { projection: { email: 1, fullName: 1 } }
 );
 if (freelancer?.email) {
 sendMilestoneApprovedEmail(
 freelancer.email,
 freelancer.fullName ?? "Freelancer",
 milestone.title ?? "Milestone",
 milestone.amount ?? 0,
 job.title ?? "Untitled Job"
 ).catch(() => {});
 }
 }

 return NextResponse.json({ ok: true, status: update.status });
 } catch (err) {
 console.error("[Milestones PATCH Error]", err);
 return NextResponse.json({ error: "Failed to update milestone" }, { status: 500 });
 }
}
