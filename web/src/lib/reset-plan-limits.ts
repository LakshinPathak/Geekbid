import { ObjectId, type Db } from "mongodb";

// Shared conditional month-reset for the jobs/bids/featured-boost counters
// (planLimits.monthResetAt) — same CAS pattern as lib/ai-plan-limit.ts's
// dedicated aiMonthResetAt reset. The previous per-route version of this
// (duplicated across bids, jobs, jobs/direct-offer, jobs/feature) did an
// unconditional `$set` once `monthResetAt` looked stale: two concurrent
// requests could both observe the stale value and both issue the reset,
// so whichever write landed second wiped out a count the first request
// had just incremented moments earlier — a real quota bypass, not just a
// rare double-write. The `$or` filter here means the reset only applies
// if `monthResetAt` still equals the value the caller observed; a second,
// now-stale writer's reset simply won't match once the first has landed.
//
// Resets all four counters together (not just the one the calling route
// cares about) since they share one `monthResetAt` clock — the old
// per-route versions only zeroed the counters that specific route used,
// so e.g. posting a job could roll `monthResetAt` into the future while
// leaving a stale `featuredBoostsUsedThisMonth`/`invitesSentThisMonth`
// from the prior period never cleared (that route's own staleness check
// would then see a future date and skip resetting it).
export async function resetPlanLimitsIfStale(
  db: Db,
  _id: ObjectId,
  observedResetAt: string
): Promise<void> {
  if (new Date(observedResetAt) >= new Date()) return;
  await db.collection("users").updateOne(
    {
      _id,
      $or: [
        { "planLimits.monthResetAt": { $exists: false } },
        { "planLimits.monthResetAt": observedResetAt },
      ],
    },
    {
      $set: {
        "planLimits.jobsPostedThisMonth": 0,
        "planLimits.bidsPlacedThisMonth": 0,
        "planLimits.featuredBoostsUsedThisMonth": 0,
        "planLimits.invitesSentThisMonth": 0,
        "planLimits.monthResetAt": new Date(Date.now() + 30 * 24 * 3600000).toISOString(),
      },
    }
  );
}
