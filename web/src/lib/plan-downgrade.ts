import { ObjectId, type Db } from "mongodb";
import { getPlanConfig, type PlanTier } from "@/lib/plans";
import { sendPlanChangeEmail } from "@/lib/billing-emails";

// Cleanly moves a user to a lower (or free) tier — called from webhook
// handlers (grace period expired, subscription halted/cancelled) and the
// reconciliation cron. Never deletes user data; only revokes/freezes
// resources that exceed the new tier's limits (blueprint §16.2).
export async function handleDowngrade(
  userId: string,
  fromPlan: PlanTier | string,
  toPlan: PlanTier,
  reason: string,
  triggeredBy: 'user' | 'webhook' | 'cron' | 'admin',
  db: Db
) {
  const toPlanConfig = getPlanConfig(toPlan);
  const now = new Date().toISOString();

  // 1. Update user plan
  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    { $set: { plan: toPlan, planDowngradedAt: now } }
  );

  // 2. Revoke excess API keys, oldest-kept / newest-revoked-first is wrong —
  // LIFO per blueprint §16.1 means the MOST RECENTLY created keys are
  // revoked first, so long-lived integrations set up early survive a
  // downgrade over a key someone generated last week.
  const activeKeys = await db.collection("api_keys")
    .find({ userId, revokedAt: { $exists: false } })
    .sort({ createdAt: -1 })
    .toArray();

  if (activeKeys.length > toPlanConfig.limits.maxApiKeys) {
    const keysToRevoke = activeKeys.slice(0, activeKeys.length - toPlanConfig.limits.maxApiKeys);
    await db.collection("api_keys").updateMany(
      { _id: { $in: keysToRevoke.map((k) => k._id) } },
      { $set: { revokedAt: now, revokedReason: "plan_downgrade" } }
    );
  }

  // 3. Handle team seat excess
  if (toPlanConfig.limits.teamSeats === 0) {
    // Free tier: dissolve/freeze all teams owned by this user
    await db.collection("teams").updateMany(
      { ownerId: userId },
      { $set: { status: "frozen", frozenReason: "plan_downgrade" } }
    );
  } else {
    // Reduced (not zero) seats: flag over-limit teams with a 7-day deadline
    // rather than freezing immediately — the owner picks who to remove (§23).
    const ownedTeams = await db.collection("teams").find({ ownerId: userId }).toArray();
    for (const team of ownedTeams) {
      const seatCount = 1 + (team.memberIds?.length ?? 0);
      if (seatCount > toPlanConfig.limits.teamSeats) {
        await db.collection("teams").updateOne(
          { _id: team._id },
          {
            $set: {
              status: "over_limit",
              seatDeadline: new Date(Date.now() + 7 * 24 * 3600000).toISOString(),
            },
          }
        );
      }
    }
  }

  // 4. Log the change
  await db.collection("plan_change_log").insertOne({
    userId, fromPlan, toPlan, reason, triggeredBy,
    createdAt: now,
  });

  // 5. Send notification email
  // `now` (this invocation's timestamp) doubles as the contextId so repeat
  // downgrades with an identical (userId, fromPlan, toPlan, reason) tuple —
  // e.g. the same user hits "grace_period_expired" again on a later
  // subscription — get their own idempotency key instead of being deduped
  // against a same-shaped downgrade from months earlier.
  await sendPlanChangeEmail(userId, String(fromPlan), toPlan, reason, now).catch((err) =>
    console.error("[Plan Downgrade] Notification email failed:", err)
  );
}

// Auto-removes the newest team members (LIFO) once a team's seatDeadline has
// passed without the owner resolving the over-limit state themselves.
// Called by the reconciliation cron (blueprint §23).
export async function enforceExpiredTeamSeatDeadlines(db: Db) {
  const now = new Date().toISOString();
  const overLimitTeams = await db.collection("teams").find({
    status: "over_limit",
    seatDeadline: { $lte: now },
  }).toArray();

  for (const team of overLimitTeams) {
    // team.ownerId is stored as a string, not an ObjectId — querying _id
    // directly against that string never matches, so `owner` was always
    // null here, `getPlanConfig(undefined)` fell back to Free (teamSeats: 0),
    // and every member got removed regardless of the owner's real plan.
    let owner = null;
    try {
      owner = await db.collection("users").findOne({ _id: new ObjectId(team.ownerId) });
    } catch {
      owner = null;
    }
    const config = getPlanConfig(owner?.plan);
    const allowedMembers = Math.max(0, config.limits.teamSeats - 1);
    const memberIds: string[] = team.memberIds ?? [];

    if (memberIds.length <= allowedMembers) {
      await db.collection("teams").updateOne(
        { _id: team._id },
        { $set: { status: "active" }, $unset: { seatDeadline: "" } }
      );
      continue;
    }

    // LIFO: members are appended on join, so the tail of the array is the
    // most-recently-invited — remove from the end first.
    const keptMembers = memberIds.slice(0, allowedMembers);
    const removedMembers = memberIds.slice(allowedMembers);

    await db.collection("teams").updateOne(
      { _id: team._id },
      { $set: { memberIds: keptMembers, status: "active" }, $unset: { seatDeadline: "" } }
    );

    await db.collection("users").updateMany(
      { _id: { $in: removedMembers.map((id) => new ObjectId(id)) } },
      { $unset: { teamId: "", teamRole: "" } }
    );

    if (removedMembers.length > 0) {
      await db.collection("notifications").insertMany(
        removedMembers.map((memberId) => ({
          userId: memberId,
          type: "team_seat_removed",
          isRead: false,
          title: `You were removed from "${team.name ?? "your team"}"`,
          body: "The team owner's plan no longer covers enough seats. Your individual account and work are unaffected.",
          createdAt: now,
        }))
      );
    }
  }
}
