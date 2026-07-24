// Read-only verification for the Phase 1 plan-rename + plan-limits migrations.
// Run after migrate-plan-names.mjs and migrate-plan-limits.mjs to confirm the
// DB is in the expected post-migration state before removing the compat
// mapping in getPlanConfig() (blueprint §25, Phase C).
//
// Usage: node scripts/verify-migration.mjs
// Reads MONGODB_URI from web/.env.local. Makes no writes.

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
    let ok = true;

    const legacyCount = await db.collection("users").countDocuments({ plan: { $in: ["pro", "enterprise"] } });
    console.log(`[${legacyCount === 0 ? "PASS" : "FAIL"}] users with legacy plan value ('pro'/'enterprise'): ${legacyCount}`);
    if (legacyCount !== 0) ok = false;

    const validPlans = ["free", "plus", "premium", null, undefined];
    const invalidPlanCount = await db.collection("users").countDocuments({
      plan: { $exists: true, $nin: ["free", "plus", "premium"] },
    });
    console.log(`[${invalidPlanCount === 0 ? "PASS" : "FAIL"}] users with an unrecognized plan value: ${invalidPlanCount}`);
    if (invalidPlanCount !== 0) ok = false;

    const missingLimits = await db.collection("users").countDocuments({ planLimits: { $exists: false } });
    console.log(`[${missingLimits === 0 ? "PASS" : "FAIL"}] users missing planLimits entirely: ${missingLimits}`);
    if (missingLimits !== 0) ok = false;

    const missingBoosts = await db.collection("users").countDocuments({
      planLimits: { $exists: true },
      "planLimits.featuredBoostsUsedThisMonth": { $exists: false },
    });
    console.log(`[${missingBoosts === 0 ? "PASS" : "FAIL"}] users missing planLimits.featuredBoostsUsedThisMonth: ${missingBoosts}`);
    if (missingBoosts !== 0) ok = false;

    const missingInvites = await db.collection("users").countDocuments({
      planLimits: { $exists: true },
      "planLimits.invitesSentThisMonth": { $exists: false },
    });
    console.log(`[${missingInvites === 0 ? "PASS" : "FAIL"}] users missing planLimits.invitesSentThisMonth: ${missingInvites}`);
    if (missingInvites !== 0) ok = false;

    const totalUsers = await db.collection("users").countDocuments({});
    console.log(`Total users checked: ${totalUsers}`);

    console.log(ok ? "\n✅ Verification PASSED" : "\n❌ Verification FAILED — see FAIL lines above");
    if (!ok) process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
