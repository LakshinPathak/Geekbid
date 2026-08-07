import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { sendPasswordResetEmail } from "@/lib/email";
import { sanitizeString, checkRateLimit, getClientIp } from "@/lib/sanitize";
import crypto from "crypto";

const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// POST /api/auth/forgot — { email } → always 200, regardless of whether the
// email is registered (an error response here would let an attacker enumerate
// which emails have GeekBid accounts). If the account exists, has a password
// (not a Google-only signup), and isn't deleted/suspended, emails a one-time
// reset link.
export async function POST(req: NextRequest) {
 try {
 const ip = getClientIp(req);
 if (!(await checkRateLimit(`forgot-password:${ip}`, 5, 15 * 60 * 1000))) {
 return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
 }

 const body = await req.json();
 const email = sanitizeString(body.email).toLowerCase();
 if (!email) {
 return NextResponse.json({ error: "Email is required" }, { status: 400 });
 }

 const db = await getDb();
 const user = await db.collection("users").findOne({ email });

 if (user && user.password && !user.deleted && !user.suspended) {
 const rawToken = crypto.randomBytes(32).toString("hex");
 // A reset token is a high-entropy random value (not a low-entropy
 // secret like a password), so a fast SHA-256 hash is the right tool
 // here — bcrypt's deliberate slowness exists to blunt brute-forcing a
 // guessable password, which doesn't apply to a 256-bit random token.
 const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
 const now = new Date();

 await db.collection("password_reset_tokens").insertOne({
 userId: user._id.toString(),
 tokenHash,
 expiresAt: new Date(now.getTime() + TOKEN_TTL_MS),
 usedAt: null,
 createdAt: now.toISOString(),
 });

 const resetUrl = `${APP_URL}/reset-password?token=${rawToken}`;
 sendPasswordResetEmail(
 user.email,
 user.fullName ?? "there",
 resetUrl,
 tokenHash,
 user._id.toString()
 ).catch((err) => console.error("[Password Reset Email Failed]", err));
 }

 return NextResponse.json({
 ok: true,
 message: "If that email is registered, a reset link has been sent.",
 });
 } catch (err) {
 console.error("[Auth Forgot Error]", err);
 return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
 }
}
