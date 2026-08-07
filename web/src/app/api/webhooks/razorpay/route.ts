import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { processWebhookEvent } from "@/lib/webhook-processing";

// POST /api/webhooks/razorpay — Razorpay subscription/payment event delivery
export async function POST(req: NextRequest) {
  // Raw body is required BEFORE JSON parsing — HMAC verification is over the
  // exact bytes Razorpay signed, not a re-serialized copy.
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventId = (payload.event_id as string | undefined) ?? (payload.id as string | undefined);
  if (!eventId) {
    return NextResponse.json({ error: "Missing event id" }, { status: 400 });
  }

  const db = await getDb();

  // Ensure the event doc exists (first delivery ever) — a redelivery just
  // matches the existing doc and $setOnInsert is a no-op.
  await db.collection("webhook_events").findOneAndUpdate(
    { eventId },
    {
      $setOnInsert: {
        eventId,
        eventType: payload.event,
        status: "received",
        payload,
        processedAt: null,
        errorMessage: null,
        retryCount: 0,
        createdAt: new Date().toISOString(),
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  // Atomically claim the event before processing it — the previous version
  // only skipped when status was already "processed", so two concurrent
  // deliveries of the same event (Razorpay retries aggressively) could both
  // observe "received" and both run processWebhookEvent (quota resets,
  // downgrades, emails — none of that is safe to double-fire). Claiming by
  // flipping received/failed -> processing means only the request that
  // actually wins this single-document update proceeds; the loser sees a
  // non-match (claimed by the other request, or already processed) and
  // exits without touching side effects.
  const claimed = await db.collection("webhook_events").findOneAndUpdate(
    { eventId, status: { $in: ["received", "failed"] } },
    { $set: { status: "processing" } }
  );
  if (!claimed) {
    return NextResponse.json({ status: "already_processed" });
  }

  try {
    await processWebhookEvent(payload, db);
    await db.collection("webhook_events").updateOne(
      { eventId },
      { $set: { status: "processed", processedAt: new Date().toISOString() } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.collection("webhook_events").updateOne(
      { eventId },
      { $set: { status: "failed", errorMessage: message }, $inc: { retryCount: 1 } }
    );
    console.error("[Razorpay Webhook Processing Error]", err);
    // Non-2xx so Razorpay retries; the retry-webhooks cron also sweeps
    // failed events independently in case Razorpay itself stops retrying.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" });
}
