import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";

// GET /api/user — get authenticated user's profile
export async function GET(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const db = await getDb();
 const user = await db
 .collection("users")
 .findOne(
 { _id: new ObjectId(auth.payload.userId) },
 { projection: { password: 0 } }
 );

 if (!user) {
 return NextResponse.json({ error: "User not found" }, { status: 404 });
 }

 return NextResponse.json({
 ...user,
 _id: user._id.toString(),
 id: user._id.toString(),
 });
 } catch (err) {
 console.error("[User GET Error]", err);
 return NextResponse.json(
 { error: "Failed to fetch user" },
 { status: 500 }
 );
 }
}

// PATCH /api/user — update user profile
export async function PATCH(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const updates = await req.json();
 const db = await getDb();

 const allowedFields = [
 "fullName",
 "bio",
 "skills",
 "company",
 "availability",
 "hourlyRateMin",
 "hourlyRateMax",
 "avatarUrl",
 "avatarPublicId",
 "githubUsername",
 ];
 const safeUpdates: Record<string, unknown> = {};
 for (const key of allowedFields) {
 if (key in updates) safeUpdates[key] = updates[key];
 }

 // Editing the GitHub handle here (as opposed to the dedicated Verify flow)
 // must drop any existing verified badge — otherwise a stale githubVerified
 // from a previous handle would misleadingly carry over to a new, unverified one.
 if ("githubUsername" in safeUpdates) {
 const existing = await db.collection("users").findOne(
 { _id: new ObjectId(auth.payload.userId) },
 { projection: { githubUsername: 1 } }
 );
 if (existing?.githubUsername !== safeUpdates.githubUsername) {
 safeUpdates.githubVerified = false;
 safeUpdates.githubData = null;
 }
 }

 if (Object.keys(safeUpdates).length === 0) {
 return NextResponse.json(
 { error: "No valid fields to update" },
 { status: 400 }
 );
 }

 // Hourly-rate range sanity check — the two fields are independently
 // optional per-request, so validate against whichever value is already
 // on the user when only one side of the range is being changed.
 if ("hourlyRateMin" in safeUpdates || "hourlyRateMax" in safeUpdates) {
 const existing = await db.collection("users").findOne(
 { _id: new ObjectId(auth.payload.userId) },
 { projection: { hourlyRateMin: 1, hourlyRateMax: 1 } }
 );
 const nextMin = "hourlyRateMin" in safeUpdates ? Number(safeUpdates.hourlyRateMin) : existing?.hourlyRateMin ?? 0;
 const nextMax = "hourlyRateMax" in safeUpdates ? Number(safeUpdates.hourlyRateMax) : existing?.hourlyRateMax ?? 0;
 if (!Number.isFinite(nextMin) || !Number.isFinite(nextMax) || nextMin < 0 || nextMax < 0) {
 return NextResponse.json(
 { error: "Hourly rates must be non-negative numbers" },
 { status: 400 }
 );
 }
 if (nextMax > 0 && nextMin > nextMax) {
 return NextResponse.json(
 { error: "hourlyRateMin cannot be greater than hourlyRateMax" },
 { status: 400 }
 );
 }
 }

 await db
 .collection("users")
 .updateOne(
 { _id: new ObjectId(auth.payload.userId) },
 { $set: safeUpdates }
 );

 return NextResponse.json({ ok: true, updated: Object.keys(safeUpdates) });
 } catch (err) {
 console.error("[User PATCH Error]", err);
 return NextResponse.json(
 { error: "Failed to update user" },
 { status: 500 }
 );
 }
}
