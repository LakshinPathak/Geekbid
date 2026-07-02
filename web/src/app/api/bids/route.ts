import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { sendNewBidEmail, sendPriceTargetAlertEmail } from "@/lib/email";
import { backendFetch, proxyToBackend, tokenFromRequest } from "@/lib/backend";

// GET /api/bids?jobId=xxx — BFF proxy → gateway → bidding-service (protected).
export async function GET(req: NextRequest) {
  return proxyToBackend(req, `/v1/bids${req.nextUrl.search}`, { unwrapKey: "bids" });
}

// POST /api/bids — counter-bid. The full pipeline (freelancer-only, job-open,
// atomic plan-limit, 30-min cooldown, demand signals) runs in bidding-service;
// the BFF fires the new-bid + price-target Resend emails from the result.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { jobId, bidPrice, message } = body;
    if (!jobId || bidPrice == null) {
      return NextResponse.json({ error: "jobId and bidPrice are required" }, { status: 400 });
    }

    const result = await backendFetch<{
      bid: Record<string, unknown>;
      job: { clientId?: string; title?: string; minimumPrice?: number };
    }>("/v1/bids/counter", {
      method: "POST",
      token: tokenFromRequest(req),
      body: { jobId, bidPrice, message },
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const { bid, job } = result.data;

    // ── Emails (best-effort, from the web runtime) ──
    try {
      if (job?.clientId) {
        const db = await getDb();
        const client = await db.collection("users").findOne(
          { _id: new ObjectId(job.clientId) },
          { projection: { email: 1, name: 1 } }
        );
        if (client?.email) {
          const freelancer = await db.collection("users").findOne(
            { _id: new ObjectId(bid.freelancerId as string) },
            { projection: { name: 1 } }
          );
          sendNewBidEmail(
            client.email, client.name ?? "Client",
            freelancer?.name ?? "A freelancer",
            job.title ?? "Untitled Job", Number(bidPrice), jobId
          ).catch(() => {});
          if (job.minimumPrice && Number(bidPrice) <= job.minimumPrice * 1.1) {
            sendPriceTargetAlertEmail(
              client.email, client.name ?? "Client",
              freelancer?.name ?? "A freelancer",
              job.title ?? "Untitled Job",
              Number(bidPrice), job.minimumPrice, jobId, bid._id as string
            ).catch(() => {});
          }
        }
      }
    } catch (emailErr) {
      console.error("[Bids POST email lookup failed]", emailErr);
    }

    return NextResponse.json(bid, { status: 201 });
  } catch (err) {
    console.error("[Bids POST Error]", err);
    return NextResponse.json({ error: "Failed to place bid" }, { status: 500 });
  }
}
