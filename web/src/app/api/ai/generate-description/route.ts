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
    const { title, skills, category, estimatedHours, budget } = body;

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const prompt = `You are a technical writing expert helping a client post a job on GeekBid, a reverse-auction freelance platform.
Generate a professional, detailed job description based on the provided info.

JOB INFO:
Title: ${title}
Skills: ${(skills ?? []).join(", ")}
Category: ${category ?? "general"}
Estimated Hours: ${estimatedHours ?? "not specified"}
Budget Range: ${budget ?? "not specified"}

Return a JSON object with EXACTLY this shape:
{
  "description": "<rich 3-4 paragraph job description, markdown-friendly>",
  "deliverables": ["<deliverable1>", "<deliverable2>", "<deliverable3>"],
  "suggestedSkills": ["<skill1>", "<skill2>", "<skill3>", "<skill4>"],
  "estimatedComplexity": "<simple|medium|complex>",
  "clarifyingQuestions": ["<question1>", "<question2>"]
}`;

    const result = await generateJSON<{
      description: string;
      deliverables: string[];
      suggestedSkills: string[];
      estimatedComplexity: string;
      clarifyingQuestions: string[];
    }>(prompt);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[AI Generate Description Error]", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
