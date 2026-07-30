import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { getPlanConfig } from "@/lib/plans";
import { withPlanHeader } from "@/lib/middleware/plan-header";
import { createJobInvite } from "@/lib/create-job-invite";
import { idFilter } from "@/lib/mongo-id";

type JobAccessDoc = {
  status?: string;
  clientId?: string;
  type?: string;
};

async function findJob(db: Awaited<ReturnType<typeof getDb>>, jobId: string) {
  return (await db.collection("jobs").findOne(idFilter(jobId))) as JobAccessDoc | null;
}

/**
 * POST /api/jobs/[id]/smart-match/invite — confirm-then-send batch invites
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if (auth.payload.role !== "client") {
      return NextResponse.json({ error: "Clients only" }, { status: 403 });
    }

    const { id: jobId } = await params;
    const clientId = auth.payload.userId;
    const body = await req.json();
    const freelancerIds: string[] = Array.isArray(body.freelancerIds)
      ? body.freelancerIds.map(String)
      : [];

    if (freelancerIds.length === 0) {
      return NextResponse.json({ error: "freelancerIds required" }, { status: 400 });
    }

    const db = await getDb();
    const job = await findJob(db, jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (job.clientId !== clientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (job.status !== "open") {
      return NextResponse.json({ error: "This job is no longer open for invites" }, { status: 400 });
    }
    if (job.type === "direct_offer") {
      return NextResponse.json({ error: "Smart Match is not available for direct offers" }, { status: 400 });
    }

    const clientUser = await db.collection("users").findOne(idFilter(clientId));

    const planConfig = getPlanConfig(clientUser?.plan);
    if (planConfig.smartMatchTopN === 0) {
      return NextResponse.json(
        {
          error: "Smart Match auto-invite requires Plus or Premium. Upgrade to invite top matches in one click.",
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }

    const uniqueIds = [...new Set(freelancerIds)];
    if (uniqueIds.length > planConfig.smartMatchTopN) {
      return NextResponse.json(
        {
          error: `Your ${planConfig.name} plan allows up to ${planConfig.smartMatchTopN} invites per Smart Match run.`,
        },
        { status: 400 }
      );
    }

    let sent = 0;
    let skippedQuota = 0;
    const errors: { freelancerId: string; error: string }[] = [];
    const sentIds: string[] = [];

    for (const freelancerId of uniqueIds) {
      const result = await createJobInvite(db, clientId, freelancerId, jobId);
      if (result.ok) {
        sent += 1;
        sentIds.push(freelancerId);
        continue;
      }
      if (result.code === "quota_exceeded") {
        skippedQuota = uniqueIds.length - sent - errors.length;
        break;
      }
      errors.push({ freelancerId, error: result.error });
    }

    return withPlanHeader(
      NextResponse.json({
        sent,
        skippedQuota,
        sentIds,
        errors,
        message:
          skippedQuota > 0
            ? `Sent ${sent} invite${sent === 1 ? "" : "s"}; ${skippedQuota} skipped due to monthly invite quota.`
            : `Sent ${sent} invite${sent === 1 ? "" : "s"}.`,
      }),
      clientUser?.plan ?? "free"
    );
  } catch (err) {
    console.error("[Smart Match Invite POST Error]", err);
    return NextResponse.json({ error: "Failed to send smart match invites" }, { status: 500 });
  }
}
