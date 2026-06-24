import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";

// GET /api/bids?jobId=xxx (public)
export async function GET(req: NextRequest) {
  try {
    const jobId = req.nextUrl.searchParams.get("jobId");
    const db = await getDb();
    const filter = jobId ? { jobId } : {};
    const bids = await db
      .collection("bids")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();
    return NextResponse.json(
      bids.map((b) => ({ ...b, _id: b._id.toString(), id: b._id.toString() }))
    );
  } catch (err) {
    console.error("[Bids GET Error]", err);
    return NextResponse.json({ error: "Failed to fetch bids" }, { status: 500 });
  }
}

// POST /api/bids — place a counter-bid (protected, freelancer only)
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (auth.payload.role !== "freelancer") {
      return NextResponse.json(
        { error: "Only freelancers can place bids" },
        { status: 403 }
      );
    }

    const { jobId, bidPrice, message } = await req.json();
    if (!jobId || !bidPrice) {
      return NextResponse.json(
        { error: "jobId and bidPrice are required" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Plan limit enforcement for freelancers
    const user = await db.collection("users").findOne({ _id: new ObjectId(auth.payload.userId) });
    if (user) {
      const plan = user.plan ?? "free";
      if (plan === "free") {
        const limits = user.planLimits ?? { bidsPlacedThisMonth: 0, monthResetAt: new Date(0).toISOString() };
        if (new Date(limits.monthResetAt) < new Date()) {
          await db.collection("users").updateOne({ _id: user._id }, {
            $set: { "planLimits.jobsPostedThisMonth": 0, "planLimits.bidsPlacedThisMonth": 0, "planLimits.monthResetAt": new Date(Date.now() + 30 * 24 * 3600000).toISOString() }
          });
        } else if (limits.bidsPlacedThisMonth >= 10) {
          return NextResponse.json({ error: "Free plan limit: 10 bids/month. Upgrade to Pro for unlimited." }, { status: 403 });
        }
      }
    }

    const bid = {
      jobId,
      freelancerId: auth.payload.userId,
      bidType: "counter",
      bidPrice: Number(bidPrice),
      message: message ?? "",
      createdAt: new Date().toISOString(),
    };

    const result = await db.collection("bids").insertOne(bid);
    await db.collection("users").updateOne(
      { _id: new ObjectId(auth.payload.userId) },
      { $inc: { "planLimits.bidsPlacedThisMonth": 1 } }
    );
    return NextResponse.json(
      { ...bid, _id: result.insertedId.toString(), id: result.insertedId.toString() },
      { status: 201 }
    );
  } catch (err) {
    console.error("[Bids POST Error]", err);
    return NextResponse.json({ error: "Failed to place bid" }, { status: 500 });
  }
}
