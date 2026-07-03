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
  if (status && status !== "all") filter.escrowStatus = status;

  const [txs, total] = await Promise.all([
    db.collection("transactions")
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    db.collection("transactions").countDocuments(filter),
  ]);

  // Enrich with job titles and user names
  const jobIds = [...new Set(txs.map(t => t.jobId).filter(Boolean))];
  const userIds = [...new Set([...txs.map(t => t.clientId), ...txs.map(t => t.freelancerId)].filter(Boolean))];

  const [jobs, users] = await Promise.all([
    jobIds.length ? db.collection("jobs").find({ _id: { $in: jobIds.map(id => { try { return ObjectId.createFromHexString(id); } catch { return id; } }) } }).project({ title: 1 }).toArray() : [],
    userIds.length ? db.collection("users").find({ _id: { $in: userIds.map(id => { try { return ObjectId.createFromHexString(id); } catch { return id; } }) } }).project({ fullName: 1, email: 1 }).toArray() : [],
  ]);

  const jobMap = Object.fromEntries(jobs.map(j => [j._id.toString(), j.title]));
  const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u.fullName ?? u.email]));

  return NextResponse.json({
    transactions: txs.map(t => ({
      ...t,
      _id: t._id.toString(),
      id: t._id.toString(),
      jobTitle: jobMap[t.jobId] ?? `#${(t.jobId ?? "").slice(-6)}`,
      clientName: userMap[t.clientId] ?? t.clientId,
      freelancerName: userMap[t.freelancerId] ?? t.freelancerId,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { txId, action, reason } = await req.json();
  if (!txId || !action) return NextResponse.json({ error: "txId and action required" }, { status: 400 });

  const db = await getDb();
  const tx = await db.collection("transactions").findOne({ _id: ObjectId.createFromHexString(txId) });
  if (!tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

  if (action === "release") {
    await db.collection("transactions").updateOne(
      { _id: tx._id },
      { $set: { escrowStatus: "released", releasedAt: new Date().toISOString(), releasedBy: auth.payload.userId } }
    );
    await logAction(auth.payload.userId, "release_escrow", `Released escrow for tx ${txId}. ${reason ?? ""}`);
  } else if (action === "refund") {
    await db.collection("transactions").updateOne(
      { _id: tx._id },
      { $set: { escrowStatus: "refunded", refundedAt: new Date().toISOString(), refundReason: reason ?? "" } }
    );
    await logAction(auth.payload.userId, "refund_transaction", `Refunded tx ${txId}. Reason: ${reason}`);
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
