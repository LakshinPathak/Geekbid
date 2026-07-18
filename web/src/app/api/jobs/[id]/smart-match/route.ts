import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { getPlanConfig } from "@/lib/plans";
import { withPlanHeader } from "@/lib/middleware/plan-header";
import { createJobInvite } from "@/lib/create-job-invite";
import {
  rankFreelancersForJob,
  type FreelancerBidRecord,
  type JobRecord,
} from "@/lib/smart-match";

async function findJob(db: Awaited<ReturnType<typeof getDb>>, jobId: string) {
  try {
    return await db.collection("jobs").findOne({ _id: new ObjectId(jobId) });
  } catch {
    return await db.collection("jobs").findOne({ _id: jobId });
  }
}

function assertJobAccess(
  job: { status?: string; clientId?: string; type?: string } | null,
  clientId: string
): NextResponse | null {
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.clientId !== clientId) {
    return NextResponse.json(
      { error: "Only the job's owner can view smart matches for it" },
      { status: 403 }
    );
  }
  if (job.status !== "open") {
    return NextResponse.json(
      { error: "Smart Match is only available for open jobs" },
      { status: 400 }
    );
  }
  if (job.type === "direct_offer") {
    return NextResponse.json(
      { error: "Smart Match is not available for direct offers" },
      { status: 400 }
    );
  }
  return null;
}

/**
 * GET /api/jobs/[id]/smart-match — ranked freelancer matches (Free preview OK)
 */
export async function GET(
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
    const db = await getDb();

    const job = await findJob(db, jobId);
    const accessError = assertJobAccess(job, clientId);
    if (accessError) return accessError;

    const jobSkills: string[] = job!.skillsRequired ?? [];

    const [freelancers, invites, jobBids, clientUser] = await Promise.all([
      db.collection("users").find({ role: "freelancer" }).toArray(),
      db.collection("invites").find({ jobId }).toArray(),
      db.collection("bids").find({ jobId }).toArray(),
      db.collection("users").findOne({ _id: new ObjectId(clientId) }),
    ]);

    const invitedIds = new Set(invites.map((i) => String(i.freelancerId)));
    const biddingIds = new Set(jobBids.map((b) => String(b.freelancerId)));

    const freelancerIds = freelancers.map((f) => f._id.toString());
    const allBids = freelancerIds.length
      ? await db.collection("bids").find({ freelancerId: { $in: freelancerIds } }).toArray()
      : [];

    const relatedJobIds = [...new Set(allBids.map((b) => String(b.jobId)))];
    const relatedJobs = relatedJobIds.length
      ? await db
          .collection("jobs")
          .find({
            $or: relatedJobIds.flatMap((jid) => {
              try {
                return [{ _id: new ObjectId(jid) }];
              } catch {
                return [{ _id: jid }];
              }
            }),
          })
          .toArray()
      : [];

    const jobsById = new Map<string, JobRecord>();
    for (const j of relatedJobs) {
      jobsById.set(j._id.toString(), {
        id: j._id.toString(),
        skillsRequired: j.skillsRequired ?? [],
        acceptedBy: j.acceptedBy,
        status: j.status,
      });
    }

    const bidsByFreelancer = new Map<string, FreelancerBidRecord[]>();
    for (const b of allBids) {
      const fid = String(b.freelancerId);
      const list = bidsByFreelancer.get(fid) ?? [];
      list.push({ jobId: String(b.jobId) });
      bidsByFreelancer.set(fid, list);
    }

    const candidates = freelancers.map((f) => ({
      id: f._id.toString(),
      fullName: f.fullName ?? f.name ?? "Freelancer",
      geekScore: f.geekScore ?? 0,
      skills: (f.skills as string[]) ?? [],
    }));

    const matches = rankFreelancersForJob(
      jobSkills,
      candidates,
      bidsByFreelancer,
      jobsById,
      invitedIds,
      biddingIds
    );

    const planConfig = getPlanConfig(clientUser?.plan);
    const canAutoInvite = planConfig.smartMatchTopN > 0;

    return withPlanHeader(
      NextResponse.json({
        jobId,
        topN: planConfig.smartMatchTopN,
        canAutoInvite,
        plan: clientUser?.plan ?? "free",
        matches,
      }),
      clientUser?.plan ?? "free"
    );
  } catch (err) {
    console.error("[Smart Match GET Error]", err);
    return NextResponse.json({ error: "Failed to compute smart matches" }, { status: 500 });
  }
}
