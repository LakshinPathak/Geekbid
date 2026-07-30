import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { sendTeamInviteEmail } from "@/lib/email";
import { getPlanConfig } from "@/lib/plans";
import { withPlanHeader } from "@/lib/middleware/plan-header";

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

 if (!team) {
 // Not yet an owner/member — but they may have a pending invite waiting.
 // Without this, an invitee has no way to ever see or accept it: the UI
 // only rendered a "Create a Team" screen for anyone GET returned null for.
 const pendingInviteTeam = await db.collection("teams").findOne({
 "invites.email": auth.payload.email,
 "invites.status": "pending",
 });
 if (pendingInviteTeam) {
 return NextResponse.json({
 team: null,
 pendingInvite: {
 teamId: pendingInviteTeam._id.toString(),
 teamName: pendingInviteTeam.name ?? "A Team",
 },
 });
 }
 return NextResponse.json(null);
 }

 // Get team analytics — allowlist projection, not a `password: 0` denylist:
 // teammates should see who's on the team, not each other's email,
 // googleId, or billing internals, none of which the UI needs here.
 const memberUsers = await db.collection("users")
 .find({ _id: { $in: [team.ownerId, ...team.memberIds].map((id: string) => new ObjectId(id)) } })
 .project({ fullName: 1, avatarInitial: 1, avatarUrl: 1, geekScore: 1, role: 1 })
 .toArray();

 // Only counts/sums are needed here — pulling every job and transaction
 // document into memory just to .length/.reduce() them doesn't scale as a
 // team's history grows. countDocuments and a $sum aggregation do the same
 // math server-side without materializing the full documents.
 const teamMemberIds = [team.ownerId, ...team.memberIds];
 const [totalJobs, activeJobs, spendAgg] = await Promise.all([
 db.collection("jobs").countDocuments({ clientId: { $in: teamMemberIds } }),
 db.collection("jobs").countDocuments({ clientId: { $in: teamMemberIds }, status: "open" }),
 db.collection("transactions").aggregate([
 { $match: { clientId: { $in: teamMemberIds } } },
 { $group: { _id: null, total: { $sum: "$grossAmount" } } },
 ]).toArray(),
 ]);
 const totalSpend = (spendAgg[0]?.total as number | undefined) ?? 0;

 return NextResponse.json({
 ...team,
 _id: team._id.toString(),
 id: team._id.toString(),
 members: memberUsers.map(u => ({ ...u, _id: u._id.toString(), id: u._id.toString() })),
 analytics: {
 totalJobs,
 activeJobs,
 totalSpend,
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

 // Team seats are a paid feature — free plan has 0 seats and can't create a team at all.
 const creator = await db.collection("users").findOne({ _id: new ObjectId(auth.payload.userId) });
 const config = getPlanConfig(creator?.plan);
 if (config.limits.teamSeats <= 0) {
 return NextResponse.json({ error: `${config.name} plan does not include team seats. Upgrade to Plus or Premium to create a team.` }, { status: 403 });
 }

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

 return withPlanHeader(
 NextResponse.json(
 { ...team, _id: result.insertedId.toString(), id: result.insertedId.toString() },
 { status: 201 }
 ),
 creator?.plan ?? "free"
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

 // Seat cap: owner + accepted members + still-pending invites must not exceed
 // the owner's plan seat count — otherwise every pending invite could be
 // accepted at once and blow past the paid-for limit.
 const owner = await db.collection("users").findOne({ _id: new ObjectId(auth.payload.userId) });
 const config = getPlanConfig(owner?.plan);
 const pendingInviteCount = (team.invites ?? []).filter((i: { status: string }) => i.status === "pending").length;
 const seatsUsed = 1 + (team.memberIds?.length ?? 0) + pendingInviteCount;
 if (seatsUsed >= config.limits.teamSeats) {
 return NextResponse.json({ error: `${config.name} plan limit: ${config.limits.teamSeats} team seats. Upgrade for more.` }, { status: 403 });
 }

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

 return withPlanHeader(NextResponse.json({ ok: true, message: "Invite sent" }), owner?.plan ?? "free");
 }

 if (action === "accept") {
 if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

 // Unlike POST (create), this had no check that the user isn't already in
 // a team — accepting a second invite would overwrite users.teamId to the
 // new team while the old team's memberIds still listed them, leaving a
 // stale membership whose seat/analytics math no longer matches reality.
 const existingMembership = await db.collection("teams").findOne({
 $or: [{ ownerId: auth.payload.userId }, { memberIds: auth.payload.userId }],
 });
 if (existingMembership) return NextResponse.json({ error: "Already in a team" }, { status: 409 });

 const team = await db.collection("teams").findOne({ _id: new ObjectId(teamId) });
 if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

 const invite = team.invites?.find((i: { email: string; status: string }) =>
 i.email === auth.payload.email && i.status === "pending"
 );
 if (!invite) return NextResponse.json({ error: "No pending invite found" }, { status: 404 });

 // Re-check the seat cap against the owner's *current* plan (it may have
 // been downgraded since the invite was sent) and enforce it atomically —
 // $expr's $size is evaluated against the document findOneAndUpdate is
 // about to write to, so two concurrent accepts (or an accept racing a
 // downgrade) can't both slip past a cap that only had room for one more.
 const owner = await db.collection("users").findOne({ _id: new ObjectId(team.ownerId) });
 const config = getPlanConfig(owner?.plan);
 const allowedMembers = Math.max(0, config.limits.teamSeats - 1);

 const claimedTeam = await db.collection("teams").findOneAndUpdate(
 {
 _id: team._id,
 "invites.email": auth.payload.email,
 "invites.status": "pending",
 $expr: { $lt: [{ $size: { $ifNull: ["$memberIds", []] } }, allowedMembers] },
 },
 {
 $set: { "invites.$.status": "accepted" },
 $push: { memberIds: auth.payload.userId } as never,
 }
 );
 if (!claimedTeam) {
 return NextResponse.json(
 { error: "This team is full for the owner's current plan, or your invite is no longer pending" },
 { status: 409 }
 );
 }

 await db.collection("users").updateOne(
 { _id: new ObjectId(auth.payload.userId) },
 { $set: { teamId: teamId, teamRole: "member" } }
 );

 return NextResponse.json({ ok: true, message: "Joined team" });
 }

 if (action === "remove_member") {
 const { memberId } = body;
 if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });

 const team = await db.collection("teams").findOne({ ownerId: auth.payload.userId });
 if (!team) return NextResponse.json({ error: "You don't own a team" }, { status: 403 });
 if (!(team.memberIds ?? []).includes(memberId)) {
 return NextResponse.json({ error: "That user is not a member of your team" }, { status: 404 });
 }

 await db.collection("teams").updateOne(
 { _id: team._id },
 { $pull: { memberIds: memberId } as never }
 );
 await db.collection("users").updateOne(
 { _id: new ObjectId(memberId) },
 { $unset: { teamId: "", teamRole: "" } }
 );

 // If removing this member brought the team back within the owner's plan
 // seat count, clear the over_limit flag/deadline instead of leaving it
 // stuck until the next cron sweep.
 if (team.status === "over_limit") {
 const owner = await db.collection("users").findOne({ _id: new ObjectId(auth.payload.userId) });
 const config = getPlanConfig(owner?.plan);
 const remainingMembers = (team.memberIds ?? []).filter((id: string) => id !== memberId).length;
 if (1 + remainingMembers <= config.limits.teamSeats) {
 await db.collection("teams").updateOne(
 { _id: team._id },
 { $set: { status: "active" }, $unset: { seatDeadline: "" } }
 );
 }
 }

 return NextResponse.json({ ok: true, message: "Member removed" });
 }

 return NextResponse.json({ error: "Invalid action" }, { status: 400 });
 } catch (err) {
 console.error("[Teams PATCH Error]", err);
 return NextResponse.json({ error: "Failed to update team" }, { status: 500 });
 }
}
