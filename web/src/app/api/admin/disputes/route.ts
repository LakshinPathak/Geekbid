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
  if (status === "resolved" && !resolution?.trim()) {
    return NextResponse.json({ error: "Resolution notes required" }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.collection("disputes").updateOne(
    { _id: ObjectId.createFromHexString(disputeId) },
    { $set: { status, resolution: resolution ?? "", resolutionType: resolutionType ?? "dismiss", resolvedAt: new Date().toISOString(), resolvedBy: auth.payload.userId } }
  );
  if (result.matchedCount === 0) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });

  await logAction(auth.payload.userId, "resolve_dispute", `Resolved dispute ${disputeId} as ${resolutionType}. Notes: ${resolution}`);
  return NextResponse.json({ ok: true });
}
