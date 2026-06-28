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

    const jobId = job._id.toString();
    await db.collection("jobs").updateOne(
      { _id: job._id },
      { $set: { status: "cancelled", cancelledAt: new Date().toISOString() } }
    );

    // Notify all bidders
    const bids = await db.collection("bids").find({ jobId }).toArray();
    const freelancerIds = [...new Set(bids.map((b) => b.freelancerId))];
    for (const fid of freelancerIds) {
      const freelancer = await db.collection("users").findOne({ _id: new ObjectId(fid) }).catch(() => null);
      if (freelancer?.email) {
        await sendJobCancelledEmail(freelancer.email, freelancer.fullName ?? "Freelancer", job.title).catch(console.error);
      }
    }

    return NextResponse.json({ ok: true, message: "Job cancelled successfully" });
  } catch (err) {
    console.error("[Jobs/:id/cancel PATCH Error]", err);
    return NextResponse.json({ error: "Failed to cancel job" }, { status: 500 });
  }
}
