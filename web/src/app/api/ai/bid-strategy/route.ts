import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
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

    const db = await getDb();
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(auth.payload.userId) }, { projection: { password: 0 } });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Free plan: max 2 AI bid analyses per month
    if (user.plan === "free" || !user.plan) {
      const limits = user.planLimits ?? {};
      const now = new Date();
      const resetAt = limits.monthResetAt ? new Date(limits.monthResetAt) : null;
      const sameMonth = resetAt && resetAt.getMonth() === now.getMonth() && resetAt.getFullYear() === now.getFullYear();
      const uses = sameMonth ? (limits.aiBidUsesThisMonth ?? 0) : 0;

      if (uses >= 2) {
        return NextResponse.json(
          { error: "Free plan limit reached. Upgrade to Pro for unlimited AI analyses." },
          { status: 429 }
        );
      }

      // Increment usage
      await db.collection("users").updateOne(
        { _id: new ObjectId(auth.payload.userId) },
        {
          $set: {
            "planLimits.aiBidUsesThisMonth": uses + 1,
            "planLimits.monthResetAt": sameMonth ? limits.monthResetAt : now.toISOString(),
          },
        }
      );
    }

    const body = await req.json();
    const { job, currentPrice, mySkills, myGeekScore, competitorBids } = body;

    if (!job) {
      return NextResponse.json({ error: "job is required" }, { status: 400 });
    }

    const prompt = `You are an expert freelance bid strategist on a reverse-auction platform called GeekBid.
The client posted a job and the price decays over time. Freelancers bid to win — the lowest reasonable bid wins.

JOB DETAILS:
Title: ${job.title}
Description: ${job.description ?? ""}
Skills Required: ${(job.skillsRequired ?? []).join(", ")}
Starting Price: $${job.startingPrice}
Current Price: $${currentPrice}
Floor Price: $${job.minimumPrice}
Estimated Hours: ${job.estimatedHours ?? "not specified"}
Category: ${job.category ?? "general"}

FREELANCER PROFILE:
Skills: ${(mySkills ?? []).join(", ")}
GeekScore: ${myGeekScore ?? 0}

COMPETITOR BIDS (lowest to highest):
${competitorBids && competitorBids.length > 0
  ? competitorBids.map((b: { bidPrice: number }, i: number) => `${i + 1}. $${b.bidPrice}`).join("\n")
  : "No bids yet"}

Analyze this and return a JSON object with EXACTLY this shape:
{
  "recommendedBid": <number>,
  "confidence": <"high"|"medium"|"low">,
  "rationale": "<2-3 sentence explanation>",
  "timing": "<when to place the bid: now / wait X hours / etc>",
  "winProbability": <integer 0-100>,
  "tips": ["<tip1>", "<tip2>", "<tip3>"]
}`;

    const result = await generateJSON<{
      recommendedBid: number;
      confidence: string;
      rationale: string;
      timing: string;
      winProbability: number;
      tips: string[];
    }>(prompt);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[AI Bid Strategy Error]", err);
    return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
  }
}
