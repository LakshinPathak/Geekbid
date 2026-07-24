// Rollback counterpart to migrate-plan-names.mjs — reverses the rename in case
// a Phase 1 deploy needs to be backed out before the compat mapping is removed.
// 'plus' -> 'pro', 'premium' -> 'enterprise'.
//
// SAFE TO RUN ONLY within the same deploy window as the forward migration —
// running this later will incorrectly revert users who signed up natively
// under the new plan names ('plus'/'premium') after the migration ran, since
// they were never on the legacy plan. To guard against this, this script only
// touches documents carrying the migratedFromLegacyPlan: true marker that
// migrate-plan-names.mjs writes at migration time, and clears the marker once
// reverted. If you're rolling back long after the forward migration, prefer a
// manual, audited fix over running this script blindly.
//
// Usage: node scripts/rollback-plan-names.mjs
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
    // Only revert documents the forward migration actually touched (marked
    // migratedFromLegacyPlan: true) — never every current 'plus'/'premium'
    // user, since that would also catch users who signed up natively under
    // the new names.
    const plusResult = await db
      .collection("users")
      .updateMany(
        { plan: "plus", migratedFromLegacyPlan: true },
        { $set: { plan: "pro" }, $unset: { migratedFromLegacyPlan: "" } }
      );
    console.log(`plan 'plus' -> 'pro': matched ${plusResult.matchedCount}, modified ${plusResult.modifiedCount}`);

    const premiumResult = await db
      .collection("users")
      .updateMany(
        { plan: "premium", migratedFromLegacyPlan: true },
        { $set: { plan: "enterprise" }, $unset: { migratedFromLegacyPlan: "" } }
      );
    console.log(`plan 'premium' -> 'enterprise': matched ${premiumResult.matchedCount}, modified ${premiumResult.modifiedCount}`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Rollback failed:", err);
  process.exit(1);
});
