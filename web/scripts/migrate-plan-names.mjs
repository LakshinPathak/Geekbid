// One-shot, idempotent migration: rename legacy plan values to the new tier names.
// 'pro' -> 'plus', 'enterprise' -> 'premium'. Safe to re-run — matches only
// documents still holding a legacy value, so a second run is a no-op.
//
// Usage: node scripts/migrate-plan-names.mjs
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
    // Mark every doc this migration touches with migratedFromLegacyPlan so
    // rollback-plan-names.mjs can revert only these documents, not users who
    // sign up natively under the new plan names after this runs.
    const proResult = await db
      .collection("users")
      .updateMany({ plan: "pro" }, { $set: { plan: "plus", migratedFromLegacyPlan: true } });
    console.log(`plan 'pro' -> 'plus': matched ${proResult.matchedCount}, modified ${proResult.modifiedCount}`);

    const enterpriseResult = await db
      .collection("users")
      .updateMany({ plan: "enterprise" }, { $set: { plan: "premium", migratedFromLegacyPlan: true } });
    console.log(`plan 'enterprise' -> 'premium': matched ${enterpriseResult.matchedCount}, modified ${enterpriseResult.modifiedCount}`);

    const remainingLegacy = await db
      .collection("users")
      .countDocuments({ plan: { $in: ["pro", "enterprise"] } });
    console.log(`remaining legacy plan values: ${remainingLegacy}`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
