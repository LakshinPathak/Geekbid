import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { generateJSON, isAIAvailable } from "@/lib/ai";
import { checkRateLimit } from "@/lib/sanitize";
import { getPlanConfig } from "@/lib/plans";
import { withPlanHeader } from "@/lib/middleware/plan-header";

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

    const _id = new ObjectId(auth.payload.userId);
    const db = await getDb();
    const user = await db
      .collection("users")
      .findOne({ _id }, { projection: { password: 0 } });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // AI bid-strategy quota — every tier has a monthly cap (free just has the
    // smallest one), not just free.
    const config = getPlanConfig(user.plan);
    const aiBidLimit = config.limits.aiBidStrategyPerMonth;

    // Dedicated reset field (not the shared jobs/bids `planLimits.monthResetAt`)
    // so resetting this quota can't skip or double-fire the job/bid counters'
    // own reset, which key off that field independently.
    const aiBidMonthResetAt = user.planLimits?.aiBidMonthResetAt;
    if (!aiBidMonthResetAt || new Date(aiBidMonthResetAt) < new Date()) {
      await db.collection("users").updateOne({ _id }, {
        $set: {
          "planLimits.aiBidUsesThisMonth": 0,
          "planLimits.aiBidMonthResetAt": new Date(Date.now() + 30 * 24 * 3600000).toISOString(),
        },
      });
    }

    // Atomic check-and-increment in one round trip — a plain findOne-then-updateOne
    // lets two concurrent requests both read "under the cap" before either write
    // lands, granting more uses than the limit allows. The $lt guard on the same
    // document makes MongoDB serialize the check and the increment together.
    const capped = await db.collection("users").findOneAndUpdate(
      {
        _id,
        $or: [
          { "planLimits.aiBidUsesThisMonth": { $lt: aiBidLimit } },
          { "planLimits.aiBidUsesThisMonth": { $exists: false } },
        ],
      },
      { $inc: { "planLimits.aiBidUsesThisMonth": 1 } }
    );

    if (!capped) {
      return NextResponse.json(
        { error: `${config.name} plan limit reached: ${aiBidLimit} AI bid analyses/month. Upgrade for more.` },
        { status: 429 }
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

    return withPlanHeader(NextResponse.json(result), user.plan ?? "free");
  } catch (err) {
    console.error("[AI Bid Strategy Error]", err);
    return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
  }
}
