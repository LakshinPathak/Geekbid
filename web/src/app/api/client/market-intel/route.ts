import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
 if (auth.payload.role !== "client") return NextResponse.json({ error: "Client only" }, { status: 403 });

 const db = await getDb();
 const now = Date.now();
 const { searchParams } = new URL(req.url);
 const category = searchParams.get("category");

 const filter: Record<string, unknown> = { status: "open" };
 if (category && category !== "all") filter.category = category;

 const allOpenJobs = await db.collection("jobs").find(filter).toArray();
 const jobIds = allOpenJobs.map(j => j._id.toString());
 const allBids = await db.collection("bids").find({ jobId: { $in: jobIds } }).toArray();

 const avgStarting = allOpenJobs.length > 0
 ? Math.round(allOpenJobs.reduce((s, j) => s + j.startingPrice, 0) / allOpenJobs.length) : 0;
 const avgDecay = allOpenJobs.length > 0
 ? Math.round(allOpenJobs.reduce((s, j) => s + (j.decayRatePerHour || 0), 0) / allOpenJobs.length * 10) / 10 : 0;

 // Avg time to first bid
 const jobsWithBids = allOpenJobs.filter(j => {
 const jid = j._id.toString();
 return allBids.some(b => b.jobId === jid);
 });
 let avgFirstBid: number | null = null;
 if (jobsWithBids.length > 0) {
 let totalHrs = 0;
 for (const j of jobsWithBids) {
 const jid = j._id.toString();
 const firstBid = allBids.filter(b => b.jobId === jid).sort((a, b) =>
 new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
 )[0];
 if (firstBid) {
 totalHrs += (new Date(firstBid.createdAt).getTime() - new Date(j.postedAt).getTime()) / 3600000;
 }
 }
 avgFirstBid = Math.round(totalHrs / jobsWithBids.length * 10) / 10;
 }

 // Top skills in demand
 const skillCount: Record<string, number> = {};
 allOpenJobs.forEach(j => j.skillsRequired?.forEach((s: string) => { skillCount[s] = (skillCount[s] || 0) + 1; }));
 const topSkills = Object.entries(skillCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s]) => s);

 // Category breakdown
 const catCount: Record<string, number> = {};
 allOpenJobs.forEach(j => { if (j.category) catCount[j.category] = (catCount[j.category] || 0) + 1; });

 return NextResponse.json({
 totalOpenJobs: allOpenJobs.length,
 avgStartingPrice: avgStarting, avgDecayRate: avgDecay,
 avgFirstBidHours: avgFirstBid, topSkills,
 categoryBreakdown: catCount, totalBidsInMarket: allBids.length,
 jobCount: allOpenJobs.length,
 categoryLabels: Object.keys(catCount).slice(0, 3).join(", "),
 });
 } catch (err) {
 console.error("[Market Intel]", err);
 return NextResponse.json({ error: "Failed" }, { status: 500 });
 }
}
