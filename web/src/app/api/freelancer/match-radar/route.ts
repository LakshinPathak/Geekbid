import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.payload.role !== "freelancer") return NextResponse.json({ error: "Freelancer only" }, { status: 403 });

    const db = await getDb();
    const uid = auth.payload.userId;
    const now = Date.now();

    const user = await db.collection("users").findOne({ _id: new ObjectId(uid) });
    const mySkills: string[] = user?.skills ?? [];

    const openJobs = await db.collection("jobs").find({ status: "open" }).toArray();

    // Score and rank jobs by skill match
    const scored = openJobs.map(job => {
      const matched = job.skillsRequired?.filter((s: string) => mySkills.includes(s)) ?? [];
      const missing = job.skillsRequired?.filter((s: string) => !mySkills.includes(s)) ?? [];
      const matchScore = job.skillsRequired?.length > 0
        ? Math.round(matched.length / job.skillsRequired.length * 100) : 0;

      const elapsed = (now - new Date(job.postedAt).getTime()) / 3600000;
      const currentPrice = Math.max(job.minimumPrice, job.startingPrice - job.decayRatePerHour * elapsed);
      const effectiveHourly = job.estimatedHours > 0 ? currentPrice / job.estimatedHours : 0;

      return {
        id: job._id.toString(), title: job.title, category: job.category,
        matchScore, matchedSkills: matched, missingSkills: missing,
        currentPrice: Math.round(currentPrice),
        effectiveHourly: Math.round(effectiveHourly * 100) / 100,
        bidCount: job.bidCount ?? 0,
        estimatedHours: job.estimatedHours,
        deadlineAt: job.deadlineAt,
        decayRatePerHour: job.decayRatePerHour,
      };
    });

    scored.sort((a, b) => b.matchScore - a.matchScore || b.effectiveHourly - a.effectiveHourly);

    return NextResponse.json({ jobs: scored.slice(0, 20) });
  } catch (err) {
    console.error("[Match Radar]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
