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

    const [user, myBids, allOpenJobs, txns] = await Promise.all([
      db.collection("users").findOne({ _id: new ObjectId(uid) }),
      db.collection("bids").find({ freelancerId: uid }).toArray(),
      db.collection("jobs").find({ status: "open" }).toArray(),
      db.collection("transactions").find({ freelancerId: uid }).toArray(),
    ]);

    const mySkills: string[] = user?.skills ?? [];
    const matchedJobs = allOpenJobs.filter(j =>
      j.skillsRequired?.some((s: string) => mySkills.includes(s))
    );

    // Win rate
    const acceptedBids = myBids.filter(b => {
      const job = allOpenJobs.find(j => j._id.toString() === b.jobId);
      return job?.acceptedBy === uid;
    });
    const uniqueJobsBid = new Set(myBids.map(b => b.jobId)).size;
    const winRate = uniqueJobsBid > 0 ? Math.round(acceptedBids.length / uniqueJobsBid * 100) : 0;

    // Earning potential (sum of current prices for matched open jobs)
    const now = Date.now();
    let earningPotential = 0;
    for (const j of matchedJobs.slice(0, 10)) {
      const elapsed = (now - new Date(j.postedAt).getTime()) / 3600000;
      earningPotential += Math.max(j.minimumPrice, j.startingPrice - j.decayRatePerHour * elapsed);
    }

    const totalEarned = txns.reduce((s, t) => s + (t.netAmount || 0), 0);

    const plan = user?.plan ?? "free";
    const bidLimit = plan === "pro" ? 50 : plan === "enterprise" ? 200 : 10;
    const bidsUsed = user?.planLimits?.bidsPlacedThisMonth ?? myBids.length;

    return NextResponse.json({
      matchedJobs: matchedJobs.length,
      bidsUsed,
      bidLimit,
      winRate,
      earningPotential: Math.round(earningPotential),
      totalEarned: Math.round(totalEarned),
      geekScore: user?.geekScore ?? 0,
      skills: mySkills,
    });
  } catch (err) {
    console.error("[Freelancer Dashboard]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
