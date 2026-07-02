import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { proxyToBackend } from "@/lib/backend";

// GET /api/user — authenticated user's own profile.
// BFF proxy → gateway → auth-service GET /v1/auth/me (self view, includes email).
export async function GET(req: NextRequest) {
 return proxyToBackend(req, "/v1/auth/me", { unwrapKey: "user" });
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
