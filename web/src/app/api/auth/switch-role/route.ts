import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest, createTokenPair, storeRefreshToken, setRefreshCookie } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/sanitize";
import { ObjectId } from "mongodb";

/**
 * POST /api/auth/switch-role
 *
 * For an account that holds more than one role (see registerUser/googleLoginUser
 * dual-role handling in lib/auth.ts), flips which role is currently active and
 * mints a fresh token pair for it — the JWT bakes `role` in at sign-time, so
 * switching roles requires a new token, not just a DB update.
 */
export async function POST(req: NextRequest) {
 try {
 const ip = getClientIp(req);
 if (!(await checkRateLimit(`switch-role:${ip}`, 20, 15 * 60 * 1000))) {
 return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
 }

 const auth = await authenticateRequest(req);
 if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

 const { role } = await req.json();
 const roleStr = String(role ?? "");
 if (!["freelancer", "client"].includes(roleStr)) {
 return NextResponse.json({ error: "Invalid role" }, { status: 400 });
 }

 const db = await getDb();
 const user = await db.collection("users").findOne({ _id: new ObjectId(auth.payload.userId) });
 if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
 // A still-valid access token must not be able to mint a fresh token pair
 // for a suspended/deleted account — same gap already closed on login and
 // refresh.
 if (user.deleted) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
 if (user.suspended) return NextResponse.json({ error: "This account has been suspended. Contact support for assistance." }, { status: 401 });

 const roles: string[] = user.roles ?? [user.role];
 if (!roles.includes(roleStr)) {
 return NextResponse.json({ error: `You don't have a ${roleStr} role on this account yet` }, { status: 403 });
 }

 if (user.role !== roleStr) {
 await db.collection("users").updateOne({ _id: user._id }, { $set: { role: roleStr } });
 }

 const userId = user._id.toString();
 const { accessToken, refreshToken, sessionId } = await createTokenPair(userId, roleStr, user.email);
 await storeRefreshToken(userId, refreshToken, sessionId);

 const safeUser = { ...user, role: roleStr, roles, _id: userId, id: userId, password: undefined };
 const response = NextResponse.json({ accessToken, user: safeUser, expiresIn: 900 });
 return setRefreshCookie(response, refreshToken);
 } catch (err) {
 console.error("[Switch Role Error]", err);
 return NextResponse.json({ error: "Internal server error" }, { status: 500 });
 }
}
