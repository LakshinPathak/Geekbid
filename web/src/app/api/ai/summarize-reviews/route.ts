import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { generateJSON, isAIAvailable } from "@/lib/ai";
import { checkAndConsumeAiQuota } from "@/lib/ai-plan-limit";
import { checkRateLimit } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  if (!isAIAvailable()) {
    return NextResponse.json({ error: "AI not available" }, { status: 503 });
  }

  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Per-user throttle: these routes call an external Gemini API on every
    // request, so nothing short of this stops rapid-fire calls from racking up
    // cost within a user's monthly quota window.
    if (!(await checkRateLimit(`ai:${auth.payload.userId}`, 10, 60 * 1000))) {
      return NextResponse.json({ error: "Too many AI requests. Please slow down." }, { status: 429 });
    }

    const quota = await checkAndConsumeAiQuota(auth.payload.userId);
    if (!quota.ok) {
      return NextResponse.json({ error: quota.error }, { status: 429 });
    }

    const body = await req.json();
    const { reviews, freelancerName } = body;

    if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
      return NextResponse.json({ error: "reviews array is required" }, { status: 400 });
    }

    const prompt = `You are analyzing freelancer reviews on GeekBid. Summarize the reviews for ${freelancerName ?? "this freelancer"}.

REVIEWS:
${(reviews as Array<{ rating: number; comment: string; reviewerRole: string }>).map((r, i) => `${i + 1}. Rating: ${r.rating}/5 — "${r.comment}" (from ${r.reviewerRole})`).join("\n")}

Return a JSON object with EXACTLY this shape:
{
  "summary": "<2-3 sentence overall summary>",
  "strengths": ["<strength1>", "<strength2>", "<strength3>"],
  "areasForImprovement": ["<area1>"],
  "sentiment": "<positive|mixed|negative>",
  "trustScore": <integer 0-100>
}`;

    const result = await generateJSON<{
      summary: string;
      strengths: string[];
      areasForImprovement: string[];
      sentiment: string;
      trustScore: number;
    }>(prompt);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[AI Summarize Reviews Error]", err);
    return NextResponse.json({ error: "AI summarization failed" }, { status: 500 });
  }
}
