import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.payload.role !== "client") return NextResponse.json({ error: "Client only" }, { status: 403 });

    const db = await getDb();
    const uid = auth.payload.userId;
    const now = Date.now();

    const myJobs = await db.collection("jobs").find({ clientId: uid }).toArray();
    const jobIds = myJobs.map(j => j._id.toString());
    const allBids = await db.collection("bids").find({ jobId: { $in: jobIds } }).toArray();
    const txns = await db.collection("transactions").find({ clientId: uid }).toArray();

    const openJobs = myJobs.filter(j => j.status === "open");
    const totalBudgetPosted = myJobs.reduce((s, j) => s + (j.startingPrice || 0), 0);
    const totalSpent = txns.reduce((s, t) => s + (t.grossAmount || 0), 0);

    let totalSavings = 0;
    for (const j of myJobs) {
      if (j.finalPrice) totalSavings += j.startingPrice - j.finalPrice;
      else if (j.status === "open") {
        const elapsed = (now - new Date(j.postedAt).getTime()) / 3600000;
        totalSavings += Math.max(0, j.startingPrice - Math.max(j.minimumPrice, j.startingPrice - j.decayRatePerHour * elapsed) );
      }
    }

    const avgBidPrice = allBids.length > 0
      ? Math.round(allBids.reduce((s, b) => s + b.bidPrice, 0) / allBids.length) : 0;

    return NextResponse.json({
      totalJobs: myJobs.length, openJobs: openJobs.length,
      totalBudgetPosted: Math.round(totalBudgetPosted),
      totalSpent: Math.round(totalSpent),
      totalSavings: Math.round(Math.max(0, totalSavings)),
      avgBidPrice, totalBids: allBids.length,
      avgDecayRate: openJobs.length > 0
        ? Math.round(openJobs.reduce((s, j) => s + (j.decayRatePerHour || 0), 0) / openJobs.length * 10) / 10 : 0,
    });
  } catch (err) {
    console.error("[Client Dashboard]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
