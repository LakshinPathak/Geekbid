import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { sendDisputeResolvedEmail } from "@/lib/email";
import { sanitizeObjectId, sanitizeString } from "@/lib/sanitize";
import { backendFetch, proxyToBackend, tokenFromRequest } from "@/lib/backend";

// GET /api/disputes — BFF proxy → gateway → payment-service (admin all / else own).
export async function GET(req: NextRequest) {
 return proxyToBackend(req, "/v1/disputes", { unwrapKey: "disputes" });
}

/**
 * PATCH /api/disputes — resolve a dispute (admin only). The DB update runs in
 * payment-service; the BFF fires the Resend "dispute resolved" email from the
 * returned dispute (raiser email looked up here).
 */
export async function PATCH(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const body = await req.json();
 const disputeId = sanitizeObjectId(body.disputeId);
 const resolution = sanitizeString(body.resolution);
 const newStatus = sanitizeString(body.status);
 if (!disputeId) return NextResponse.json({ error: "Invalid or missing disputeId" }, { status: 400 });
 if (!newStatus) return NextResponse.json({ error: "status is required" }, { status: 400 });

 const result = await backendFetch<{ dispute: Record<string, unknown> | null }>(
 "/v1/disputes",
 { method: "PATCH", token: tokenFromRequest(req), body: { disputeId, resolution, status: newStatus } }
 );
 if (!result.ok) {
 return NextResponse.json({ error: result.error }, { status: result.status });
 }

 // Fire-and-forget: notify the user who raised the dispute.
 try {
 const dispute = result.data.dispute;
 if (dispute?.raisedBy) {
 const db = await getDb();
 const raiser = await db.collection("users").findOne(
 { _id: new ObjectId(dispute.raisedBy as string) },
 { projection: { email: 1, name: 1 } }
 );
 if (raiser?.email) {
 sendDisputeResolvedEmail(
 raiser.email, raiser.name ?? "User",
 (dispute.jobTitle as string) ?? "a project",
 resolution || newStatus, dispute.transactionId as string
 ).catch(() => {});
 }
 }
 } catch (emailErr) {
 console.error("[Disputes PATCH email lookup failed]", emailErr);
 }

 return NextResponse.json({ ok: true, message: "Dispute updated" });
 } catch (err) {
 console.error("[Disputes PATCH Error]", err);
 return NextResponse.json({ error: "Failed to update dispute" }, { status: 500 });
 }
}
