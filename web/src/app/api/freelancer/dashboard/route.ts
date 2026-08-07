import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { getPlanConfig } from "@/lib/plans";

export async function GET(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
 if (auth.payload.role !== "freelancer") return NextResponse.json({ error: "Freelancer only" }, { status: 403 });

 const db = await getDb();
 const uid = auth.payload.userId;

 const [user, myBids, invitedJobIds, txns] = await Promise.all([
 db.collection("users").findOne({ _id: new ObjectId(uid) }),
 db.collection("bids").find({ freelancerId: uid }).toArray(),
 db.collection("invites").distinct("jobId", { freelancerId: uid }),
 db.collection("transactions").find({ freelancerId: uid }).toArray(),
 ]);

 // Invite-only/direct-offer jobs must not surface here unless this
 // freelancer was actually invited (same visibility rule as /api/jobs).
 const invitedObjectIds = invitedJobIds
 .map((jid: string) => { try { return new ObjectId(jid); } catch { return null; } })
 .filter((oid): oid is ObjectId => oid !== null);
 // Bounded so this dashboard query can't scan every open job platform-wide
 // as the platform grows — a few hundred is plenty to compute the
 // matched-job count and earning-potential estimate below.
 const allOpenJobs = await db.collection("jobs").find({
 status: "open",
 $or: [
 { visibility: { $ne: "invite_only" } },
 ...(invitedObjectIds.length > 0 ? [{ visibility: "invite_only", _id: { $in: invitedObjectIds } }] : []),
 ],
 }).limit(500).toArray();

 const mySkills: string[] = user?.skills ?? [];
 const matchedJobs = allOpenJobs.filter(j =>
 j.skillsRequired?.some((s: string) => mySkills.includes(s))
 );

 // Win rate — must be computed against the actual jobs bid on (any status),
 // not `allOpenJobs`. A won bid's job has status "accepted"/"completed" by
 // definition, so it can never appear in the `status: "open"` list above;
 // joining against that list meant `job` was always undefined for a truly
 // accepted bid, and winRate was always 0% regardless of real performance.
 const myBidJobIds = [...new Set(myBids.map(b => b.jobId))];
 const myBidJobObjectIds = myBidJobIds
 .map((jid) => { try { return new ObjectId(jid); } catch { return null; } })
 .filter((oid): oid is ObjectId => oid !== null);
 const myBidJobs = myBidJobObjectIds.length > 0
 ? await db.collection("jobs").find({ _id: { $in: myBidJobObjectIds } }).toArray()
 : [];
 const acceptedBids = myBids.filter(b => {
 const job = myBidJobs.find(j => j._id.toString() === b.jobId);
 return job?.acceptedBy === uid;
 });
 const uniqueJobsBid = myBidJobIds.length;
 const winRate = uniqueJobsBid > 0 ? Math.round(acceptedBids.length / uniqueJobsBid * 100) : 0;

 // Earning potential (sum of current prices for matched open jobs)
 const now = Date.now();
 let earningPotential = 0;
 for (const j of matchedJobs.slice(0, 10)) {
 const elapsed = (now - new Date(j.postedAt).getTime()) / 3600000;
 earningPotential += Math.max(j.minimumPrice, j.startingPrice - j.decayRatePerHour * elapsed);
 }

 const totalEarned = txns.reduce((s, t) => s + (t.netAmount || 0), 0);

 const bidLimit = getPlanConfig(user?.plan).limits.bidsPerMonth;
 // A missing planLimits.bidsPlacedThisMonth means "not tracked yet this
 // period" (0), never the freelancer's all-time bid count — falling back
 // to myBids.length showed a wildly inflated "used" figure against a
 // monthly cap for anyone who'd been on the platform a while.
 const bidsUsed = user?.planLimits?.bidsPlacedThisMonth ?? 0;

 return NextResponse.json({
 matchedJobs: matchedJobs.length,
 bidsUsed,
 bidLimit,
 winRate,
 earningPotential: Math.round(earningPotential),
 totalEarned: Math.round(totalEarned),
 geekScore: user?.geekScore ?? 0,
 skills: mySkills,
 });
 } catch (err) {
 console.error("[Freelancer Dashboard]", err);
 return NextResponse.json({ error: "Failed" }, { status: 500 });
 }
}
