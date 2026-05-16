import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { authenticateRequest } from "@/lib/auth";

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

// PATCH /api/jobs/[id] — accept job (protected, freelancer only)
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

    if (auth.payload.role !== "freelancer") {
      return NextResponse.json(
        { error: "Only freelancers can accept jobs" },
        { status: 403 }
      );
    }

    const body = await req.json();
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

    const finalPrice = Number(body.finalPrice);
    const filter = job._id ? { _id: job._id } : { id };

    await db.collection("jobs").updateOne(filter, {
      $set: {
        status: "accepted",
        acceptedBy: auth.payload.userId,
        finalPrice,
        acceptedAt: new Date().toISOString(),
      },
    });

    // Create bid record
    await db.collection("bids").insertOne({
      jobId: id,
      freelancerId: auth.payload.userId,
      bidType: "accept",
      bidPrice: finalPrice,
      createdAt: new Date().toISOString(),
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
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, finalPrice });
  } catch (err) {
    console.error("[Job PATCH Error]", err);
    return NextResponse.json(
      { error: "Failed to accept job" },
      { status: 500 }
    );
  }
}
