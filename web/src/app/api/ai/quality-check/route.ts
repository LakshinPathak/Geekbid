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
    const { title, description, skills, startingPrice, minimumPrice, estimatedHours } = body;

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const prompt = `You are a job quality reviewer for GeekBid, a reverse-auction freelance platform.
Review the job posting below and provide quality feedback before it goes live.

JOB POSTING:
Title: ${title}
Description: ${description ?? ""}
Skills: ${(skills ?? []).join(", ")}
Starting Price: $${startingPrice}
Floor Price: $${minimumPrice}
Estimated Hours: ${estimatedHours ?? "not specified"}

Return a JSON object with EXACTLY this shape:
{
  "qualityScore": <integer 0-100>,
  "issues": ["<issue1>", "<issue2>"],
  "suggestions": ["<suggestion1>", "<suggestion2>"],
  "readyToPost": <boolean>,
  "flaggedForReview": <boolean>,
  "flagReason": "<reason if flagged, else null>"
}`;

    const result = await generateJSON<{
      qualityScore: number;
      issues: string[];
      suggestions: string[];
      readyToPost: boolean;
      flaggedForReview: boolean;
      flagReason: string | null;
    }>(prompt);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[AI Quality Check Error]", err);
    return NextResponse.json({ error: "AI quality check failed" }, { status: 500 });
  }
}
