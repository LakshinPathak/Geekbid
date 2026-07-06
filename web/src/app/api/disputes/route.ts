import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { sendDisputeResolvedEmail } from "@/lib/email";
import { sanitizeObjectId, sanitizeString } from "@/lib/sanitize";

/**
 * GET /api/disputes — list disputes (protected)
 */
export async function GET(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const db = await getDb();

 let filter: Record<string, unknown> = {};
 if (auth.payload.role !== "admin") {
 // A dispute must be visible to BOTH parties on the underlying
 // transaction, not just whoever filed it — otherwise the party a
 // dispute is raised against has no way to ever see or respond to it.
 const myTxIds = (
 await db
 .collection("transactions")
 .find(
 { $or: [{ clientId: auth.payload.userId }, { freelancerId: auth.payload.userId }] },
 { projection: { _id: 1 } }
 )
 .toArray()
 ).map((t) => t._id.toString());

 filter = {
 $or: [
 { raisedBy: auth.payload.userId },
 { transactionId: { $in: myTxIds } },
 ],
 };
 }

 const disputes = await db
 .collection("disputes")
 .find(filter)
 .sort({ createdAt: -1 })
 .limit(100)
 .toArray();

 return NextResponse.json(
 disputes.map((d) => ({
 ...d,
 _id: d._id.toString(),
 id: d._id.toString(),
 }))
 );
 } catch (err) {
 console.error("[Disputes GET Error]", err);
 return NextResponse.json(
 { error: "Failed to fetch disputes" },
 { status: 500 }
 );
 }
}

/**
 * PATCH /api/disputes — resolve a dispute (admin only)
 */
export async function PATCH(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 if (auth.payload.role !== "admin") {
 return NextResponse.json(
 { error: "Only admins can resolve disputes" },
 { status: 403 }
 );
 }

 const body = await req.json();
 // Validate ObjectId before passing to MongoDB — malformed hex crashes ObjectId constructor
 const disputeId = sanitizeObjectId(body.disputeId);
 const resolution = sanitizeString(body.resolution);
 const newStatus = sanitizeString(body.status);

 if (!disputeId) {
 return NextResponse.json({ error: "Invalid or missing disputeId" }, { status: 400 });
 }
 if (!newStatus) {
 return NextResponse.json({ error: "status is required" }, { status: 400 });
 }

 const db = await getDb();
 const result = await db.collection("disputes").updateOne(
 { _id: new ObjectId(disputeId) },
 {
 $set: {
 status: newStatus,
 resolution,
 resolvedAt: new Date().toISOString(),
 resolvedBy: auth.payload.userId,
 },
 }
 );
 if (result.matchedCount === 0) {
 return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
 }

 // Fire-and-forget: notify the user who raised the dispute
 const dispute = await db.collection("disputes").findOne({ _id: new ObjectId(disputeId) });
 if (dispute?.raisedBy) {
 const raiser = await db.collection("users").findOne(
 { _id: new ObjectId(dispute.raisedBy) },
 { projection: { email: 1, fullName: 1 } }
 );
 if (raiser?.email) {
 sendDisputeResolvedEmail(
 raiser.email,
 raiser.fullName ?? "User",
 dispute.jobTitle ?? "a project",
 resolution || newStatus,
 dispute.transactionId
 ).catch(() => {});
 }
 }

 return NextResponse.json({ ok: true, message: "Dispute updated" });
 } catch (err) {
 console.error("[Disputes PATCH Error]", err);
 return NextResponse.json(
 { error: "Failed to update dispute" },
 { status: 500 }
 );
 }
}
