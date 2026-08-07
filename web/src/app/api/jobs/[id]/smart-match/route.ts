import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { getPlanConfig } from "@/lib/plans";
import { withPlanHeader } from "@/lib/middleware/plan-header";
import { idFilter, idsOrFilter } from "@/lib/mongo-id";
import {
  rankFreelancersForJob,
  type FreelancerBidRecord,
  type JobRecord,
} from "@/lib/smart-match";

/** Max freelancers scored per run after skill/eligibility filter (plan Part B scale note). */
const SMART_MATCH_CANDIDATE_CAP = 100;

type JobAccessDoc = {
  status?: string;
  clientId?: string;
  type?: string;
  skillsRequired?: string[];
};

async function findJob(db: Awaited<ReturnType<typeof getDb>>, jobId: string) {
  return (await db.collection("jobs").findOne(idFilter(jobId))) as JobAccessDoc | null;
}

function assertJobAccess(
  job: JobAccessDoc | null,
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

    const freelancerFilter: Record<string, unknown> = { role: "freelancer" };
    // Prefer skill-overlap candidates when the job lists skills (avoids full-table score).
    if (jobSkills.length > 0) {
      freelancerFilter.skills = { $in: jobSkills };
    }

    const [freelancerDocs, invites, jobBids, clientUser] = await Promise.all([
      db
        .collection("users")
        .find(freelancerFilter, {
          projection: { fullName: 1, name: 1, geekScore: 1, skills: 1 },
        })
        .sort({ geekScore: -1 })
        // Fetch a small buffer above the score cap so invited/bidders can be filtered out.
        .limit(SMART_MATCH_CANDIDATE_CAP + 50)
        .toArray(),
      db.collection("invites").find({ jobId }, { projection: { freelancerId: 1 } }).toArray(),
      db.collection("bids").find({ jobId }, { projection: { freelancerId: 1 } }).toArray(),
      db.collection("users").findOne(idFilter(clientId), { projection: { plan: 1 } }),
    ]);

    const invitedIds = new Set(invites.map((i) => String(i.freelancerId)));
    const biddingIds = new Set(jobBids.map((b) => String(b.freelancerId)));

    // Drop ineligible early, then cap by GeekScore before loading bid history.
    const candidates = freelancerDocs
      .map((f) => ({
        id: f._id.toString(),
        fullName: (f.fullName ?? f.name ?? "Freelancer") as string,
        geekScore: (f.geekScore ?? 0) as number,
        skills: (f.skills as string[]) ?? [],
      }))
      .filter((f) => !invitedIds.has(f.id) && !biddingIds.has(f.id))
      .sort((a, b) => b.geekScore - a.geekScore || a.fullName.localeCompare(b.fullName))
      .slice(0, SMART_MATCH_CANDIDATE_CAP);

    const freelancerIds = candidates.map((f) => f.id);
    const allBids = freelancerIds.length
      ? await db
          .collection("bids")
          .find(
            { freelancerId: { $in: freelancerIds } },
            { projection: { freelancerId: 1, jobId: 1 } }
          )
          .toArray()
      : [];

    const relatedJobIds = [...new Set(allBids.map((b) => String(b.jobId)))];
    const relatedJobs = relatedJobIds.length
      ? await db
          .collection("jobs")
          .find(idsOrFilter(relatedJobIds), {
            projection: { skillsRequired: 1, acceptedBy: 1, status: 1 },
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
