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
  // Must match lib/mongodb.ts's explicit db("geekbid") — MONGODB_URI has no
  // path segment, so a bare client.db() silently resolves to whatever the
  // driver/URI defaults to (observed: the unrelated "test" database), not
  // the app's real database. Every index block below was previously landing
  // in the wrong database as a result.
  const db = client.db("geekbid");

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

    // ISSUE-19 — subscriptions: at most one "live" subscription per user.
    // The POST handler's findOne pre-check is a fast path, not atomic — two
    // concurrent creates can both pass it before either insert lands. Scoped
    // to active-ish statuses (not a plain unique on userId) so cancelled/
    // completed history rows for the same user can still coexist.
    // Clean up any existing duplicate active/live rows per user before
    // running this, or index creation will fail.
    // A plain non-unique userId_1 index (the default auto-generated name for
    // an unnamed {userId:1} index) pre-dates this fix and collides on that
    // same name with the partial-unique index below — drop it first. This
    // covers deployments from before create-phase4-indexes.mjs's own
    // {userId:1} index was given its own explicit "userId_1_lookup" name;
    // this index is explicitly named too, so re-running either script in
    // either order afterward is genuinely idempotent instead of racing on
    // an implicit default name.
    try {
      await db.collection("subscriptions").dropIndex("userId_1");
      console.log("subscriptions old plain userId_1 index dropped");
    } catch (err) {
      if (err?.codeName !== "IndexNotFound") throw err;
    }
    await db.collection("subscriptions").createIndex(
      { userId: 1 },
      {
        name: "userId_1_live_unique",
        unique: true,
        partialFilterExpression: { status: { $in: ["created", "active", "past_due"] } },
      }
    );
    console.log("subscriptions live-status index created");

    // ISSUE-58 — password_reset_tokens: one-time forgot-password tokens.
    // Unique on tokenHash (each generated token must be distinct — a
    // collision would let one user's reset link work for another's
    // account), TTL on expiresAt so stale/used tokens are swept
    // automatically instead of accumulating forever.
    await db.collection("password_reset_tokens").createIndex(
      { tokenHash: 1 },
      { unique: true }
    );
    await db.collection("password_reset_tokens").createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 }
    );
    console.log("password_reset_tokens indexes created");

    // invites: a client can only ever have one invite per (freelancer, job).
    // lib/create-job-invite.ts already catches an E11000 here and returns the
    // "duplicate" error, but without this index there was nothing to throw —
    // the only guard was a non-atomic findOne pre-check, so two concurrent
    // identical invite requests (double-click, retried POST, or the
    // smart-match batch racing a manual invite) could both pass it, both
    // consume a quota slot, and both insert, leaving the freelancer with a
    // duplicate pending invite and duplicate notification.
    // Clean up any existing duplicate (clientId, freelancerId, jobId) rows
    // before running this, or index creation will fail.
    await db.collection("invites").createIndex(
      { clientId: 1, freelancerId: 1, jobId: 1 },
      { unique: true }
    );
    console.log("invites index created");

    // ISSUE-83 — refresh_tokens: moved from one token slot per user to one
    // per (userId, sessionId) so concurrent legitimate sessions (multiple
    // devices/tabs) don't collide and get each other silently logged out as
    // "theft". The old deploy left a unique index on userId alone, which
    // throws E11000 the moment a second device tries to store its own
    // session row — drop it and replace with the compound unique index the
    // new storeRefreshToken()/validateStoredRefreshToken() code actually
    // queries on.
    try {
      await db.collection("refresh_tokens").dropIndex("userId_1");
      console.log("refresh_tokens old userId_1 unique index dropped");
    } catch (err) {
      if (err?.codeName !== "IndexNotFound") throw err;
      console.log("refresh_tokens old userId_1 index already absent, skipping drop");
    }
    await db.collection("refresh_tokens").createIndex(
      { userId: 1, sessionId: 1 },
      { unique: true }
    );
    console.log("refresh_tokens {userId,sessionId} index created");
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Index creation failed:", err);
  process.exit(1);
});
