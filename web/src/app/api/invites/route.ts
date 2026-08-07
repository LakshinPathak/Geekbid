import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { withPlanHeader } from "@/lib/middleware/plan-header";
import { createJobInvite } from "@/lib/create-job-invite";

/**
 * GET /api/invites — fetch invites for the current user (protected)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const db = await getDb();
    const userId = auth.payload.userId;
    const role = auth.payload.role;

    const filter = role === "client"
      ? { clientId: userId }
      : { freelancerId: userId };

    const invites = await db
      .collection("invites")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    // Populate job titles
    const jobIds = [...new Set(invites.map(i => i.jobId))];
    const jobTitleMap: Record<string, string> = {};
    if (jobIds.length > 0) {
      const jobDocs = await db.collection("jobs").find({
        $or: jobIds.map(id => {
          try { return { _id: new ObjectId(id) }; } catch { return { _id: id }; }
        }),
      }).toArray();
      jobDocs.forEach(j => { jobTitleMap[j._id.toString()] = j.title; });
    }

    return NextResponse.json(
      invites.map(inv => ({
        ...inv,
        _id: inv._id.toString(),
        id: inv._id.toString(),
        jobTitle: jobTitleMap[inv.jobId] ?? "Unknown Job",
      }))
    );
  } catch (err) {
    console.error("[Invites GET Error]", err);
    return NextResponse.json({ error: "Failed to fetch invites" }, { status: 500 });
  }
}

/**
 * POST /api/invites — create an invite (client → freelancer)
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { freelancerId, jobId } = await req.json();
    const clientId = auth.payload.userId;
    const db = await getDb();

    const result = await createJobInvite(db, clientId, freelancerId, jobId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return withPlanHeader(
      NextResponse.json(result.invite, { status: 201 }),
      result.clientPlan
    );
  } catch (err) {
    console.error("[Invites POST Error]", err);
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }
}

/**
 * PATCH /api/invites — respond to an invite (freelancer only)
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { inviteId, response } = await req.json();
    if (!inviteId || !["accepted", "declined"].includes(response)) {
      return NextResponse.json({ error: "inviteId and response (accepted|declined) required" }, { status: 400 });
    }

    // Validate inviteId is a well-formed ObjectId string BEFORE it's ever
    // used to build a Mongo filter. Falling back to `findOne({ _id: inviteId })`
    // with an unvalidated raw request value would let an object like
    // `{"$ne": null}` be smuggled straight into a filter (NoSQL injection).
    if (typeof inviteId !== "string" || !/^[a-f\d]{24}$/i.test(inviteId)) {
      return NextResponse.json({ error: "Invalid inviteId" }, { status: 400 });
    }

    const db = await getDb();

    const invite = await db.collection("invites").findOne({ _id: new ObjectId(inviteId) });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.freelancerId !== auth.payload.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const respondedAt = new Date().toISOString();
    // Atomically claim the pending invite so concurrent accept/decline calls can't both succeed
    const claimed = await db.collection("invites").findOneAndUpdate(
      { _id: new ObjectId(inviteId), status: "pending" },
      { $set: { status: response, respondedAt } }
    );
    if (!claimed) {
      return NextResponse.json({ error: "Invite already responded to" }, { status: 409 });
    }

    // Notify client if accepted
    if (response === "accepted") {
      await db.collection("notifications").insertOne({
        userId: invite.clientId,
        type: "invite_accepted",
        title: "Your invite was accepted",
        body: "A freelancer accepted your job invite. Check their bid!",
        jobId: invite.jobId,
        isRead: false,
        createdAt: respondedAt,
      });
    }

    return NextResponse.json({ ok: true, status: response });
  } catch (err) {
    console.error("[Invites PATCH Error]", err);
    return NextResponse.json({ error: "Failed to update invite" }, { status: 500 });
  }
}
