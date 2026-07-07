// One-shot, idempotent index creation for the Phase 4 billing collections
// (subscriptions, webhook_events, quota_audit_log) and the Phase 4.5
// distributed rate limiter (rate_limits). Safe to re-run — createIndex is a
// no-op if an identical index already exists.
//
// Usage: node scripts/create-phase4-indexes.mjs
// Reads MONGODB_URI from web/.env.local. Makes schema-level changes only —
// no document data is modified.

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
    // subscriptions — userId index is intentionally NON-unique (blueprint §6.2):
    // a user can have multiple subscription docs over time (cancel + resubscribe),
    // each preserved for audit history.
    await db.collection("subscriptions").createIndex({ userId: 1 });
    await db.collection("subscriptions").createIndex(
      { razorpaySubscriptionId: 1 },
      { unique: true }
    );
    await db.collection("subscriptions").createIndex({ status: 1, gracePeriodEndsAt: 1 });
    console.log("subscriptions indexes created");

    // webhook_events — idempotency store
    await db.collection("webhook_events").createIndex({ eventId: 1 }, { unique: true });
    await db.collection("webhook_events").createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 90 * 24 * 3600 }
    );
    await db.collection("webhook_events").createIndex({ status: 1 });
    console.log("webhook_events indexes created");

    // quota_audit_log — consumption tracking (Phase 5 wires the actual writes;
    // collection + indexes created now per the Phase 4.1 checklist)
    await db.collection("quota_audit_log").createIndex({ userId: 1, createdAt: -1 });
    await db.collection("quota_audit_log").createIndex({ action: 1, blocked: 1, createdAt: -1 });
    await db.collection("quota_audit_log").createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 180 * 24 * 3600 }
    );
    console.log("quota_audit_log indexes created");

    // rate_limits — Phase 4.5 distributed rate limiter (lib/rate-limit.ts).
    // windowStart must be a genuine BSON Date (not the ISO-string convention
    // used elsewhere in this codebase) for the TTL index to work.
    await db.collection("rate_limits").createIndex({ key: 1 }, { unique: true });
    await db.collection("rate_limits").createIndex(
      { windowStart: 1 },
      { expireAfterSeconds: 120 }
    );
    console.log("rate_limits indexes created");

    // oauth_exchange_codes — Google OAuth one-time handoff codes
    // (lib/oauth-state.ts). Moved from an in-memory Map to Mongo because the
    // callback and exchange routes are independent serverless invocations on
    // Vercel; createdAt must be a genuine BSON Date for the TTL index.
    await db.collection("oauth_exchange_codes").createIndex({ code: 1 }, { unique: true });
    await db.collection("oauth_exchange_codes").createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 60 }
    );
    console.log("oauth_exchange_codes indexes created");
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Index creation failed:", err);
  process.exit(1);
});
