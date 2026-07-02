import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { sendJobPostedEmail } from "@/lib/email";
import { backendFetch, proxyToBackend, tokenFromRequest } from "@/lib/backend";

// GET /api/jobs — public feed (invite-only visibility enforced in job-service).
export async function GET(req: NextRequest) {
  return proxyToBackend(req, `/v1/jobs${req.nextUrl.search}`, { unwrapKey: "jobs" });
}

// POST /api/jobs — the transactional create (role + plan-limit) runs in
// job-service; the BFF fires the "job posted" email from the result (Resend
// lives in the web runtime, so email stays here).
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => ({}));
  const result = await backendFetch<Record<string, unknown>>("/v1/jobs", {
    method: "POST",
    token: tokenFromRequest(req),
    body,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const job = (result.data as { job?: Record<string, unknown> }).job ?? result.data;

  // Fire-and-forget: job-posted confirmation to the poster.
  try {
    const db = await getDb();
    const poster = await db.collection("users").findOne(
      { _id: new ObjectId(auth.payload.userId) },
      { projection: { email: 1, name: 1 } }
    );
    if (poster?.email) {
      const j = job as Record<string, unknown>;
      sendJobPostedEmail(
        poster.email,
        (poster.name as string) ?? "Client",
        j.title as string,
        Number(j.startingPrice),
        Number(j.minimumPrice),
        j.pricingMode as string,
        j.deadlineAt as string,
        j.category as string,
        (j.id ?? j._id) as string
      ).catch(() => {});
    }
  } catch (err) {
    console.error("[Jobs POST email lookup failed]", err);
  }

  return NextResponse.json(job, { status: 201 });
}
