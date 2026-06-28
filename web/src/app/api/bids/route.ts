import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { sendNewBidEmail, sendPriceTargetAlertEmail } from "@/lib/email";

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

    // 30-minute per-user bid cooldown (anti-spam / anti-freeze)
    const lastBidByUser = await db.collection("bids").findOne(
      { jobId, freelancerId: auth.payload.userId },
      { sort: { createdAt: -1 }, projection: { createdAt: 1 } }
    );
    if (lastBidByUser) {
      const minutesSinceLast =
        (Date.now() - new Date(lastBidByUser.createdAt).getTime()) / 60000;
      if (minutesSinceLast < 30) {
        return NextResponse.json(
          {
            error: `Wait ${Math.ceil(30 - minutesSinceLast)} min before bidding again on this job`,
          },
          { status: 429 }
        );
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

    // ── Update job demand signals ──
    const updateOps: Record<string, unknown> = {
      $set: { lastBidAt: bid.createdAt },
      $inc: { bidCount: 1 },
      $push: {
        priceHistory: {
          $each: [
            {
              price: Number(bidPrice),
              at: bid.createdAt,
              event: "counter_bid",
            },
          ],
          $slice: -50, // keep last 50 entries max
        },
      },
    };

    // Track lowest counter-bid for price pull effect
    const jobDoc = await db
      .collection("jobs")
      .findOne(
        { _id: new ObjectId(jobId) },
        { projection: { lowestCounterBid: 1, clientId: 1, title: 1, minimumPrice: 1 } }
      );
    if (
      jobDoc &&
      (jobDoc.lowestCounterBid === null ||
        jobDoc.lowestCounterBid === undefined ||
        Number(bidPrice) < jobDoc.lowestCounterBid)
    ) {
      (updateOps.$set as Record<string, unknown>).lowestCounterBid =
        Number(bidPrice);
    }

    // Count unique bidders (anti-gaming: one person can't inflate demand)
    const uniqueBidders = await db
      .collection("bids")
      .distinct("freelancerId", { jobId });
    (updateOps.$set as Record<string, unknown>).uniqueBidderCount =
      uniqueBidders.length;

    await db
      .collection("jobs")
      .updateOne({ _id: new ObjectId(jobId) }, updateOps);

    // Fire-and-forget: notify the client about the new bid
    if (jobDoc?.clientId) {
      const client = await db.collection("users").findOne(
        { _id: new ObjectId(jobDoc.clientId) },
        { projection: { email: 1, name: 1 } }
      );
      if (client?.email) {
        const freelancerUser = await db.collection("users").findOne(
          { _id: new ObjectId(auth.payload.userId) },
          { projection: { name: 1 } }
        );
        sendNewBidEmail(
          client.email,
          client.name ?? "Client",
          freelancerUser?.name ?? "A freelancer",
          jobDoc.title ?? "Untitled Job",
          Number(bidPrice),
          jobId
        ).catch(() => {});

        // Price target alert: if bid is within 110% of floor price
        if (jobDoc.minimumPrice && Number(bidPrice) <= jobDoc.minimumPrice * 1.1) {
          sendPriceTargetAlertEmail(
            client.email, client.name ?? "Client",
            freelancerUser?.name ?? "A freelancer",
            jobDoc.title ?? "Untitled Job",
            Number(bidPrice), jobDoc.minimumPrice,
            jobId, result.insertedId.toString()
          ).catch(() => {});
        }
      }
    }

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
