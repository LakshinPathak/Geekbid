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
 ];
 const safeUpdates: Record<string, unknown> = {};
 for (const key of allowedFields) {
 if (key in updates) safeUpdates[key] = updates[key];
 }

 if (Object.keys(safeUpdates).length === 0) {
 return NextResponse.json(
 { error: "No valid fields to update" },
 { status: 400 }
 );
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
