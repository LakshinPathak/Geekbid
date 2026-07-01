import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";

// GET /api/bids/my — Freelancer's bid history with job details joined
export async function GET(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const { payload } = auth;
 if (payload.role !== "freelancer" && payload.role !== "admin") {
 return NextResponse.json({ error: "Only freelancers can view their bid history" }, { status: 403 });
 }

 const db = await getDb();

 const bids = await db
 .collection("bids")
 .find({ freelancerId: payload.userId })
 .sort({ createdAt: -1 })
 .limit(100)
 .toArray();

 // Join job details in a single batched query instead of one findOne per bid
 const jobObjectIds = [...new Set(bids.map((b) => b.jobId))]
 .map((jid) => { try { return new ObjectId(jid); } catch { return null; } })
 .filter((oid): oid is ObjectId => oid !== null);
 const jobDocs = await db.collection("jobs").find({ _id: { $in: jobObjectIds } }).toArray();
 const jobsById = new Map(jobDocs.map((j) => [j._id.toString(), j]));

 const enriched = bids.map((bid) => {
 const job = jobsById.get(bid.jobId);

 return {
 ...bid,
 _id: bid._id.toString(),
 id: bid._id.toString(),
 job: job
 ? {
 _id: job._id.toString(),
 id: job._id.toString(),
 title: job.title,
 status: job.status,
 category: job.category,
 skillsRequired: job.skillsRequired,
 acceptedBy: job.acceptedBy,
 startingPrice: job.startingPrice,
 minimumPrice: job.minimumPrice,
 postedAt: job.postedAt,
 deadlineAt: job.deadlineAt,
 }
 : null,
 };
 });

 return NextResponse.json(enriched);
 } catch (err) {
 console.error("[Bids/my GET Error]", err);
 return NextResponse.json({ error: "Failed to fetch bids" }, { status: 500 });
 }
}
