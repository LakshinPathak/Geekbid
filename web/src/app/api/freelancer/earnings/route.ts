import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
 if (auth.payload.role !== "freelancer") return NextResponse.json({ error: "Freelancer only" }, { status: 403 });

 const db = await getDb();
 const uid = auth.payload.userId;

 const txns = await db.collection("transactions").find({ freelancerId: uid }).toArray();

 const totalEarned = txns.reduce((s, t) => s + (t.netAmount || 0), 0);
 const pendingEscrow = txns
 .filter(t => t.escrowStatus === "held" || t.escrowStatus === "pending")
 .reduce((s, t) => s + (t.netAmount || 0), 0);

 // Monthly trend (last 6 months)
 const now = Date.now();
 const monthlyTrend: { month: string; amount: number }[] = [];
 for (let i = 5; i >= 0; i--) {
 const monthStart = new Date(now);
 monthStart.setMonth(monthStart.getMonth() - i, 1);
 monthStart.setHours(0, 0, 0, 0);
 const monthEnd = new Date(monthStart);
 monthEnd.setMonth(monthEnd.getMonth() + 1);

 const amount = txns
 .filter(t => {
 const ts = new Date(t.createdAt).getTime();
 return ts >= monthStart.getTime() && ts < monthEnd.getTime();
 })
 .reduce((s, t) => s + (t.netAmount || 0), 0);

 monthlyTrend.push({
 month: monthStart.toISOString().slice(0, 7),
 amount: Math.round(amount),
 });
 }

 // Projected monthly (average of non-zero months)
 const nonZero = monthlyTrend.filter(m => m.amount > 0);
 const projectedMonthly = nonZero.length > 0
 ? Math.round(nonZero.reduce((s, m) => s + m.amount, 0) / nonZero.length) : 0;

 return NextResponse.json({
 totalEarned: Math.round(totalEarned),
 pendingEscrow: Math.round(pendingEscrow),
 monthlyTrend,
 projectedMonthly,
 totalTransactions: txns.length,
 });
 } catch (err) {
 console.error("[Earnings]", err);
 return NextResponse.json({ error: "Failed" }, { status: 500 });
 }
}
