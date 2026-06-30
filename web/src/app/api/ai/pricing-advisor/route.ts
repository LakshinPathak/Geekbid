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
    const { title, skills, category, estimatedHours, recentJobs } = body;

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const prompt = `You are a pricing expert for GeekBid, a reverse-auction freelance platform where job prices decay over time.
Help a client set the right starting price and floor price for their job.

JOB:
Title: ${title}
Skills: ${(skills ?? []).join(", ")}
Category: ${category ?? "general"}
Estimated Hours: ${estimatedHours ?? "not specified"}

RECENT SIMILAR JOBS ON PLATFORM:
${recentJobs && recentJobs.length > 0
  ? (recentJobs as Array<{ title: string; startingPrice: number; minimumPrice: number; bidCount?: number }>).map((j) => `- "${j.title}": Start $${j.startingPrice}, Floor $${j.minimumPrice}, ${j.bidCount ?? 0} bids`).join("\n")
  : "No recent data available"}

Return a JSON object with EXACTLY this shape:
{
  "recommendedStartingPrice": <number>,
  "recommendedFloorPrice": <number>,
  "marketRate": <number>,
  "rationale": "<2-3 sentence explanation>",
  "pricingStrategy": "<aggressive|balanced|premium>",
  "expectedBids": <integer>,
  "tips": ["<tip1>", "<tip2>"]
}`;

    const result = await generateJSON<{
      recommendedStartingPrice: number;
      recommendedFloorPrice: number;
      marketRate: number;
      rationale: string;
      pricingStrategy: string;
      expectedBids: number;
      tips: string[];
    }>(prompt);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[AI Pricing Advisor Error]", err);
    return NextResponse.json({ error: "AI pricing failed" }, { status: 500 });
  }
}
