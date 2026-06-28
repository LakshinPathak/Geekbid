import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";

// GET /api/referrals — get user's referral stats + code
export async function GET(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const db = await getDb();
 const user = await db.collection("users").findOne({ _id: new ObjectId(auth.payload.userId) });

 if (!user) {
 return NextResponse.json({ error: "User not found" }, { status: 404 });
 }

 // Generate referral code if not exists
 let referralCode = user.referralCode;
 if (!referralCode) {
 referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
 await db.collection("users").updateOne(
 { _id: new ObjectId(auth.payload.userId) },
 { $set: { referralCode, referralCredits: 0 } }
 );
 }

 const referrals = await db
 .collection("referrals")
 .find({ referrerUserId: auth.payload.userId })
 .sort({ createdAt: -1 })
 .toArray();

 const stats = {
 referralCode,
 totalInvites: referrals.length,
 signedUp: referrals.filter((r) => r.status !== "pending").length,
 completed: referrals.filter((r) => r.status === "first_job_completed" || r.status === "credited").length,
 totalCredits: user.referralCredits ?? 0,
 referrals: referrals.map((r) => ({ ...r, _id: r._id.toString(), id: r._id.toString() })),
 };

 return NextResponse.json(stats);
 } catch (err) {
 console.error("[Referrals GET Error]", err);
 return NextResponse.json({ error: "Failed to fetch referrals" }, { status: 500 });
 }
}
