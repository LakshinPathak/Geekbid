import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { hashSync } from "bcryptjs";
import { revokeRefreshToken } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/sanitize";
import crypto from "crypto";

// POST /api/auth/reset — { token, newPassword } → validates the one-time
// reset token (hashed lookup, not-yet-used, not expired), sets the new
// password, and revokes existing refresh tokens so any other logged-in
// session is forced to log back in with the new password.
export async function POST(req: NextRequest) {
 try {
 const ip = getClientIp(req);
 if (!(await checkRateLimit(`reset-password:${ip}`, 10, 15 * 60 * 1000))) {
 return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
 }

 const body = await req.json();
 const token = typeof body.token === "string" ? body.token : "";
 const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

 if (!token) {
 return NextResponse.json({ error: "Reset token is required" }, { status: 400 });
 }
 // Same minimum as registration (lib/auth.ts registerUser) — keep the two
 // password-setting paths consistent.
 if (newPassword.length < 6) {
 return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
 }

 const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
 const db = await getDb();

 // Atomically claim the token — $lte on expiresAt as a genuine BSON Date
 // (not the ISO-string convention used elsewhere) and usedAt: null in the
 // filter means a replayed/reused token can never claim twice, and two
 // concurrent submits of the same link can't both succeed.
 const claimed = await db.collection("password_reset_tokens").findOneAndUpdate(
 { tokenHash, usedAt: null, expiresAt: { $gt: new Date() } },
 { $set: { usedAt: new Date().toISOString() } }
 );
 if (!claimed) {
 return NextResponse.json({ error: "This reset link is invalid or has expired" }, { status: 400 });
 }

 const hashed = hashSync(newPassword, 12);
 await db.collection("users").updateOne(
 { _id: new ObjectId(claimed.userId) },
 { $set: { password: hashed } }
 );

 await revokeRefreshToken(claimed.userId);

 return NextResponse.json({ ok: true, message: "Password reset — you can now log in with your new password." });
 } catch (err) {
 console.error("[Auth Reset Error]", err);
 return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
 }
}
