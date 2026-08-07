import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
 if (auth.payload.role !== "freelancer") return NextResponse.json({ error: "Freelancer only" }, { status: 403 });

 const db = await getDb();
 const uid = auth.payload.userId;
 const now = Date.now();

 const user = await db.collection("users").findOne({ _id: new ObjectId(uid) });
 const mySkills: string[] = user?.skills ?? [];

 // Invite-only/direct-offer jobs must not surface here unless this
 // freelancer was actually invited (same visibility rule as /api/jobs).
 const invitedJobIds = await db.collection("invites").distinct("jobId", { freelancerId: uid });
 const invitedObjectIds = invitedJobIds
 .map((jid: string) => { try { return new ObjectId(jid); } catch { return null; } })
 .filter((oid): oid is ObjectId => oid !== null);
 // Bounded so this query can't scan every open job platform-wide as the
 // platform grows — only the top 15 alerts are ever returned below, so a
 // few hundred candidates is plenty.
 const openJobs = await db.collection("jobs").find({
 status: "open",
 $or: [
 { visibility: { $ne: "invite_only" } },
 ...(invitedObjectIds.length > 0 ? [{ visibility: "invite_only", _id: { $in: invitedObjectIds } }] : []),
 ],
 }).limit(500).toArray();

 // Find jobs where price is approaching floor (within 20% of floor)
 const alerts = openJobs.map(job => {
 const elapsed = (now - new Date(job.postedAt).getTime()) / 3600000;
 const currentPrice = Math.max(job.minimumPrice, job.startingPrice - job.decayRatePerHour * elapsed);
 const priceRange = job.startingPrice - job.minimumPrice;
 const percentToFloor = priceRange > 0 ? ((currentPrice - job.minimumPrice) / priceRange) * 100 : 0;
 const hoursToFloor = job.decayRatePerHour > 0
 ? (currentPrice - job.minimumPrice) / job.decayRatePerHour : Infinity;

 // Only include jobs near floor or with good match
 const matchScore = job.skillsRequired?.length > 0
 ? job.skillsRequired.filter((s: string) => mySkills.includes(s)).length / job.skillsRequired.length * 100 : 0;

 return {
 jobId: job._id.toString(), title: job.title,
 currentPrice: Math.round(currentPrice),
 floorPrice: job.minimumPrice,
 percentToFloor: Math.round(percentToFloor),
 hoursToFloor: Math.round(hoursToFloor * 10) / 10,
 matchScore: Math.round(matchScore),
 decayRate: job.decayRatePerHour,
 category: job.category,
 };
 })
 .filter(a => a.percentToFloor <= 30 || a.matchScore >= 60)
 .sort((a, b) => a.percentToFloor - b.percentToFloor);

 return NextResponse.json({ alerts: alerts.slice(0, 15) });
 } catch (err) {
 console.error("[Price Alerts]", err);
 return NextResponse.json({ error: "Failed" }, { status: 500 });
 }
}
