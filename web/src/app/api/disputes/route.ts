import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { sendDisputeResolvedEmail } from "@/lib/email";

/**
 * GET /api/disputes — list disputes (protected)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const db = await getDb();
    const filter =
      auth.payload.role === "admin"
        ? {}
        : { raisedBy: auth.payload.userId };

    const disputes = await db
      .collection("disputes")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return NextResponse.json(
      disputes.map((d) => ({
        ...d,
        _id: d._id.toString(),
        id: d._id.toString(),
      }))
    );
  } catch (err) {
    console.error("[Disputes GET Error]", err);
    return NextResponse.json(
      { error: "Failed to fetch disputes" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/disputes — resolve a dispute (admin only)
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (auth.payload.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can resolve disputes" },
        { status: 403 }
      );
    }

    const { disputeId, resolution, status: newStatus } = await req.json();
    if (!disputeId || !newStatus) {
      return NextResponse.json(
        { error: "disputeId and status required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    await db.collection("disputes").updateOne(
      { _id: new ObjectId(disputeId) },
      {
        $set: {
          status: newStatus,
          resolution: resolution ?? "",
          resolvedAt: new Date().toISOString(),
          resolvedBy: auth.payload.userId,
        },
      }
    );

    // Fire-and-forget: notify the user who raised the dispute
    const dispute = await db.collection("disputes").findOne({ _id: new ObjectId(disputeId) });
    if (dispute?.raisedBy) {
      const raiser = await db.collection("users").findOne(
        { _id: new ObjectId(dispute.raisedBy) },
        { projection: { email: 1, name: 1 } }
      );
      if (raiser?.email) {
        sendDisputeResolvedEmail(
          raiser.email,
          raiser.name ?? "User",
          dispute.jobTitle ?? "a project",
          resolution ?? newStatus,
          dispute.transactionId
        ).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true, message: "Dispute updated" });
  } catch (err) {
    console.error("[Disputes PATCH Error]", err);
    return NextResponse.json(
      { error: "Failed to update dispute" },
      { status: 500 }
    );
  }
}
