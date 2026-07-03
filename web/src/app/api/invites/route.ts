import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";

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
    const { ObjectId } = await import("mongodb");
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
    if (!freelancerId || !jobId) {
      return NextResponse.json({ error: "freelancerId and jobId required" }, { status: 400 });
    }

    const clientId = auth.payload.userId;
    const db = await getDb();

    // Check for duplicate
    const existing = await db.collection("invites").findOne({ clientId, freelancerId, jobId });
    if (existing) {
      return NextResponse.json({ error: "Invite already sent for this job" }, { status: 409 });
    }

    // Get job title for notification
    const { ObjectId } = await import("mongodb");
    let rawJobDoc;
    try {
      rawJobDoc = await db.collection("jobs").findOne({ _id: new ObjectId(jobId) });
    } catch {
      rawJobDoc = await db.collection("jobs").findOne({ _id: jobId });
    }
    const jobDoc = rawJobDoc as { title?: string } | null;
    const jobTitle = jobDoc?.title ?? "a job";

    const now = new Date().toISOString();
    const invite = {
      clientId,
      freelancerId,
      jobId,
      status: "pending",
      createdAt: now,
      respondedAt: null,
    };

    const result = await db.collection("invites").insertOne(invite);

    // Create notification for the freelancer
    await db.collection("notifications").insertOne({
      userId: freelancerId,
      type: "job_invite",
      title: `You've been invited to bid on "${jobTitle}"`,
      body: "A client wants you specifically for this project. Check it out!",
      jobId,
      isRead: false,
      createdAt: now,
    });

    return NextResponse.json(
      { ...invite, _id: result.insertedId.toString(), id: result.insertedId.toString() },
      { status: 201 }
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

    const { ObjectId } = await import("mongodb");
    const db = await getDb();

    let invite: Record<string, unknown> | null = null;
    try {
      invite = await db.collection("invites").findOne({ _id: new ObjectId(inviteId) });
    } catch {
      invite = await db.collection("invites").findOne({ _id: inviteId });
    }

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.freelancerId !== auth.payload.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const respondedAt = new Date().toISOString();
    try {
      await db.collection("invites").updateOne(
        { _id: new ObjectId(inviteId) },
        { $set: { status: response, respondedAt } }
      );
    } catch {
      await db.collection("invites").updateOne(
        { _id: inviteId },
        { $set: { status: response, respondedAt } }
      );
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
