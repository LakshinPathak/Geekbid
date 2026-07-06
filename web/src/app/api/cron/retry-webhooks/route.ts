import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { processWebhookEvent } from "@/lib/webhook-processing";

// GET /api/cron/retry-webhooks — runs every 15 minutes (see vercel.json).
// Sweeps webhook_events left in 'failed' status (the POST handler already
// retries via Razorpay's own redelivery, but this catches events Razorpay
// gave up on, or failures during a deploy window) and re-runs processing.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const oneDayAgo = new Date(Date.now() - 24 * 3600000).toISOString();

  const failedEvents = await db.collection("webhook_events").find({
    status: "failed",
    retryCount: { $lt: 5 },
    createdAt: { $gte: oneDayAgo },
  }).toArray();

  let succeeded = 0;
  let stillFailing = 0;

  for (const event of failedEvents) {
    try {
      await processWebhookEvent(event.payload, db);
      await db.collection("webhook_events").updateOne(
        { _id: event._id },
        { $set: { status: "processed", processedAt: new Date().toISOString() } }
      );
      succeeded++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db.collection("webhook_events").updateOne(
        { _id: event._id },
        { $set: { errorMessage: message }, $inc: { retryCount: 1 } }
      );
      stillFailing++;
    }
  }

  return NextResponse.json({ retried: failedEvents.length, succeeded, stillFailing });
}
