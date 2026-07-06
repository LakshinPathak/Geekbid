// Rollback counterpart to migrate-plan-names.mjs — reverses the rename in case
// a Phase 1 deploy needs to be backed out before the compat mapping is removed.
// 'plus' -> 'pro', 'premium' -> 'enterprise'.
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
  const db = client.db();

  try {
    const plusResult = await db
      .collection("users")
      .updateMany({ plan: "plus" }, { $set: { plan: "pro" } });
    console.log(`plan 'plus' -> 'pro': matched ${plusResult.matchedCount}, modified ${plusResult.modifiedCount}`);

    const premiumResult = await db
      .collection("users")
      .updateMany({ plan: "premium" }, { $set: { plan: "enterprise" } });
    console.log(`plan 'premium' -> 'enterprise': matched ${premiumResult.matchedCount}, modified ${premiumResult.modifiedCount}`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Rollback failed:", err);
  process.exit(1);
});
