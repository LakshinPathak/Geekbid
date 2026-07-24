// One-shot, idempotent migration: backfill the new planLimits/quota fields
// introduced in Phase 1 so every user document has a consistent shape before
// Phase 2 enforcement starts reading them. Only sets fields that are missing —
// never overwrites an existing count. Safe to re-run.
//
// Usage: node scripts/migrate-plan-limits.mjs
// Reads MONGODB_URI from web/.env.local.

import { MongoClient } from "mongodb";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnvLocal();
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not found in web/.env.local");

  const client = new MongoClient(uri);
  await client.connect();
  // Must match lib/mongodb.ts's explicit db("geekbid") — MONGODB_URI has no
  // path segment, so a bare client.db() silently resolves to whatever the
  // driver/URI defaults to (observed: the unrelated "test" database), not
  // the app's real database.
  const db = client.db("geekbid");

  try {
    const now = new Date().toISOString();

    // Ensure every user has a planLimits object at all (some very old seed
    // users may predate the field entirely).
    const noLimitsResult = await db.collection("users").updateMany(
      { planLimits: { $exists: false } },
      {
        $set: {
          planLimits: {
            jobsPostedThisMonth: 0,
            bidsPlacedThisMonth: 0,
            aiUsesThisMonth: 0,
            aiBidUsesThisMonth: 0,
            featuredBoostsUsedThisMonth: 0,
            invitesSentThisMonth: 0,
            monthResetAt: now,
          },
        },
      }
    );
    console.log(`users missing planLimits entirely: matched ${noLimitsResult.matchedCount}, modified ${noLimitsResult.modifiedCount}`);

    // Backfill only the new Phase 1 sub-fields for users who already have a
    // planLimits object but predate these two counters.
    const noBoostsResult = await db.collection("users").updateMany(
      { planLimits: { $exists: true }, "planLimits.featuredBoostsUsedThisMonth": { $exists: false } },
      { $set: { "planLimits.featuredBoostsUsedThisMonth": 0 } }
    );
    console.log(`users backfilled featuredBoostsUsedThisMonth: matched ${noBoostsResult.matchedCount}, modified ${noBoostsResult.modifiedCount}`);

    const noInvitesResult = await db.collection("users").updateMany(
      { planLimits: { $exists: true }, "planLimits.invitesSentThisMonth": { $exists: false } },
      { $set: { "planLimits.invitesSentThisMonth": 0 } }
    );
    console.log(`users backfilled invitesSentThisMonth: matched ${noInvitesResult.matchedCount}, modified ${noInvitesResult.modifiedCount}`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
