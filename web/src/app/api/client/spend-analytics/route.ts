import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
 if (auth.payload.role !== "client") return NextResponse.json({ error: "Client only" }, { status: 403 });

 const db = await getDb();
 const uid = auth.payload.userId;
 const txns = await db.collection("transactions").find({ clientId: uid }).toArray();

 // Category breakdown from completed jobs
 const myJobs = await db.collection("jobs").find({ clientId: uid }).toArray();
 const catSpend: Record<string, number> = {};
 for (const t of txns) {
 const job = myJobs.find(j => j._id.toString() === t.jobId);
 const cat = job?.category || "uncategorized";
 catSpend[cat] = (catSpend[cat] || 0) + (t.grossAmount || 0);
 }

 // Weekly spend (last 8 weeks)
 const now = Date.now();
 const weeklySpend: { week: string; amount: number }[] = [];
 for (let i = 7; i >= 0; i--) {
 const weekStart = now - (i + 1) * 7 * 86400000;
 const weekEnd = now - i * 7 * 86400000;
 const amount = txns
 .filter(t => { const ts = new Date(t.createdAt).getTime(); return ts >= weekStart && ts < weekEnd; })
 .reduce((s, t) => s + (t.grossAmount || 0), 0);
 weeklySpend.push({ week: new Date(weekStart).toISOString().slice(0, 10), amount: Math.round(amount) });
 }

 const totalSpent = txns.reduce((s, t) => s + (t.grossAmount || 0), 0);
 const totalBudget = myJobs.reduce((s, j) => s + (j.startingPrice || 0), 0);

 return NextResponse.json({
 totalSpent: Math.round(totalSpent),
 totalBudgetPosted: Math.round(totalBudget),
 budgetUtilization: totalBudget > 0 ? Math.round(totalSpent / totalBudget * 100) : 0,
 weeklySpend,
 categoryBreakdown: Object.entries(catSpend).map(([category, amount]) => ({ category, amount: Math.round(amount) })),
 });
 } catch (err) {
 console.error("[Spend Analytics]", err);
 return NextResponse.json({ error: "Failed" }, { status: 500 });
 }
}
