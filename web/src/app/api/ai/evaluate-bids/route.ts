import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { generateJSON, isAIAvailable } from "@/lib/ai";

export async function POST(req: NextRequest) {
  if (!isAIAvailable()) {
    return NextResponse.json({ error: "AI not available" }, { status: 503 });
  }

  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { job, bids, freelancers } = body;

    if (!job || !bids) {
      return NextResponse.json({ error: "job and bids are required" }, { status: 400 });
    }

    const bidsWithProfiles = (bids as Array<{ _id?: string; id?: string; freelancerId: string; bidPrice: number; message?: string; createdAt?: string }>).map((bid) => {
      const freelancer = (freelancers ?? []).find(
        (f: { id?: string; _id?: string; fullName?: string; geekScore?: number; averageRating?: number; totalReviews?: number; skills?: string[]; plan?: string }) =>
          (f.id ?? f._id) === bid.freelancerId
      );
      return {
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

    const prompt = `You are an expert hiring consultant for a reverse-auction freelance platform called GeekBid.
A client posted a job and received multiple bids. Evaluate the bids and recommend the best hire.

JOB:
Title: ${job.title}
Description: ${job.description ?? ""}
Skills Required: ${(job.skillsRequired ?? []).join(", ")}
Budget: $${job.minimumPrice} - $${job.startingPrice}
Estimated Hours: ${job.estimatedHours ?? "not specified"}

BIDS RECEIVED (${bids.length} total):
${bidsWithProfiles.map((b, i) => `
Bid ${i + 1}:
  Price: $${b.bidPrice}
  Message: "${b.message}"
  Freelancer: ${b.freelancer ? `${b.freelancer.fullName}, GeekScore: ${b.freelancer.geekScore}, Rating: ${b.freelancer.averageRating ?? "N/A"} (${b.freelancer.totalReviews ?? 0} reviews), Skills: ${(b.freelancer.skills ?? []).join(", ")}, Plan: ${b.freelancer.plan ?? "free"}` : "Unknown"}
`).join("")}

Return a JSON object with EXACTLY this shape:
{
  "bestBidIndex": <0-based index of the recommended bid>,
  "summary": "<2-3 sentence overall summary>",
  "evaluations": [
    {
      "index": <0-based>,
      "score": <integer 0-100>,
      "verdict": "<hire|consider|pass>",
      "pros": ["<pro1>", "<pro2>"],
      "cons": ["<con1>"]
    }
  ],
  "recommendationReason": "<why the best bid was chosen>"
}`;

    const result = await generateJSON<{
      bestBidIndex: number;
      summary: string;
      evaluations: Array<{
        index: number;
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
