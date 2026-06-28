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
 const users = await db.collection("users").find({}).toArray();
 const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]));

 const jobHealth = myJobs.filter(j => j.status === "open").map(job => {
 const jid = job._id.toString();
 const deadlineHrs = (new Date(job.deadlineAt).getTime() - now) / 3600000;
 const hoursPosted = (now - new Date(job.postedAt).getTime()) / 3600000;
 const bidCount = job.bidCount ?? allBids.filter(b => b.jobId === jid).length;
 const jobBids = allBids.filter(b => b.jobId === jid).sort((a, b) => a.bidPrice - b.bidPrice);

 let health: string, healthColor: string;
 if (deadlineHrs < 6 && bidCount === 0) { health = "urgent"; healthColor = "red"; }
 else if (bidCount === 0 && hoursPosted > 6) { health = "needs_attention"; healthColor = "yellow"; }
 else if (bidCount > 0 && deadlineHrs > 12) { health = "healthy"; healthColor = "green"; }
 else { health = "expiring"; healthColor = "yellow"; }

 const elapsed = (now - new Date(job.postedAt).getTime()) / 3600000;
 const currentPrice = Math.max(job.minimumPrice, job.startingPrice - job.decayRatePerHour * elapsed);

 const topBids = jobBids.slice(0, 3).map(b => ({
 bidPrice: b.bidPrice,
 freelancerName: userMap[b.freelancerId]?.fullName?.split(" ")[0] ?? "Freelancer",
 geekScore: userMap[b.freelancerId]?.geekScore ?? 0,
 }));

 return {
 id: jid, title: job.title, health, healthColor,
 currentPrice: Math.round(currentPrice),
 startingPrice: job.startingPrice,
 savings: Math.round(Math.max(0, job.startingPrice - currentPrice)),
 bidCount, deadlineHrs: Math.round(deadlineHrs),
 topBids, category: job.category,
 };
 });

 jobHealth.sort((a, b) => {
 const order: Record<string, number> = { urgent: 0, needs_attention: 1, expiring: 2, healthy: 3 };
 return (order[a.health] ?? 9) - (order[b.health] ?? 9);
 });

 return NextResponse.json({ jobs: jobHealth });
 } catch (err) {
 console.error("[Job Health]", err);
 return NextResponse.json({ error: "Failed" }, { status: 500 });
 }
}
