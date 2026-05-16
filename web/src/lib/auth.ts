import { getDb } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { hashSync, compareSync } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { ObjectId } from "mongodb";

// ─── Token Configuration ───────────────────────────────────────
const ACCESS_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET ?? "fallback-secret-not-for-production"
);
const REFRESH_SECRET = new TextEncoder().encode(
  (process.env.NEXTAUTH_SECRET ?? "fallback-secret") + "-refresh"
);

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
async function storeRefreshToken(userId: string, token: string) {
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
  name: string,
  email: string,
  password: string,
  role: string
) {
  const db = await getDb();
  const existing = await db.collection("users").findOne({ email });
  if (existing) return { error: "Email already registered" };

  if (password.length < 6) return { error: "Password must be at least 6 characters" };
  if (!["freelancer", "client", "admin"].includes(role)) {
    return { error: "Invalid role. Must be freelancer, client, or admin" };
  }

  const hashed = hashSync(password, 12);
  const user = {
    fullName: name.trim(),
    email: email.toLowerCase().trim(),
    password: hashed,
    role,
    avatarInitial: name
      .trim()
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2),
    geekScore: role === "freelancer" ? 100 : 0,
    skills: [],
    bio: "",
    isVerified: false,
    company: "",
    availability: "available",
    hourlyRateMin: 0,
    hourlyRateMax: 0,
    createdAt: new Date().toISOString(),
  };

  const result = await db.collection("users").insertOne(user);
  const userId = result.insertedId.toString();

  const { accessToken, refreshToken } = await createTokenPair(userId, role, user.email);
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

  // Check if user exists by email or googleId
  let user = await db
    .collection("users")
    .findOne({ $or: [{ email: email.toLowerCase() }, { googleId }] });

  if (user) {
    // Link Google ID if not already linked
    if (!user.googleId) {
      await db.collection("users").updateOne(
        { _id: user._id },
        { $set: { googleId, avatarUrl: avatarUrl || user.avatarUrl } }
      );
    }
  } else {
    // Create new user from Google profile
    const newUser = {
      fullName: name.trim(),
      email: email.toLowerCase().trim(),
      password: null, // No password for OAuth users
      googleId,
      avatarUrl: avatarUrl || "",
      role: ["freelancer", "client", "admin"].includes(role) ? role : "freelancer",
      avatarInitial: name
        .trim()
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
      geekScore: role === "freelancer" ? 100 : 0,
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

  return { accessToken, refreshToken, user: safeUser };
}

// ─── User Login ────────────────────────────────────────────────
export async function loginUser(email: string, password: string) {
  const db = await getDb();
  const user = await db
    .collection("users")
    .findOne({ email: email.toLowerCase().trim() });
  if (!user) return { error: "Invalid email or password" };
  if (!compareSync(password, user.password))
    return { error: "Invalid email or password" };

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
