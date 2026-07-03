import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";

/**
 * GET /api/chat/rooms — fetch user's chat rooms (protected)
 */
export async function GET(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const db = await getDb();
 const rooms = await db
 .collection("chat_rooms")
 .find({ participantIds: auth.payload.userId })
 .sort({ updatedAt: -1 })
 .limit(50)
 .toArray();

 return NextResponse.json(
 rooms.map((r) => ({
 ...r,
 _id: r._id.toString(),
 id: r._id.toString(),
 }))
 );
 } catch (err) {
 console.error("[Chat Rooms GET Error]", err);
 return NextResponse.json(
 { error: "Failed to fetch chat rooms" },
 { status: 500 }
 );
 }
}

/**
 * POST /api/chat/rooms — create a chat room (protected)
 */
export async function POST(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const { jobId, participantIds } = await req.json();
 if (!jobId || !Array.isArray(participantIds) || participantIds.length !== 2) {
 return NextResponse.json(
 { error: "jobId and exactly two participantIds are required" },
 { status: 400 }
 );
 }

 // Caller must be one of the two participants — otherwise anyone could
 // insert themselves into (or fabricate) a conversation they're not part of.
 if (!participantIds.includes(auth.payload.userId)) {
 return NextResponse.json(
 { error: "You must be one of the room participants" },
 { status: 403 }
 );
 }

 const db = await getDb();

 let job: any;
 try { job = await db.collection("jobs").findOne({ _id: new ObjectId(jobId) }); }
 catch { job = await db.collection("jobs").findOne({ id: jobId }); }
 if (!job) {
 return NextResponse.json({ error: "Job not found" }, { status: 404 });
 }

 // Every participant must actually be associated with this job — the
 // client, the accepted freelancer, or a freelancer who bid on it.
 const isAssociatedWithJob = async (userId: string) => {
 if (job.clientId === userId || job.acceptedBy === userId) return true;
 const bid = await db.collection("bids").findOne({ jobId, freelancerId: userId });
 return !!bid;
 };
 for (const participantId of participantIds) {
 if (!(await isAssociatedWithJob(participantId))) {
 return NextResponse.json(
 { error: "All participants must be associated with this job" },
 { status: 403 }
 );
 }
 }

 // Check if room already exists for this job + participants
 const existing = await db.collection("chat_rooms").findOne({
 jobId,
 participantIds: { $all: participantIds },
 });

 if (existing) {
 return NextResponse.json({
 ...existing,
 _id: existing._id.toString(),
 id: existing._id.toString(),
 });
 }

 const room = {
 jobId,
 participantIds,
 updatedAt: new Date().toISOString(),
 createdAt: new Date().toISOString(),
 };

 const result = await db.collection("chat_rooms").insertOne(room);
 return NextResponse.json(
 {
 ...room,
 _id: result.insertedId.toString(),
 id: result.insertedId.toString(),
 },
 { status: 201 }
 );
 } catch (err) {
 console.error("[Chat Rooms POST Error]", err);
 return NextResponse.json(
 { error: "Failed to create chat room" },
 { status: 500 }
 );
 }
}
