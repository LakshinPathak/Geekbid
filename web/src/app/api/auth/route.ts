import { NextRequest, NextResponse } from "next/server";
import { registerUser, loginUser, setRefreshCookie } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { sendWelcomeEmail, sendReferralSignupEmail } from "@/lib/email";
import { checkRateLimit, getClientIp, sanitizeString } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
 try {
 // Rate limit: 10 login/register attempts per IP per 15 minutes
 const ip = getClientIp(req);
 if (!(await checkRateLimit(`auth:${ip}`, 10, 15 * 60 * 1000))) {
 return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
 }

 const body = await req.json();
 const action = sanitizeString(body.action);
 const { name, email, password, role, referralCode } = body;

 // ─── REGISTER ────────────────────────────────────────────
 if (action === "register") {
 if (!name || !email || !password) {
 return NextResponse.json(
 { error: "Name, email, and password are required" },
 { status: 400 }
 );
 }

 const result = await registerUser(
 name,
 email,
 password,
 role ?? "freelancer"
 );

 if ("error" in result) {
 return NextResponse.json(
 { error: result.error },
 { status: 400 }
 );
 }

 const userId = (result.user as Record<string, unknown>)?.id as string | undefined;

 // Fire-and-forget welcome email
 sendWelcomeEmail(email, name, role ?? "freelancer", userId).catch(() => {});

 // Track referral if code provided
 if (referralCode && result.user) {
 const db = await getDb();
 const referrer = await db.collection("users").findOne({ referralCode });
 if (referrer) {
 const userId = (result.user as Record<string, unknown>).id as string;
 await db.collection("referrals").insertOne({
 referrerUserId: referrer._id.toString(),
 referredUserId: userId,
 referralCode,
 status: "signed_up",
 creditAmount: 0,
 createdAt: new Date().toISOString(),
 });
 await db.collection("users").updateOne(
 { _id: (await import("mongodb")).ObjectId.createFromHexString(userId) },
 { $set: { referredBy: referralCode } }
 );
 // Fire-and-forget referral notification to referrer
 if (referrer.email) {
 sendReferralSignupEmail(referrer.email, referrer.fullName ?? referrer.name ?? "User", name).catch(() => {});
 }
 }
 }

 const response = NextResponse.json({
 accessToken: result.accessToken,
 user: result.user,
 expiresIn: 900,
 });

 return setRefreshCookie(response, result.refreshToken);
 }

 // ─── LOGIN ───────────────────────────────────────────────
 if (action === "login") {
 if (!email || !password) {
 return NextResponse.json(
 { error: "Email and password are required" },
 { status: 400 }
 );
 }

 const result = await loginUser(email, password);

 if ("error" in result) {
 return NextResponse.json(
 { error: result.error },
 { status: 401 }
 );
 }

 // Maintenance Mode blocks all logins except admins — otherwise nobody
 // could sign back in to turn it off from the admin panel.
 const userRole = (result.user as Record<string, unknown>)?.role;
 if (userRole !== "admin") {
 const db = await getDb();
 const config = await db.collection("platform_config").findOne({ key: "platform_config" });
 if (config?.maintenanceMode) {
 return NextResponse.json(
 { error: "GeekBid is currently undergoing maintenance. Please check back shortly." },
 { status: 503 }
 );
 }
 }

 const response = NextResponse.json({
 accessToken: result.accessToken,
 user: result.user,
 expiresIn: 900,
 });

 return setRefreshCookie(response, result.refreshToken);
 }

 return NextResponse.json(
 { error: "Invalid action. Use 'register' or 'login'" },
 { status: 400 }
 );
 } catch (err) {
 console.error("[Auth Error]", err);
 return NextResponse.json(
 { error: "Internal server error" },
 { status: 500 }
 );
 }
}
