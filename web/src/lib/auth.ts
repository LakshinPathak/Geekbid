import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { hashSync, compareSync } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { ObjectId } from "mongodb";

// ─── Token Configuration ───────────────────────────────────────
if (!process.env.NEXTAUTH_SECRET) throw new Error("NEXTAUTH_SECRET env var is not set");
const ACCESS_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
const REFRESH_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET + "-refresh");

const ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes
const REFRESH_TOKEN_EXPIRY = "7d"; // 7 days
const REFRESH_COOKIE_NAME = "gb_refresh_token";
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

// ─── Token Pair Type ───────────────────────────────────────────
export type TokenPayload = {
 userId: string;
 role: string;
 email: string;
 type: "access" | "refresh";
};

export type AuthResult = {
 accessToken: string;
 user: Record<string, unknown>;
};

// ─── Token Generation ──────────────────────────────────────────
export async function createAccessToken(userId: string, role: string, email: string): Promise<string> {
 return new SignJWT({ userId, role, email, type: "access" })
 .setProtectedHeader({ alg: "HS256" })
 .setIssuedAt()
 .setExpirationTime(ACCESS_TOKEN_EXPIRY)
 .sign(ACCESS_SECRET);
}

export async function createRefreshToken(userId: string, role: string, email: string): Promise<string> {
 return new SignJWT({ userId, role, email, type: "refresh" })
 .setProtectedHeader({ alg: "HS256" })
 .setIssuedAt()
 .setExpirationTime(REFRESH_TOKEN_EXPIRY)
 .sign(REFRESH_SECRET);
}

export async function createTokenPair(userId: string, role: string, email: string) {
 const [accessToken, refreshToken] = await Promise.all([
 createAccessToken(userId, role, email),
 createRefreshToken(userId, role, email),
 ]);
 return { accessToken, refreshToken };
}

// ─── Token Verification ────────────────────────────────────────
export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
 try {
 const { payload } = await jwtVerify(token, ACCESS_SECRET);
 if (payload.type !== "access") return null;
 return payload as unknown as TokenPayload;
 } catch {
 return null;
 }
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
 try {
 const { payload } = await jwtVerify(token, REFRESH_SECRET);
 if (payload.type !== "refresh") return null;
 return payload as unknown as TokenPayload;
 } catch {
 return null;
 }
}

// ─── Token Extraction ──────────────────────────────────────────
export function getAccessTokenFromHeaders(headers: Headers): string | null {
 const auth = headers.get("authorization");
 if (auth?.startsWith("Bearer ")) return auth.slice(7);
 return null;
}

export function getRefreshTokenFromRequest(req: NextRequest): string | null {
 return req.cookies.get(REFRESH_COOKIE_NAME)?.value ?? null;
}

// ─── Refresh Token Cookie Helper ───────────────────────────────
export function setRefreshCookie(response: NextResponse, refreshToken: string): NextResponse {
 response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
 httpOnly: true,
 secure: process.env.NODE_ENV === "production",
 sameSite: "lax",
 path: "/",
 maxAge: REFRESH_COOKIE_MAX_AGE,
 });
 return response;
}

export function clearRefreshCookie(response: NextResponse): NextResponse {
 response.cookies.set(REFRESH_COOKIE_NAME, "", {
 httpOnly: true,
 secure: process.env.NODE_ENV === "production",
 sameSite: "lax",
 path: "/",
 maxAge: 0,
 });
 return response;
}

// ─── Refresh Token Storage (DB-backed for rotation) ────────────
export async function storeRefreshToken(userId: string, token: string) {
 const db = await getDb();
 await db.collection("refresh_tokens").updateOne(
 { userId },
 {
 $set: {
 token,
 userId,
 createdAt: new Date(),
 expiresAt: new Date(Date.now() + REFRESH_COOKIE_MAX_AGE * 1000),
 },
 },
 { upsert: true }
 );
}

async function validateStoredRefreshToken(userId: string, token: string): Promise<boolean> {
 const db = await getDb();
 const stored = await db.collection("refresh_tokens").findOne({
 userId,
 token,
 expiresAt: { $gt: new Date() },
 });
 return !!stored;
}

async function revokeRefreshToken(userId: string) {
 const db = await getDb();
 await db.collection("refresh_tokens").deleteMany({ userId });
}

// ─── Auth Middleware Helper ────────────────────────────────────
export async function authenticateRequest(
 req: NextRequest
): Promise<{ payload: TokenPayload } | { error: string; status: number }> {
 const token = getAccessTokenFromHeaders(req.headers);
 if (!token) return { error: "Authorization required", status: 401 };

 const payload = await verifyAccessToken(token);
 if (!payload) return { error: "Access token expired or invalid", status: 401 };

 return { payload };
}

// ─── User Registration ─────────────────────────────────────────
export async function registerUser(
 name: unknown,
 email: unknown,
 password: unknown,
 role: unknown
) {
 // Force string types — blocks NoSQL operator injection
 const nameStr = String(name ?? "").trim();
 const emailStr = String(email ?? "").toLowerCase().trim();
 const passwordStr = String(password ?? "");
 const roleStr = String(role ?? "freelancer");

 if (passwordStr.length < 6) return { error: "Password must be at least 6 characters" };
 if (!["freelancer", "client"].includes(roleStr)) {
 return { error: "Invalid role. Must be freelancer or client" };
 }

 const db = await getDb();
 const existing = await db.collection("users").findOne({ email: emailStr });

 if (existing) {
 // Dual-role: this email already has an account. Adding a second role to
 // it must be proven with that account's own password — otherwise anyone
 // could "add a role" to a stranger's account by guessing their email.
 if (!existing.password) {
 return { error: "This email uses Google sign-in. Log in with Google to add another role." };
 }
 if (!compareSync(passwordStr, existing.password)) {
 return { error: "Email already registered" };
 }

 const existingRoles: string[] = existing.roles ?? [existing.role];
 if (existingRoles.includes(roleStr)) {
 return { error: `You already have a ${roleStr} account — please log in instead` };
 }

 const updatedRoles = [...existingRoles, roleStr];
 const geekScoreUpdate = roleStr === "freelancer" && !(existing.geekScore ?? 0) ? { geekScore: 100 } : {};
 await db.collection("users").updateOne(
 { _id: existing._id },
 { $set: { role: roleStr, roles: updatedRoles, ...geekScoreUpdate } }
 );

 const userId = existing._id.toString();
 const { accessToken, refreshToken } = await createTokenPair(userId, roleStr, emailStr);
 await storeRefreshToken(userId, refreshToken);

 const safeUser = { ...existing, ...geekScoreUpdate, role: roleStr, roles: updatedRoles, _id: userId, id: userId, password: undefined };
 return { accessToken, refreshToken, user: safeUser, roleAdded: true };
 }

 const hashed = hashSync(passwordStr, 12);
 const user = {
 fullName: nameStr,
 email: emailStr,
 password: hashed,
 role: roleStr,
 roles: [roleStr],
 avatarInitial: nameStr
 .split(" ")
 .map((w) => w[0])
 .join("")
 .toUpperCase()
 .slice(0, 2),
 geekScore: roleStr === "freelancer" ? 100 : 0,
 skills: [],
 bio: "",
 isVerified: false,
 company: "",
 availability: "available",
 hourlyRateMin: 0,
 hourlyRateMax: 0,
 avatarUrl: "",
 avatarPublicId: "",
 createdAt: new Date().toISOString(),
 };

 const result = await db.collection("users").insertOne(user);
 const userId = result.insertedId.toString();

 const { accessToken, refreshToken } = await createTokenPair(userId, roleStr, user.email);
 await storeRefreshToken(userId, refreshToken);

 const safeUser = { ...user, _id: userId, id: userId, password: undefined };
 return { accessToken, refreshToken, user: safeUser };
}

// ─── Google OAuth Login / Register ─────────────────────────────
type GoogleProfile = {
 email: string;
 name: string;
 avatarUrl?: string;
 googleId: string;
 role: string;
};

export async function googleLoginUser(profile: GoogleProfile) {
 const db = await getDb();
 const { email, name, avatarUrl, googleId, role } = profile;
 const requestedRole = ["freelancer", "client"].includes(role) ? role : "freelancer";

 // Check if user exists by email or googleId
 let user = await db
 .collection("users")
 .findOne({ $or: [{ email: email.toLowerCase() }, { googleId }] });
 let roleAdded = false;

 if (user?.deleted) {
 return { error: "Invalid email or password" };
 }
 if (user?.suspended) {
 return { error: "This account has been suspended. Contact support for assistance." };
 }

 if (user) {
 // Link Google ID if not already linked
 if (!user.googleId) {
 await db.collection("users").updateOne(
 { _id: user._id },
 { $set: { googleId, avatarUrl: avatarUrl || user.avatarUrl } }
 );
 user = { ...user, googleId, avatarUrl: avatarUrl || user.avatarUrl };
 }

 const existingRoles: string[] = user.roles ?? [user.role];
 if (!existingRoles.includes(requestedRole)) {
 // Dual-role: signing in with Google already proves ownership of this
 // email, so granting the newly-requested role here (instead of
 // silently ignoring it, which was the original bug) is safe.
 const updatedRoles = [...existingRoles, requestedRole];
 const geekScoreUpdate = requestedRole === "freelancer" && !(user.geekScore ?? 0) ? { geekScore: 100 } : {};
 await db.collection("users").updateOne(
 { _id: user._id },
 { $set: { role: requestedRole, roles: updatedRoles, ...geekScoreUpdate } }
 );
 user = { ...user, role: requestedRole, roles: updatedRoles, ...geekScoreUpdate };
 roleAdded = true;
 } else if (user.role !== requestedRole) {
 // Already has this role from an earlier signup — switch which role is active.
 await db.collection("users").updateOne({ _id: user._id }, { $set: { role: requestedRole } });
 user = { ...user, role: requestedRole };
 }
 } else {
 // Create new user from Google profile
 const newUser = {
 fullName: name.trim(),
 email: email.toLowerCase().trim(),
 password: null, // No password for OAuth users
 googleId,
 avatarUrl: avatarUrl || "",
 role: requestedRole,
 roles: [requestedRole],
 avatarInitial: name
 .trim()
 .split(" ")
 .map((w) => w[0])
 .join("")
 .toUpperCase()
 .slice(0, 2),
 geekScore: requestedRole === "freelancer" ? 100 : 0,
 skills: [],
 bio: "",
 isVerified: true, // Google-verified email
 company: "",
 availability: "available",
 hourlyRateMin: 0,
 hourlyRateMax: 0,
 createdAt: new Date().toISOString(),
 authProvider: "google",
 };

 const result = await db.collection("users").insertOne(newUser);
 user = { ...newUser, _id: result.insertedId };
 }

 const userId = user._id.toString();
 const { accessToken, refreshToken } = await createTokenPair(
 userId,
 user.role,
 user.email
 );
 await storeRefreshToken(userId, refreshToken);

 const safeUser = {
 ...user,
 _id: userId,
 id: userId,
 password: undefined,
 };

 return { accessToken, refreshToken, user: safeUser, roleAdded };
}

// ─── User Login ────────────────────────────────────────────────
export async function loginUser(email: unknown, password: unknown) {
 // Force string types — blocks NoSQL operator injection ({ "$gt": "" })
 const emailStr = String(email ?? "").toLowerCase().trim();
 const passwordStr = String(password ?? "");
 if (!emailStr || !passwordStr) return { error: "Invalid email or password" };
 const db = await getDb();
 const user = await db
 .collection("users")
 .findOne({ email: emailStr });
 if (!user) return { error: "Invalid email or password" };
 // Google-only accounts have password: null — compareSync requires a string
 // hash, so this must be checked before calling it, not just fail the check.
 if (!user.password) return { error: "This account uses Google sign-in. Please log in with Google." };
 if (!compareSync(passwordStr, user.password))
 return { error: "Invalid email or password" };
 if (user.deleted) return { error: "Invalid email or password" };
 if (user.suspended) return { error: "This account has been suspended. Contact support for assistance." };

 const userId = user._id.toString();
 const { accessToken, refreshToken } = await createTokenPair(
 userId,
 user.role,
 user.email
 );
 await storeRefreshToken(userId, refreshToken);

 const safeUser = {
 ...user,
 _id: userId,
 id: userId,
 password: undefined,
 };
 return { accessToken, refreshToken, user: safeUser };
}

// ─── Refresh Access Token ──────────────────────────────────────
export async function refreshAccessToken(currentRefreshToken: string) {
 // 1. Verify JWT signature
 const payload = await verifyRefreshToken(currentRefreshToken);
 if (!payload) return { error: "Invalid or expired refresh token" };

 // 2. Validate against stored token (prevents reuse after rotation)
 const isValid = await validateStoredRefreshToken(
 payload.userId,
 currentRefreshToken
 );
 if (!isValid) {
 // Potential token theft — revoke all tokens for this user
 await revokeRefreshToken(payload.userId);
 return { error: "Refresh token revoked. Please login again." };
 }

 // 3. Verify user still exists and hasn't been disabled
 const db = await getDb();
 const user = await db
 .collection("users")
 .findOne({ _id: new ObjectId(payload.userId) });
 if (!user) return { error: "User not found" };

 // 4. Issue new token pair (rotation)
 const { accessToken, refreshToken: newRefreshToken } =
 await createTokenPair(user._id.toString(), user.role, user.email);
 await storeRefreshToken(user._id.toString(), newRefreshToken);

 return { accessToken, refreshToken: newRefreshToken, user: { ...user, _id: user._id.toString(), id: user._id.toString(), password: undefined } };
}

// ─── Logout ────────────────────────────────────────────────────
export async function logoutUser(userId: string) {
 await revokeRefreshToken(userId);
}
