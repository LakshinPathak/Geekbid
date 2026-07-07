import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

async function requireAdmin(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return { error: auth.error, status: auth.status };
  if (auth.payload.role !== "admin") return { error: "Forbidden", status: 403 };
  return { payload: auth.payload };
}

async function logAction(adminId: string, action: string, detail: string) {
  const db = await getDb();
  await db.collection("audit_logs").insertOne({ adminId, action, detail, createdAt: new Date().toISOString() });
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
  const status = searchParams.get("status") ?? "";

  const db = await getDb();
  const filter: Record<string, unknown> = {};
  if (status && status !== "all") filter.status = status;

  const [disputes, total] = await Promise.all([
    db.collection("disputes")
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    db.collection("disputes").countDocuments(filter),
  ]);

  // Enrich with user names and job titles via transactions
  const txIds = [...new Set(disputes.map(d => d.transactionId).filter(Boolean))];
  const userIds = [...new Set(disputes.map(d => d.raisedBy).filter(Boolean))];

  const [txs, users] = await Promise.all([
    txIds.length ? db.collection("transactions").find({ _id: { $in: txIds.map(id => { try { return ObjectId.createFromHexString(id); } catch { return id; } }) } }).toArray() : [],
    userIds.length ? db.collection("users").find({ _id: { $in: userIds.map(id => { try { return ObjectId.createFromHexString(id); } catch { return id; } }) } }).project({ fullName: 1, email: 1 }).toArray() : [],
  ]);

  const jobIds = [...new Set(txs.map(t => t.jobId).filter(Boolean))];
  const jobs = jobIds.length ? await db.collection("jobs").find({ _id: { $in: jobIds.map(id => { try { return ObjectId.createFromHexString(id); } catch { return id; } }) } }).project({ title: 1 }).toArray() : [];

  const txMap = Object.fromEntries(txs.map(t => [t._id.toString(), t]));
  const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u.fullName ?? u.email]));
  const jobMap = Object.fromEntries(jobs.map(j => [j._id.toString(), j.title]));

  return NextResponse.json({
    disputes: disputes.map(d => {
      const tx = txMap[d.transactionId] ?? null;
      return {
        ...d,
        _id: d._id.toString(),
        id: d._id.toString(),
        raisedByName: userMap[d.raisedBy] ?? d.raisedBy,
        jobTitle: tx ? (jobMap[tx.jobId] ?? `#${(tx.jobId ?? "").slice(-6)}`) : "—",
        amount: tx?.grossAmount ?? 0,
        escrowStatus: tx?.escrowStatus ?? "—",
      };
    }),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { disputeId, status, resolution, resolutionType } = await req.json();
  if (!disputeId || !status) return NextResponse.json({ error: "disputeId and status required" }, { status: 400 });
  if (!ObjectId.isValid(disputeId)) return NextResponse.json({ error: "Invalid disputeId" }, { status: 400 });
  if (status === "resolved" && !resolution?.trim()) {
    return NextResponse.json({ error: "Resolution notes required" }, { status: 400 });
  }

  const db = await getDb();
  const dispute = await db.collection("disputes").findOne({ _id: ObjectId.createFromHexString(disputeId) });
  if (!dispute) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });

  const result = await db.collection("disputes").updateOne(
    { _id: ObjectId.createFromHexString(disputeId) },
    { $set: { status, resolution: resolution ?? "", resolutionType: resolutionType ?? "dismiss", resolvedAt: new Date().toISOString(), resolvedBy: auth.payload.userId } }
  );
  if (result.matchedCount === 0) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });

  // Resolving a dispute must actually move the held escrow, not just relabel
  // the dispute record — refund_client/pay_freelancer map onto the same
  // escrow actions the Transactions page already exposes. split_50_50 has
  // no partial-payout mechanism anywhere in the app yet (a transaction has
  // one recipient), so it's intentionally left as a status-only resolution
  // until that's built; the admin should follow up via a manual payout.
  if (status === "resolved" && dispute.transactionId) {
    let txUpdate: Record<string, unknown> | null = null;
    if (resolutionType === "refund_client") {
      txUpdate = { escrowStatus: "refunded", refundedAt: new Date().toISOString(), refundReason: `Dispute resolution: ${resolution}` };
    } else if (resolutionType === "pay_freelancer") {
      txUpdate = { escrowStatus: "released", releasedAt: new Date().toISOString(), releasedBy: auth.payload.userId };
    }
    if (txUpdate) {
      try {
        await db.collection("transactions").updateOne(
          { _id: ObjectId.createFromHexString(dispute.transactionId), escrowStatus: "held" },
          { $set: txUpdate }
        );
      } catch (err) {
        console.error("[Dispute Resolve] Failed to update linked transaction escrow:", err);
      }
    }
  }

  await logAction(auth.payload.userId, "resolve_dispute", `Resolved dispute ${disputeId} as ${resolutionType}. Notes: ${resolution}`);
  return NextResponse.json({ ok: true });
}
