import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { generateJSON, isAIAvailable } from "@/lib/ai";
import { checkAndConsumeAiQuota } from "@/lib/ai-plan-limit";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

type FreelancerProjection = {
  _id: ObjectId;
  fullName?: string;
  geekScore?: number;
  averageRating?: number;
  totalReviews?: number;
  skills?: string[];
  plan?: string;
};

export async function POST(req: NextRequest) {
  if (!isAIAvailable()) {
    return NextResponse.json({ error: "AI not available" }, { status: 503 });
  }

  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const quota = await checkAndConsumeAiQuota(auth.payload.userId);
    if (!quota.ok) {
      return NextResponse.json({ error: quota.error }, { status: 429 });
    }

    const body = await req.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    // Re-fetch everything server-side by jobId — never trust client-submitted
    // bid/freelancer data, which could be fabricated to bias the AI's
    // recommendation (inflated GeekScore, ratings, skills, etc).
    const db = await getDb();
    let job: any;
    try { job = await db.collection("jobs").findOne({ _id: new ObjectId(jobId) }); }
    catch { job = await db.collection("jobs").findOne({ id: jobId }); }
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (job.clientId !== auth.payload.userId && auth.payload.role !== "admin") {
      return NextResponse.json({ error: "Only the job's client can evaluate its bids" }, { status: 403 });
    }

    const jobIdStr = job._id.toString();
    const bids = await db.collection("bids").find({ jobId: jobIdStr }).sort({ bidPrice: 1 }).toArray();
    if (bids.length === 0) {
      return NextResponse.json({ error: "No bids to evaluate" }, { status: 400 });
    }

    const freelancerObjectIds = [...new Set(bids.map((b) => b.freelancerId))]
      .map((fid) => { try { return new ObjectId(fid); } catch { return null; } })
      .filter((oid): oid is ObjectId => oid !== null);
    const freelancerDocs = await db.collection("users").find(
      { _id: { $in: freelancerObjectIds } },
      { projection: { fullName: 1, geekScore: 1, averageRating: 1, totalReviews: 1, skills: 1, plan: 1 } }
    ).toArray() as FreelancerProjection[];
    const freelancers = freelancerDocs.map((f) => ({ ...f, id: f._id.toString() }));

    const bidsWithProfiles = bids.map((bid) => {
      const freelancer = freelancers.find((f) => f.id === bid.freelancerId);
      return {
        bidId: bid._id.toString(),
        bidPrice: bid.bidPrice,
        message: bid.message ?? "",
        createdAt: bid.createdAt ?? "",
        freelancer: freelancer
          ? {
              fullName: freelancer.fullName,
              geekScore: freelancer.geekScore,
              averageRating: freelancer.averageRating,
              totalReviews: freelancer.totalReviews,
              skills: freelancer.skills,
              plan: freelancer.plan,
            }
          : null,
      };
    });

    // Bids are identified by bidId (not position) since the caller may render
    // them in a different order than we evaluate them in here.
    const prompt = `You are an expert hiring consultant for a reverse-auction freelance platform called GeekBid.
A client posted a job and received multiple bids. Evaluate the bids and recommend the best hire.

JOB:
Title: ${job.title}
Description: ${job.description ?? ""}
Skills Required: ${(job.skillsRequired ?? []).join(", ")}
Budget: $${job.minimumPrice} - $${job.startingPrice}
Estimated Hours: ${job.estimatedHours ?? "not specified"}

BIDS RECEIVED (${bids.length} total):
${bidsWithProfiles.map((b) => `
Bid [id=${b.bidId}]:
  Price: $${b.bidPrice}
  Message: "${b.message}"
  Freelancer: ${b.freelancer ? `${b.freelancer.fullName}, GeekScore: ${b.freelancer.geekScore}, Rating: ${b.freelancer.averageRating ?? "N/A"} (${b.freelancer.totalReviews ?? 0} reviews), Skills: ${(b.freelancer.skills ?? []).join(", ")}, Plan: ${b.freelancer.plan ?? "free"}` : "Unknown"}
`).join("")}

Return a JSON object with EXACTLY this shape. The "bidId" values MUST be copied exactly from the "[id=...]" tags above:
{
  "bestBidId": "<bidId of the recommended bid>",
  "summary": "<2-3 sentence overall summary>",
  "evaluations": [
    {
      "bidId": "<bidId, copied exactly>",
      "score": <integer 0-100>,
      "verdict": "<hire|consider|pass>",
      "pros": ["<pro1>", "<pro2>"],
      "cons": ["<con1>"]
    }
  ],
  "recommendationReason": "<why the best bid was chosen>"
}`;

    const result = await generateJSON<{
      bestBidId: string;
      summary: string;
      evaluations: Array<{
        bidId: string;
        score: number;
        verdict: string;
        pros: string[];
        cons: string[];
      }>;
      recommendationReason: string;
    }>(prompt);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[AI Evaluate Bids Error]", err);
    return NextResponse.json({ error: "AI evaluation failed" }, { status: 500 });
  }
}
