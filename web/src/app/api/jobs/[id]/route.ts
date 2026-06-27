import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { authenticateRequest } from "@/lib/auth";
import { getAdaptivePrice } from "@/lib/pricing";

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

    // ── Server-side price computation — NEVER trust client price ──
    const now = new Date();
    let finalPrice: number;

    if (job.pricingMode === "fixed") {
      // Fixed decay: simple formula
      const elapsedMs = Math.max(
        now.getTime() - new Date(job.postedAt).getTime(),
        0
      );
      const elapsedHours = elapsedMs / (1000 * 60 * 60);
      finalPrice = Math.max(
        job.startingPrice - job.decayRatePerHour * elapsedHours,
        job.minimumPrice
      );
    } else {
      // Adaptive: recompute from real bid data in DB
      const bidCount = await db
        .collection("bids")
        .countDocuments({ jobId: id });
      const uniqueBidders = await db
        .collection("bids")
        .distinct("freelancerId", { jobId: id });
      const lastBid = await db.collection("bids").findOne(
        { jobId: id },
        { sort: { createdAt: -1 }, projection: { createdAt: 1 } }
      );
      const lowestCounter = await db.collection("bids").findOne(
        { jobId: id, bidType: "counter" },
        { sort: { bidPrice: 1 }, projection: { bidPrice: 1 } }
      );

      finalPrice = getAdaptivePrice(
        {
          startingPrice: job.startingPrice,
          minimumPrice: job.minimumPrice,
          decayRatePerHour: job.decayRatePerHour,
          postedAt: job.postedAt,
          pricingMode: "adaptive",
          bidCount,
          uniqueBidderCount: uniqueBidders.length,
          lastBidAt: lastBid?.createdAt ?? null,
          lowestCounterBid: lowestCounter?.bidPrice ?? null,
        },
        now
      );
    }

    finalPrice = Number(finalPrice.toFixed(2));

    // Log divergence if client sent a different price (diagnostic only)
    const clientPrice = Number(body.finalPrice);
    if (Math.abs(clientPrice - finalPrice) > 1) {
      console.warn(
        `[Price Divergence] job=${id} client=$${clientPrice} server=$${finalPrice}`
      );
    }

    const filter = job._id ? { _id: job._id } : { id };
    const acceptedAt = now.toISOString();

    await db.collection("jobs").updateOne(filter, {
      $set: {
        status: "accepted",
        acceptedBy: auth.payload.userId,
        finalPrice,
        acceptedAt,
      },
      $push: {
        priceHistory: {
          price: finalPrice,
          at: acceptedAt,
          event: "accepted",
        },
      } as any,
    });

    // Create bid record
    await db.collection("bids").insertOne({
      jobId: id,
      freelancerId: auth.payload.userId,
      bidType: "accept",
      bidPrice: finalPrice,
      createdAt: acceptedAt,
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
      createdAt: acceptedAt,
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
