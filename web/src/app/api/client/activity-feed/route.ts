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

 const myJobs = await db.collection("jobs").find({ clientId: uid }).toArray();
 const jobIds = myJobs.map(j => j._id.toString());

 // Get recent bids on client's jobs
 const recentBids = await db.collection("bids")
 .find({ jobId: { $in: jobIds } })
 .sort({ createdAt: -1 }).limit(20).toArray();

 const users = await db.collection("users").find({}).toArray();
 const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]));
 const jobMap = Object.fromEntries(myJobs.map(j => [j._id.toString(), j]));

 const events = recentBids.map(b => ({
 type: b.bidType === "accept" ? "bid_accept" : "bid_counter",
 jobId: b.jobId,
 jobTitle: jobMap[b.jobId]?.title ?? "Unknown Job",
 bidderName: userMap[b.freelancerId]?.fullName?.split(" ")[0] ?? "Freelancer",
 price: b.bidPrice,
 timestamp: b.createdAt,
 }));

 return NextResponse.json({ events });
 } catch (err) {
 console.error("[Activity Feed]", err);
 return NextResponse.json({ error: "Failed" }, { status: 500 });
 }
}
