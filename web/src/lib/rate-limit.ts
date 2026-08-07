import { getDb } from "@/lib/mongodb";

// Distributed replacement for the old in-memory Map limiter in sanitize.ts —
// that approach gave every server instance its own counter, so a user could
// hit `maxRequests` per instance instead of globally. This stores counters in
// Mongo so the limit is shared across however many instances are running.
//
// windowStart is stored as a native Date (not the ISO-string convention used
// everywhere else in this codebase) because a TTL index can only expire
// documents on a genuine BSON Date field — see create-phase4-indexes.mjs.
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<boolean> {
  const db = await getDb();
  const now = Date.now();
  const windowStartCutoff = new Date(now - windowMs);

  // Single atomic aggregation-pipeline update: if the existing window has
  // expired (or no document exists yet), reset to count=1 with a fresh
  // window; otherwise increment in place. Filtering + upserting on `{ key }`
  // alone (not `{ key, windowStart }`) keeps exactly one document per key,
  // so this can't race into duplicate rows the way a filter-then-insert
  // pattern would.
  const result = await db.collection("rate_limits").findOneAndUpdate(
    { key },
    [
      {
        $set: {
          count: {
            $cond: {
              if: {
                $or: [
                  { $eq: [{ $type: "$windowStart" }, "missing"] },
                  { $lt: ["$windowStart", windowStartCutoff] },
                ],
              },
              then: 1,
              else: { $add: ["$count", 1] },
            },
          },
          windowStart: {
            $cond: {
              if: {
                $or: [
                  { $eq: [{ $type: "$windowStart" }, "missing"] },
                  { $lt: ["$windowStart", windowStartCutoff] },
                ],
              },
              then: new Date(now),
              else: "$windowStart",
            },
          },
        },
      },
    ],
    { upsert: true, returnDocument: "after" }
  );

  const count = (result as unknown as { count?: number } | null)?.count ?? 1;
  return count <= maxRequests;
}
