import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";

// GET /api/jobs/recommended — top 10 matched jobs for authenticated freelancer
export async function GET(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 if (auth.payload.role !== "freelancer") {
 return NextResponse.json({ error: "Only freelancers get recommendations" }, { status: 403 });
 }

 const db = await getDb();
 const user = await db.collection("users").findOne({
 _id: new ObjectId(auth.payload.userId),
 });

 if (!user || !user.skills || user.skills.length === 0) {
 return NextResponse.json([]);
 }

 const freelancerSkills: string[] = user.skills;

 // Invite-only/direct-offer jobs must not be recommended to freelancers
 // who weren't invited — same visibility rule GET /api/jobs and
 // GET /api/jobs/[id] already enforce.
 const invitedJobIds = await db.collection("invites").distinct("jobId", { freelancerId: auth.payload.userId });
 const invitedObjectIds = invitedJobIds
 .map((jid: string) => { try { return new ObjectId(jid); } catch { return null; } })
 .filter((oid): oid is ObjectId => oid !== null);
 const visibilityOr: Record<string, unknown>[] = [{ visibility: { $ne: "invite_only" } }];
 if (invitedObjectIds.length > 0) {
 visibilityOr.push({ visibility: "invite_only", _id: { $in: invitedObjectIds } });
 }

 const openJobs = await db
 .collection("jobs")
 .find({ status: "open", $or: visibilityOr })
 .sort({ postedAt: -1 })
 .limit(100)
 .toArray();

 const scored = openJobs
 .map((job) => {
 const required: string[] = job.skillsRequired ?? [];
 if (required.length === 0) return null;
 const overlap = required.filter((s: string) => freelancerSkills.includes(s));
 const matchScore = Math.round((overlap.length / required.length) * 100);
 return {
 ...job,
 _id: job._id.toString(),
 id: job._id.toString(),
 matchScore,
 };
 })
 .filter((j): j is NonNullable<typeof j> => j !== null && j.matchScore > 0)
 .sort((a, b) => b.matchScore - a.matchScore)
 .slice(0, 10);

 return NextResponse.json(scored);
 } catch (err) {
 console.error("[Recommended GET Error]", err);
 return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
 }
}
