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

 const myBids = await db.collection("bids").find({ freelancerId: uid }).sort({ createdAt: -1 }).toArray();
 const jobIds = [...new Set(myBids.map(b => b.jobId))];

 const jobs = await db.collection("jobs").find({ _id: { $in: jobIds.map(id => { try { return new ObjectId(id); } catch { return id; } }) } }).toArray();
 const jobMap = Object.fromEntries(jobs.map(j => [j._id.toString(), j]));

 // Get all bids for these jobs to compute rank
 const allBidsForJobs = await db.collection("bids").find({ jobId: { $in: jobIds } }).toArray();

 const now = Date.now();
 const trackedBids = jobIds.map(jobId => {
 const job = jobMap[jobId];
 if (!job) return null;

 const myJobBids = myBids.filter(b => b.jobId === jobId);
 const latestBid = myJobBids[0];
 const allJobBids = allBidsForJobs.filter(b => b.jobId === jobId).sort((a, b) => a.bidPrice - b.bidPrice);
 const rankIdx = allJobBids.findIndex(b => b.freelancerId === uid);
 const myRank = rankIdx >= 0 ? rankIdx + 1 : 1;

 const elapsed = (now - new Date(job.postedAt).getTime()) / 3600000;
 const currentPrice = Math.max(job.minimumPrice, job.startingPrice - job.decayRatePerHour * elapsed);

 const cooldownEnds = latestBid
 ? new Date(new Date(latestBid.createdAt).getTime() + 30 * 60000).toISOString()
 : null;

 let status: string;
 if (job.status !== "open") status = job.acceptedBy === uid ? "won" : "lost";
 else if (myRank === 1) status = "winning";
 else status = "outbid";

 return {
 jobId, jobTitle: job.title,
 myPrice: latestBid?.bidPrice ?? 0,
 currentPrice: Math.round(currentPrice),
 rank: myRank, totalBids: allJobBids.length,
 status, cooldownEndsAt: cooldownEnds,
 deadlineAt: job.deadlineAt,
 };
 }).filter(Boolean);

 return NextResponse.json({ bids: trackedBids });
 } catch (err) {
 console.error("[Bid Tracker]", err);
 return NextResponse.json({ error: "Failed" }, { status: 500 });
 }
}
