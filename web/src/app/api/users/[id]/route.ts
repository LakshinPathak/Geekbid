import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET /api/users/[id] — Public profile (excludes email/password)
export async function GET(
 _req: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
 const { id } = await params;
 const db = await getDb();

 let user;
 try {
 user = await db.collection("users").findOne({ _id: new ObjectId(id) });
 } catch {
 user = await db.collection("users").findOne({ id });
 }

 if (!user || user.deleted || user.suspended) {
 // Same 404 for not-found, deleted, and suspended — a public profile
 // lookup shouldn't reveal that an account existed but was removed or
 // suspended, and neither should render as a normal active profile.
 return NextResponse.json({ error: "User not found" }, { status: 404 });
 }

 // Strip sensitive fields — beyond the obvious password/email, a public
 // profile must not leak how someone signed up (googleId), referral
 // relationships (referredBy/referralCredits), or billing/plan internals
 // (planLimits/subscriptionId/planExpiresAt) to any stranger who knows
 // their user id.
 const {
 password: _pw, refreshToken: _rt, email: _em, googleId: _gid,
 referredBy: _rb, referralCredits: _rc, planLimits: _pl,
 subscriptionId: _sid, planExpiresAt: _pea,
 ...publicProfile
 } = user;
 void _pw; void _rt; void _em; void _gid; void _rb; void _rc; void _pl; void _sid; void _pea;

 return NextResponse.json({
 ...publicProfile,
 _id: user._id.toString(),
 id: user._id.toString(),
 });
 } catch (err) {
 console.error("[Users/:id GET Error]", err);
 return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
 }
}
