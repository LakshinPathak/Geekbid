import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { sendJobCancelledEmail } from "@/lib/email";

// PATCH /api/jobs/[id]/cancel — Client cancels their own open job
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
 return NextResponse.json({ error: "Only clients can cancel jobs" }, { status: 403 });
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
 return NextResponse.json({ error: "You can only cancel your own jobs" }, { status: 403 });
 }

 if (job.status !== "open") {
 return NextResponse.json({ error: "Only open jobs can be cancelled" }, { status: 400 });
 }

 // Atomic claim: the earlier `job.status !== "open"` check above is just a
 // fast-path rejection — a concurrent accept could flip the job to
 // "accepted" between that read and this write. Requiring status: "open"
 // in the filter itself (matching the accept/complete pattern in
 // jobs/[id]/route.ts) makes the actual cancel a no-op unless it wins the
 // race, instead of unconditionally overwriting whatever accept just did.
 const jobId = job._id.toString();
 const cancelledJob = await db.collection("jobs").findOneAndUpdate(
 { _id: job._id, status: "open" },
 { $set: { status: "cancelled", cancelledAt: new Date().toISOString() } }
 );
 if (!cancelledJob) {
 return NextResponse.json({ error: "Job was already accepted or cancelled" }, { status: 409 });
 }

 // Notify all bidders — batch-fetch the freelancers with a single $in query
 // instead of one findOne per bidder, and fire off the email sends without
 // awaiting each one in turn, so cancellation doesn't block the response on
 // notification delivery (matches the fire-and-forget pattern used for
 // notification emails elsewhere in this codebase).
 const bids = await db.collection("bids").find({ jobId }).toArray();
 const freelancerIds = [...new Set(bids.map((b) => b.freelancerId))];
 if (freelancerIds.length > 0) {
 const freelancerObjectIds = freelancerIds
 .map((fid) => { try { return new ObjectId(fid); } catch { return null; } })
 .filter((oid): oid is ObjectId => oid !== null);
 const freelancers = await db.collection("users")
 .find({ _id: { $in: freelancerObjectIds } })
 .project({ email: 1, fullName: 1 })
 .toArray();
 for (const freelancer of freelancers) {
 if (freelancer.email) {
 sendJobCancelledEmail(freelancer.email as string, (freelancer.fullName as string) ?? "Freelancer", job.title).catch(console.error);
 }
 }
 }

 return NextResponse.json({ ok: true, message: "Job cancelled successfully" });
 } catch (err) {
 console.error("[Jobs/:id/cancel PATCH Error]", err);
 return NextResponse.json({ error: "Failed to cancel job" }, { status: 500 });
 }
}
