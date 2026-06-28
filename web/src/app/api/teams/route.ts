import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { sendTeamInviteEmail } from "@/lib/email";

// GET /api/teams — get user's team
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const db = await getDb();
    const team = await db.collection("teams").findOne({
      $or: [
        { ownerId: auth.payload.userId },
        { memberIds: auth.payload.userId },
      ],
    });

    if (!team) return NextResponse.json(null);

    // Get team analytics
    const memberUsers = await db.collection("users")
      .find({ _id: { $in: [team.ownerId, ...team.memberIds].map((id: string) => new ObjectId(id)) } })
      .project({ password: 0 })
      .toArray();

    const teamJobs = await db.collection("jobs")
      .find({ clientId: { $in: [team.ownerId, ...team.memberIds] } })
      .toArray();

    const teamTransactions = await db.collection("transactions")
      .find({ clientId: { $in: [team.ownerId, ...team.memberIds] } })
      .toArray();

    return NextResponse.json({
      ...team,
      _id: team._id.toString(),
      id: team._id.toString(),
      members: memberUsers.map(u => ({ ...u, _id: u._id.toString(), id: u._id.toString() })),
      analytics: {
        totalJobs: teamJobs.length,
        activeJobs: teamJobs.filter(j => j.status === "open").length,
        totalSpend: teamTransactions.reduce((s, t) => s + (t.grossAmount ?? 0), 0),
      },
    });
  } catch (err) {
    console.error("[Teams GET Error]", err);
    return NextResponse.json({ error: "Failed to fetch team" }, { status: 500 });
  }
}

// POST /api/teams — create team
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { name } = body;

    if (!name) return NextResponse.json({ error: "Team name required" }, { status: 400 });

    const db = await getDb();

    // Check user isn't already in a team
    const existing = await db.collection("teams").findOne({
      $or: [{ ownerId: auth.payload.userId }, { memberIds: auth.payload.userId }],
    });
    if (existing) return NextResponse.json({ error: "Already in a team" }, { status: 409 });

    const team = {
      name: name.trim().slice(0, 100),
      ownerId: auth.payload.userId,
      memberIds: [],
      invites: [],
      createdAt: new Date().toISOString(),
    };

    const result = await db.collection("teams").insertOne(team);

    await db.collection("users").updateOne(
      { _id: new ObjectId(auth.payload.userId) },
      { $set: { teamId: result.insertedId.toString(), teamRole: "owner" } }
    );

    return NextResponse.json(
      { ...team, _id: result.insertedId.toString(), id: result.insertedId.toString() },
      { status: 201 }
    );
  } catch (err) {
    console.error("[Teams POST Error]", err);
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 });
  }
}

// PATCH /api/teams — invite member or accept invite
export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { action, email, teamId } = body;
    const db = await getDb();

    if (action === "invite") {
      if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

      const team = await db.collection("teams").findOne({ ownerId: auth.payload.userId });
      if (!team) return NextResponse.json({ error: "You don't own a team" }, { status: 403 });

      await db.collection("teams").updateOne(
        { _id: team._id },
        { $push: { invites: { email, status: "pending", invitedAt: new Date().toISOString() } } as never }
      );

      // Fire-and-forget: email the invited user
      const inviter = await db.collection("users").findOne(
        { _id: new ObjectId(auth.payload.userId) },
        { projection: { name: 1 } }
      );
      sendTeamInviteEmail(
        email,
        team.name ?? "A Team",
        inviter?.name ?? "Someone"
      ).catch(() => {});

      return NextResponse.json({ ok: true, message: "Invite sent" });
    }

    if (action === "accept") {
      if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

      const team = await db.collection("teams").findOne({ _id: new ObjectId(teamId) });
      if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

      const invite = team.invites?.find((i: { email: string; status: string }) =>
        i.email === auth.payload.email && i.status === "pending"
      );
      if (!invite) return NextResponse.json({ error: "No pending invite found" }, { status: 404 });

      await db.collection("teams").updateOne(
        { _id: team._id, "invites.email": auth.payload.email },
        {
          $set: { "invites.$.status": "accepted" },
          $push: { memberIds: auth.payload.userId } as never,
        }
      );

      await db.collection("users").updateOne(
        { _id: new ObjectId(auth.payload.userId) },
        { $set: { teamId: teamId, teamRole: "member" } }
      );

      return NextResponse.json({ ok: true, message: "Joined team" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[Teams PATCH Error]", err);
    return NextResponse.json({ error: "Failed to update team" }, { status: 500 });
  }
}
