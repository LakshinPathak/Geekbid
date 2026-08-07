import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { sendDisputeResolvedEmail } from "@/lib/email";
import { sanitizeObjectId, sanitizeString } from "@/lib/sanitize";
import { toCents, toDollars } from "@/lib/money";

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
 const resolutionType = sanitizeString(body.resolutionType);

 if (!disputeId) {
 return NextResponse.json({ error: "Invalid or missing disputeId" }, { status: 400 });
 }
 // Allowlist, not just "truthy" — an admin sending "RESOLVED" or "closed"
 // previously set the dispute's own status field to whatever they sent
 // while the escrow-move check below (exact match on "resolved") silently
 // no-oped, leaving the linked transaction stuck "disputed" forever.
 const ALLOWED_STATUSES = ["open", "resolved"];
 if (!ALLOWED_STATUSES.includes(newStatus)) {
 return NextResponse.json({ error: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` }, { status: 400 });
 }
 const ALLOWED_RESOLUTION_TYPES = ["refund_client", "pay_freelancer", "split_50_50", "dismiss"];
 if (newStatus === "resolved" && !ALLOWED_RESOLUTION_TYPES.includes(resolutionType)) {
 return NextResponse.json(
 { error: `resolutionType is required when resolving and must be one of: ${ALLOWED_RESOLUTION_TYPES.join(", ")}` },
 { status: 400 }
 );
 }

 const db = await getDb();
 const disputeBefore = await db.collection("disputes").findOne({ _id: new ObjectId(disputeId) });
 if (!disputeBefore) {
 return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
 }
 // CAS on the dispute's own status: without this, a dispute already
 // resolved once (transaction moved out of "disputed") could be
 // PATCHed again with a different resolutionType — this write would
 // still succeed (overwriting resolution/resolvedAt/resolvedBy) while
 // the transaction CAS below silently no-ops, leaving the dispute
 // record and the resolution email out of sync with what actually
 // happened to the money.
 const result = await db.collection("disputes").updateOne(
 { _id: new ObjectId(disputeId), status: "open" },
 {
 $set: {
 status: newStatus,
 resolution,
 ...(newStatus === "resolved" ? { resolutionType, resolvedAt: new Date().toISOString(), resolvedBy: auth.payload.userId } : {}),
 },
 }
 );
 if (result.matchedCount === 0) {
 return NextResponse.json({ error: "Dispute already resolved" }, { status: 409 });
 }

 // Resolving a dispute must actually move the held escrow, not just relabel
 // the dispute record — same fix as api/admin/disputes/route.ts, kept in
 // sync here since this endpoint independently duplicates that one's
 // resolve behavior.
 //
 // CAS filter must match "disputed", not "held": by the time a dispute
 // reaches resolution, PATCH /api/transactions {action:"dispute"} has
 // already flipped the linked transaction held -> disputed. A filter of
 // escrowStatus:"held" here can never match a transaction that went
 // through the real dispute-raise flow, so this updateOne silently
 // matched zero documents every time — confirmed live via
 // CRUD_TEST_FINAL.md Phase 9/10 (raised a real dispute, resolved as
 // pay_freelancer, escrowStatus stayed "disputed" instead of "released").
 if (newStatus === "resolved" && disputeBefore.transactionId) {
 let txUpdate: Record<string, unknown> | null = null;
 if (resolutionType === "refund_client") {
 txUpdate = { escrowStatus: "refunded", refundedAt: new Date().toISOString(), refundReason: `Dispute resolution: ${resolution}` };
 } else if (resolutionType === "pay_freelancer") {
 txUpdate = { escrowStatus: "released", releasedAt: new Date().toISOString(), releasedBy: auth.payload.userId };
 } else if (resolutionType === "split_50_50") {
 // ISSUE-61/63: freelancer gets half of netAmount, client gets the
 // other half of netAmount — this preserves the platform fee
 // (gross - net) in full, since the two payouts sum to netAmount,
 // not grossAmount. Exact-cent math to avoid float drift on the halving.
 const tx = await db.collection("transactions").findOne({ _id: new ObjectId(disputeBefore.transactionId) });
 if (tx) {
 const netCents = toCents(tx.netAmount ?? 0);
 const freelancerCents = Math.round(netCents / 2);
 const clientRefundCents = netCents - freelancerCents;
 txUpdate = {
 escrowStatus: "split",
 splitAt: new Date().toISOString(),
 splitBy: auth.payload.userId,
 splitFreelancerAmount: toDollars(freelancerCents),
 splitClientRefundAmount: toDollars(clientRefundCents),
 };
 }
 }
 if (txUpdate) {
 try {
 await db.collection("transactions").updateOne(
 { _id: new ObjectId(disputeBefore.transactionId), escrowStatus: "disputed" },
 { $set: txUpdate }
 );
 } catch (err) {
 console.error("[Dispute Resolve] Failed to update linked transaction escrow:", err);
 }
 }
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
