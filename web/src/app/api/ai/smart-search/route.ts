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
    const { query } = body;

    if (!query) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    const prompt = `You are a search assistant for GeekBid, a reverse-auction freelance platform for tech projects.
A user typed a natural language search query. Convert it into structured search filters.

QUERY: "${query}"

Return a JSON object with EXACTLY this shape:
{
  "skills": ["<skill1>", "<skill2>"],
  "category": "<ai_ml|web_dev|mobile|devops|security|data_eng|blockchain|design|qa|other|null>",
  "maxBudget": <number or null>,
  "minBudget": <number or null>,
  "keywords": ["<keyword1>", "<keyword2>"],
  "intent": "<find_job|find_freelancer|general>"
}`;

    const result = await generateJSON<{
      skills: string[];
      category: string | null;
      maxBudget: number | null;
      minBudget: number | null;
      keywords: string[];
      intent: string;
    }>(prompt);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[AI Smart Search Error]", err);
    return NextResponse.json({ error: "AI search failed" }, { status: 500 });
  }
}
