import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { sendEscrowReleasedEmail, sendDisputeEmail, sendJobCompletedEmail } from "@/lib/email";
import { sanitizeObjectId, sanitizeString } from "@/lib/sanitize";
import { backendFetch, proxyToBackend, tokenFromRequest } from "@/lib/backend";

// GET /api/transactions — BFF proxy → gateway → payment-service (IDOR-scoped).
export async function GET(req: NextRequest) {
 return proxyToBackend(req, "/v1/transactions", { unwrapKey: "transactions" });
}

// PATCH /api/transactions — release / dispute escrow. The atomic escrow state
// transition runs in payment-service; the BFF fires the Resend emails from the
// service response (parties + job title looked up here, where Resend lives).
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
 if (!transactionId) return NextResponse.json({ error: "Invalid or missing transactionId" }, { status: 400 });
 if (!action) return NextResponse.json({ error: "action is required" }, { status: 400 });

 const result = await backendFetch<{ message: string; transaction: Record<string, unknown>; otherId?: string }>(
 "/v1/transactions",
 { method: "PATCH", token: tokenFromRequest(req), body: { transactionId, action, reason } }
 );
 if (!result.ok) {
 return NextResponse.json({ error: result.error }, { status: result.status });
 }
 const tx = result.data.transaction;

 // ── Emails (best-effort, from the web runtime) ──
 try {
 const db = await getDb();
 const job = tx.jobId ? await db.collection("jobs").findOne({ _id: new ObjectId(tx.jobId as string) }) : null;

 if (action === "release" && tx.freelancerId) {
 const freelancer = await db.collection("users").findOne(
 { _id: new ObjectId(tx.freelancerId as string) },
 { projection: { email: 1, name: 1 } }
 );
 if (freelancer?.email) {
 sendEscrowReleasedEmail(
 freelancer.email, freelancer.name ?? "Freelancer",
 (tx.netAmount as number) ?? (tx.grossAmount as number) ?? 0,
 job?.title ?? "Your project", transactionId
 ).catch((err) => console.error("[Email Failed] escrowReleased:", err));
 }
 const client = await db.collection("users").findOne(
 { _id: new ObjectId(auth.payload.userId) },
 { projection: { email: 1, name: 1 } }
 );
 if (client?.email) {
 sendJobCompletedEmail(
 client.email, client.name ?? "Client",
 freelancer?.name ?? "Freelancer", job?.title ?? "Your project",
 (tx.grossAmount as number) ?? 0, (tx.platformFee as number) ?? 0, transactionId
 ).catch((err) => console.error("[Email Failed] jobCompleted:", err));
 }
 } else if (action === "dispute" && result.data.otherId) {
 const other = await db.collection("users").findOne(
 { _id: new ObjectId(result.data.otherId) },
 { projection: { email: 1, name: 1 } }
 );
 if (other?.email) {
 sendDisputeEmail(
 other.email, other.name ?? "User", job?.title ?? "a project",
 reason || "Quality dispute", transactionId
 ).catch((err) => console.error("[Email Failed] dispute:", err));
 }
 }
 } catch (emailErr) {
 console.error("[Transactions PATCH email lookup failed]", emailErr);
 }

 return NextResponse.json({ ok: true, message: result.data.message });
 } catch (err) {
 console.error("[Transactions PATCH Error]", err);
 return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
 }
}
