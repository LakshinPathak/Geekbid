// One-shot, idempotent index creation for the issues.md fix pass (see
// ../../progress.md for what's been applied). Safe to re-run — createIndex is
// a no-op if an identical index already exists.
//
// Usage: node scripts/create-fix-indexes.mjs
// Reads MONGODB_URI from web/.env.local. Makes schema-level changes only —
// no document data is modified. Clean up any duplicate rows that would
// violate a new unique index BEFORE running this (see the comment above
// each block for what to check).

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
    // ISSUE-37 — assessment_cooldowns: atomic 30-day-retake claim so two
    // concurrent submits can't both pass the cooldown check and double-credit
    // geekScore. One row per (userId, assessmentId); the row's cooldownUntil
    // is extended on every successful attempt (see api/assessments/route.ts).
    await db.collection("assessment_cooldowns").createIndex(
      { userId: 1, assessmentId: 1 },
      { unique: true }
    );
    console.log("assessment_cooldowns indexes created");

    // ISSUE-16 — transactions: a given Razorpay payment can only ever fund
    // one transaction row. Without this, a race between two concurrent
    // PATCH /api/payments verify calls for the same payment could both pass
    // the findOne-based idempotency check and both insert. Partial (only
    // applies where the field is a non-empty string) so mock/legacy rows
    // without a razorpayPaymentId aren't affected.
    // Clean up any existing duplicate razorpayPaymentId rows before running
    // this, or index creation will fail.
    await db.collection("transactions").createIndex(
      { razorpayPaymentId: 1 },
      { unique: true, partialFilterExpression: { razorpayPaymentId: { $type: "string", $gt: "" } } }
    );
    console.log("transactions indexes created");
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Index creation failed:", err);
  process.exit(1);
});
