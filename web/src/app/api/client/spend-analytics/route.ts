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

 // What the client actually ended up paying for a transaction — grossAmount
 // is fixed at escrow-creation time and never adjusted down afterwards, so
 // summing it straight over every transaction (regardless of status) counts
 // money that came back to the client as if it were still spent:
 //  - "refunded" (dispute resolved in the client's favor): they got the
 //    full amount back, so this is $0 spend, not grossAmount.
 //  - "split" (dispute resolved 50/50): only the platform fee + the
 //    freelancer's half was actually kept; splitClientRefundAmount came
 //    back to the client and must be subtracted out of gross.
 //  - "held" / "disputed" / "released": the money hasn't been returned
 //    (yet, or ever), so full grossAmount stands.
 // eslint-disable-next-line @typescript-eslint/no-explicit-any -- txns are raw Mongo Documents (no shared schema type)
 const spentAmount = (t: any): number => {
 if (t.escrowStatus === "refunded") return 0;
 if (t.escrowStatus === "split") return (t.grossAmount || 0) - (t.splitClientRefundAmount || 0);
 return t.grossAmount || 0;
 };

 // Category breakdown from completed jobs
 const myJobs = await db.collection("jobs").find({ clientId: uid }).toArray();
 const catSpend: Record<string, number> = {};
 for (const t of txns) {
 const job = myJobs.find(j => j._id.toString() === t.jobId);
 const cat = job?.category || "uncategorized";
 catSpend[cat] = (catSpend[cat] || 0) + spentAmount(t);
 }

 // Weekly spend (last 8 weeks)
 const now = Date.now();
 const weeklySpend: { week: string; amount: number }[] = [];
 for (let i = 7; i >= 0; i--) {
 const weekStart = now - (i + 1) * 7 * 86400000;
 const weekEnd = now - i * 7 * 86400000;
 const amount = txns
 .filter(t => { const ts = new Date(t.createdAt).getTime(); return ts >= weekStart && ts < weekEnd; })
 .reduce((s, t) => s + spentAmount(t), 0);
 weeklySpend.push({ week: new Date(weekStart).toISOString().slice(0, 10), amount: Math.round(amount) });
 }

 const totalSpent = txns.reduce((s, t) => s + spentAmount(t), 0);
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
