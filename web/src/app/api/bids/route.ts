import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";

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
    const bid = {
      jobId,
      freelancerId: auth.payload.userId,
      bidType: "counter",
      bidPrice: Number(bidPrice),
      message: message ?? "",
      createdAt: new Date().toISOString(),
    };

    const result = await db.collection("bids").insertOne(bid);
    return NextResponse.json(
      { ...bid, _id: result.insertedId.toString(), id: result.insertedId.toString() },
      { status: 201 }
    );
  } catch (err) {
    console.error("[Bids POST Error]", err);
    return NextResponse.json({ error: "Failed to place bid" }, { status: 500 });
  }
}
