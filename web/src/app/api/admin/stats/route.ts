import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (auth.payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = await getDb();

  const [
    totalUsers, totalJobs, openJobs, totalTransactions, totalDisputes,
    activeDisputes, recentLogs, txAgg,
  ] = await Promise.all([
    db.collection("users").countDocuments({ deleted: { $ne: true } }),
    db.collection("jobs").countDocuments({}),
    db.collection("jobs").countDocuments({ status: "open" }),
    db.collection("transactions").countDocuments({}),
    db.collection("disputes").countDocuments({}),
    db.collection("disputes").countDocuments({ status: { $ne: "resolved" } }),
    db.collection("audit_logs").find({}).sort({ createdAt: -1 }).limit(12).toArray(),
    db.collection("transactions").aggregate([
      { $group: {
        _id: null,
        gmv: { $sum: "$grossAmount" },
        fees: { $sum: "$platformFee" },
        heldEscrow: { $sum: { $cond: [{ $eq: ["$escrowStatus", "held"] }, "$grossAmount", 0] } },
        heldCount: { $sum: { $cond: [{ $eq: ["$escrowStatus", "held"] }, 1, 0] } },
      }},
    ]).toArray(),
  ]);

  const financials = txAgg[0] ?? { gmv: 0, fees: 0, heldEscrow: 0, heldCount: 0 };

  return NextResponse.json({
    users: { total: totalUsers },
    jobs: { total: totalJobs, open: openJobs },
    transactions: { total: totalTransactions, gmv: financials.gmv, fees: financials.fees, heldEscrow: financials.heldEscrow, heldCount: financials.heldCount },
    disputes: { total: totalDisputes, active: activeDisputes },
    recentActivity: recentLogs.map(l => ({ ...l, _id: l._id.toString() })),
  });
}
