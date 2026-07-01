import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { sendEscrowReleasedEmail, sendDisputeEmail, sendJobCompletedEmail } from "@/lib/email";
import { sanitizeObjectId, sanitizeString } from "@/lib/sanitize";

// GET /api/transactions (protected)
export async function GET(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const db = await getDb();
 const filter =
 auth.payload.role === "admin"
 ? {}
 : {
 $or: [
 { clientId: auth.payload.userId },
 { freelancerId: auth.payload.userId },
 ],
 };

 const txs = await db
 .collection("transactions")
 .find(filter)
 .sort({ createdAt: -1 })
 .limit(100)
 .toArray();

 return NextResponse.json(
 txs.map((t) => ({ ...t, _id: t._id.toString(), id: t._id.toString() }))
 );
 } catch (err) {
 console.error("[Transactions GET Error]", err);
 return NextResponse.json(
 { error: "Failed to fetch transactions" },
 { status: 500 }
 );
 }
}

// PATCH /api/transactions — release or dispute escrow (protected)
export async function PATCH(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const body = await req.json();
 const transactionId = sanitizeObjectId(body.transactionId);
 const action = sanitizeString(body.action);
 const reason = sanitizeString(body.reason);

 if (!transactionId) {
 return NextResponse.json({ error: "Invalid or missing transactionId" }, { status: 400 });
 }
 if (!action) {
 return NextResponse.json({ error: "action is required" }, { status: 400 });
 }

 const db = await getDb();

 if (action === "release") {
 // Only client or admin can release
 if (!["client", "admin"].includes(auth.payload.role)) {
 return NextResponse.json(
 { error: "Only clients or admins can release escrow" },
 { status: 403 }
 );
 }

 const tx = await db.collection("transactions").findOne({ _id: new ObjectId(transactionId) });
 // Null check — tx not found means invalid/unauthorized transactionId
 if (!tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
 if (auth.payload.role !== "admin" && tx.clientId?.toString() !== auth.payload.userId) {
 return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 }

 const releasedTx = await db.collection("transactions").findOneAndUpdate(
 { _id: new ObjectId(transactionId), escrowStatus: "held" },
 {
 $set: {
 escrowStatus: "released",
 releasedAt: new Date().toISOString(),
 releasedBy: auth.payload.userId,
 },
 }
 );
 if (!releasedTx) {
 return NextResponse.json(
 { error: "Transaction is not in a releasable state (already released or under dispute)" },
 { status: 409 }
 );
 }

 // Fire-and-forget: notify freelancer about payment release
 const job = tx.jobId ? await db.collection("jobs").findOne({ _id: new ObjectId(tx.jobId) }) : null;
 if (tx.freelancerId) {
 const freelancer = await db.collection("users").findOne(
 { _id: new ObjectId(tx.freelancerId) },
 { projection: { email: 1, name: 1 } }
 );
 if (freelancer?.email) {
 sendEscrowReleasedEmail(
 freelancer.email, freelancer.name ?? "Freelancer",
 tx.netAmount ?? tx.grossAmount ?? 0,
 job?.title ?? "Your project", transactionId
 ).catch((err) => console.error("[Email Failed] escrowReleased:", err));
 }

 // Also send job completed summary to the client
 const client = await db.collection("users").findOne(
 { _id: new ObjectId(auth.payload.userId) },
 { projection: { email: 1, name: 1 } }
 );
 if (client?.email) {
 sendJobCompletedEmail(
 client.email, client.name ?? "Client",
 freelancer?.name ?? "Freelancer",
 job?.title ?? "Your project",
 tx.grossAmount ?? 0, tx.platformFee ?? 0,
 transactionId
 ).catch((err) => console.error("[Email Failed] jobCompleted:", err));
 }
 }

 return NextResponse.json({ ok: true, message: "Escrow released" });
 }

 if (action === "dispute") {
 const tx = await db.collection("transactions").findOne({ _id: new ObjectId(transactionId) });
 // Null check — crash was: tx.clientId.toString() without null guard
 if (!tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
 const isParty = tx.clientId?.toString() === auth.payload.userId ||
 tx.freelancerId?.toString() === auth.payload.userId;
 if (!isParty) {
 return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 }
 const disputedTx = await db.collection("transactions").findOneAndUpdate(
 { _id: new ObjectId(transactionId), escrowStatus: "held" },
 { $set: { escrowStatus: "disputed" } }
 );
 if (!disputedTx) {
 return NextResponse.json(
 { error: "Transaction is not in a disputable state (already released or already disputed)" },
 { status: 409 }
 );
 }
 await db.collection("disputes").insertOne({
 transactionId,
 raisedBy: auth.payload.userId,
 reason: reason || "Quality dispute",
 status: "open",
 jobTitle: tx.jobId ? (await db.collection("jobs").findOne({ _id: new ObjectId(tx.jobId) }))?.title : undefined,
 createdAt: new Date().toISOString(),
 });

 // Fire-and-forget: notify the other party
 const otherId = tx.clientId === auth.payload.userId ? tx.freelancerId : tx.clientId;
 if (otherId) {
 const other = await db.collection("users").findOne(
 { _id: new ObjectId(otherId) },
 { projection: { email: 1, name: 1 } }
 );
 const job = tx.jobId ? await db.collection("jobs").findOne({ _id: new ObjectId(tx.jobId) }) : null;
 if (other?.email) {
 sendDisputeEmail(
 other.email, other.name ?? "User",
 job?.title ?? "a project",
 reason || "Quality dispute",
 transactionId
 ).catch((err) => console.error("[Email Failed] dispute:", err));
 }
 }

 return NextResponse.json({ ok: true, message: "Dispute raised" });
 }

 return NextResponse.json({ error: "Invalid action" }, { status: 400 });
 } catch (err) {
 console.error("[Transactions PATCH Error]", err);
 return NextResponse.json(
 { error: "Failed to update transaction" },
 { status: 500 }
 );
 }
}
