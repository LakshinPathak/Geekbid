import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { hashSync, compareSync } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { ObjectId } from "mongodb";
import crypto from "crypto";

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
 // Only set on refresh tokens — identifies one logged-in device/browser so
 // concurrent sessions get their own stored-token slot (see storeRefreshToken).
 sessionId?: string;
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

export async function createRefreshToken(userId: string, role: string, email: string, sessionId: string): Promise<string> {
 return new SignJWT({ userId, role, email, type: "refresh", sessionId })
 .setProtectedHeader({ alg: "HS256" })
 .setIssuedAt()
 .setExpirationTime(REFRESH_TOKEN_EXPIRY)
 .sign(REFRESH_SECRET);
}

// sessionId identifies one logged-in device/browser. Defaults to a fresh
// random id (new login/register/switch-role); refresh-token rotation passes
// the existing session's id through so rotating doesn't collide with (or
// evict) a different device's session — see storeRefreshToken.
export async function createTokenPair(userId: string, role: string, email: string, sessionId: string = crypto.randomBytes(16).toString("hex")) {
 const [accessToken, refreshToken] = await Promise.all([
 createAccessToken(userId, role, email),
 createRefreshToken(userId, role, email, sessionId),
 ]);
 return { accessToken, refreshToken, sessionId };
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
// Keyed by {userId, sessionId} — one slot per logged-in device, not one slot
// per user — so a second device's login/rotation doesn't overwrite (and
// falsely theft-flag) a different device's still-valid session.
export async function storeRefreshToken(userId: string, token: string, sessionId: string) {
 const db = await getDb();
 await db.collection("refresh_tokens").updateOne(
 { userId, sessionId },
 {
 $set: {
 token,
 userId,
 sessionId,
 createdAt: new Date(),
 expiresAt: new Date(Date.now() + REFRESH_COOKIE_MAX_AGE * 1000),
 },
 },
 { upsert: true }
 );
}

// Atomically validates the presented refresh token against the stored one
// AND rotates it to the new token in a single findOneAndUpdate, instead of
// the separate validate-then-store steps refreshAccessToken used to do.
//
// Why that mattered: two refresh requests racing in with the *same* old
// refresh token (routine in an SPA — e.g. several tabs, or several
// in-flight API calls that all 401 near-simultaneously and each trigger
// their own refresh) would both pass a separate read-only validate step
// before either had written its rotation, so both would proceed to mint
// and store a new token pair. The second write silently clobbered the
// first (last-write-wins on the same {userId,sessionId} document), so one
// caller walked away with a "successful" response holding a refresh token
// that was never actually persisted — its next refresh attempt would look
// exactly like token theft and revoke every session for that user.
// Folding validate+rotate into one findOneAndUpdate makes only one of the
// two racing requests able to consume the old token; the loser gets a
// clean "already rotated" signal instead of a phantom success.
async function rotateStoredRefreshToken(
 userId: string,
 oldToken: string,
 newToken: string,
 sessionId: string,
 expiresAt: Date,
 matchSessionId: boolean
): Promise<boolean> {
 const db = await getDb();
 // matchSessionId is false only for refresh tokens minted before the
 // sessionId claim existed — falls back to the old userId+token-only
 // lookup for those. Always $set sessionId going forward so the very next
 // rotation for this row is on the new, precise key.
 const filter: Record<string, unknown> = { userId, token: oldToken, expiresAt: { $gt: new Date() } };
 if (matchSessionId) filter.sessionId = sessionId;
 const result = await db.collection("refresh_tokens").findOneAndUpdate(
 filter,
 { $set: { token: newToken, sessionId, createdAt: new Date(), expiresAt } }
 );
 return !!result;
}

export async function revokeRefreshToken(userId: string) {
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

 // Suspend/delete was previously only enforced at login/refresh/switch-role
 // — a suspended or deleted user's still-valid access token kept working
 // for up to its full ~15-minute lifetime on every other route. This is a
 // projection-only point lookup on an indexed _id (cheap relative to the
 // several other DB round trips most authenticated routes already make),
 // not a full user fetch.
 try {
 const db = await getDb();
 const user = await db.collection("users").findOne(
 { _id: new ObjectId(payload.userId) },
 { projection: { suspended: 1, deleted: 1 } }
 );
 if (user?.deleted) return { error: "Account no longer exists", status: 401 };
 if (user?.suspended) return { error: "Account suspended", status: 403 };
 } catch (err) {
 // Fail open on an unexpected DB error here — a transient lookup failure
 // must not lock every authenticated user out of the app; the JWT itself
 // has already been cryptographically verified above.
 console.error("[authenticateRequest] suspend/delete check failed:", err);
 }

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
 // Unlike loginUser/googleLoginUser, this dual-role path never checked
 // suspended/deleted status — a suspended or soft-deleted user who knew
 // their own password could bypass the suspension entirely by "adding" a
 // role they didn't already have, minting a fresh valid token pair here.
 if (existing.deleted) {
 return { error: "Email already registered" };
 }
 if (existing.suspended) {
 return { error: "This account has been suspended. Contact support for assistance." };
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
 const { accessToken, refreshToken, sessionId } = await createTokenPair(userId, roleStr, emailStr);
 await storeRefreshToken(userId, refreshToken, sessionId);

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

 const { accessToken, refreshToken, sessionId } = await createTokenPair(userId, roleStr, user.email);
 await storeRefreshToken(userId, refreshToken, sessionId);

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
 // "register" = the signup tab explicitly asked for this role (apply it,
 // adding/switching as needed, same as before). "login" = the login tab —
 // an existing user must be logged into their account as-is; the role
 // param here is just Google's default and must never add or switch roles
 // on a plain login.
 intent?: "login" | "register";
};

export async function googleLoginUser(profile: GoogleProfile) {
 const db = await getDb();
 const { email, name, avatarUrl, googleId, role, intent = "login" } = profile;
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

 // Maintenance mode and registration-open were only ever enforced on the
 // email/password path (in api/auth/route.ts) — the Google OAuth path
 // called this function directly and bypassed both checks entirely.
 // New Google signups can never be admin (requestedRole is always
 // freelancer/client), so maintenance mode always blocks them; existing
 // users are exempt only if they're already admin, same as the
 // email/password path.
 const platformConfig = await db.collection("platform_config").findOne({ key: "platform_config" });
 if (platformConfig?.maintenanceMode && (!user || user.role !== "admin")) {
 return { error: "GeekBid is currently undergoing maintenance. Please check back shortly." };
 }
 if (!user && platformConfig?.registrationOpen === false) {
 return { error: "New registrations are currently closed. Please check back later." };
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

 // "Continue with Google" on the plain login tab always sent role= (default
 // freelancer), so an existing client logging in could silently gain a
 // freelancer role or have their active role switched. Only the signup tab
 // (intent: "register") is allowed to add/switch roles for an existing
 // account — a bare login must leave the account exactly as it was.
 if (intent === "register") {
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
 const { accessToken, refreshToken, sessionId } = await createTokenPair(
 userId,
 user.role,
 user.email
 );
 await storeRefreshToken(userId, refreshToken, sessionId);

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
 const { accessToken, refreshToken, sessionId } = await createTokenPair(
 userId,
 user.role,
 user.email
 );
 await storeRefreshToken(userId, refreshToken, sessionId);

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

 // 2. Verify user still exists and hasn't been disabled
 const db = await getDb();
 const user = await db
 .collection("users")
 .findOne({ _id: new ObjectId(payload.userId) });
 if (!user) return { error: "User not found" };
 // Suspending/deleting a user must actually end their session, not just
 // block future logins — otherwise an already-issued refresh token keeps
 // renewing a valid access token for up to its own 7-day lifetime.
 if (user.deleted) {
 await revokeRefreshToken(payload.userId);
 return { error: "Invalid or expired refresh token" };
 }
 if (user.suspended) {
 await revokeRefreshToken(payload.userId);
 return { error: "This account has been suspended. Contact support for assistance." };
 }

 // 3. Issue new token pair (rotation) — reuse the same sessionId so
 // rotating a device's token updates that device's own stored slot
 // instead of colliding with (or being collided into by) another device.
 const sessionId = payload.sessionId ?? crypto.randomBytes(16).toString("hex");
 const { accessToken, refreshToken: newRefreshToken } =
 await createTokenPair(user._id.toString(), user.role, user.email, sessionId);

 // 4. Atomically validate the presented token against the stored one AND
 // rotate it to the new one in the same DB operation (prevents reuse after
 // rotation). This used to be two separate steps — a read-only validate
 // followed later by a write — which left a window where two refresh
 // requests racing in with the same still-valid old token (routine in an
 // SPA: multiple tabs, or several in-flight calls that 401 together and
 // each trigger their own refresh) could both pass validation before
 // either had rotated, so both would mint a token pair and the second
 // store would silently clobber the first. Folding it into one
 // findOneAndUpdate means only one racing request can consume the old
 // token; the other cleanly fails here instead of handing out a refresh
 // token that was never actually persisted.
 const expiresAt = new Date(Date.now() + REFRESH_COOKIE_MAX_AGE * 1000);
 const rotated = await rotateStoredRefreshToken(
 user._id.toString(),
 currentRefreshToken,
 newRefreshToken,
 sessionId,
 expiresAt,
 !!payload.sessionId
 );
 if (!rotated) {
 // Potential token theft (or a losing race) — revoke all tokens for this user
 await revokeRefreshToken(payload.userId);
 return { error: "Refresh token revoked. Please login again." };
 }

 return { accessToken, refreshToken: newRefreshToken, user: { ...user, _id: user._id.toString(), id: user._id.toString(), password: undefined } };
}

// ─── Logout ────────────────────────────────────────────────────
export async function logoutUser(userId: string) {
 await revokeRefreshToken(userId);
}
