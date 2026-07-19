import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { toCents, toDollars } from "@/lib/money";

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
  // Allowlist, not just "truthy" — sending "RESOLVED" or "closed" previously
  // set the dispute's status field to whatever was sent while the escrow-move
  // check below (exact match on "resolved") silently no-oped, leaving the
  // linked transaction stuck "disputed" forever.
  const ALLOWED_STATUSES = ["open", "resolved"];
  if (!ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` }, { status: 400 });
  }
  if (status === "resolved" && !resolution?.trim()) {
    return NextResponse.json({ error: "Resolution notes required" }, { status: 400 });
  }
  const ALLOWED_RESOLUTION_TYPES = ["refund_client", "pay_freelancer", "split_50_50", "dismiss"];
  if (status === "resolved" && !ALLOWED_RESOLUTION_TYPES.includes(resolutionType)) {
    return NextResponse.json(
      { error: `resolutionType is required when resolving and must be one of: ${ALLOWED_RESOLUTION_TYPES.join(", ")}` },
      { status: 400 }
    );
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
  // escrow actions the Transactions page already exposes.
  //
  // CAS filter must match "disputed", not "held": PATCH /api/transactions
  // {action:"dispute"} already flips the linked transaction held->disputed
  // when the dispute is raised, well before it ever reaches resolution
  // here. A filter of escrowStatus:"held" can never match a transaction
  // that went through the real dispute-raise flow, so this updateOne
  // silently matched zero documents every time — confirmed live via
  // CRUD_TEST_FINAL.md Phase 9/10/20 (raised a real dispute, resolved as
  // pay_freelancer, escrowStatus stayed "disputed" instead of "released").
  if (status === "resolved" && dispute.transactionId) {
    let txUpdate: Record<string, unknown> | null = null;
    if (resolutionType === "refund_client") {
      txUpdate = { escrowStatus: "refunded", refundedAt: new Date().toISOString(), refundReason: `Dispute resolution: ${resolution}` };
    } else if (resolutionType === "pay_freelancer") {
      txUpdate = { escrowStatus: "released", releasedAt: new Date().toISOString(), releasedBy: auth.payload.userId };
    } else if (resolutionType === "split_50_50") {
      // ISSUE-61: split had no payout mechanism at all before — a
      // transaction has one recipient, so "splitting" here means: the
      // freelancer gets half of what they'd have earned (netAmount/2),
      // and the client is refunded whatever's left of what they paid
      // (grossAmount - that half) — the platform's fee is preserved in
      // full either way (fee = gross - net, always), only the net split
      // between the two parties changes. Exact-cent math via toCents/
      // toDollars to avoid float drift on the halving.
      const tx = await db.collection("transactions").findOne({ _id: ObjectId.createFromHexString(dispute.transactionId) });
      if (tx) {
        const freelancerCents = Math.round(toCents(tx.netAmount ?? 0) / 2);
        const clientRefundCents = toCents(tx.grossAmount ?? 0) - freelancerCents;
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
          { _id: ObjectId.createFromHexString(dispute.transactionId), escrowStatus: "disputed" },
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
