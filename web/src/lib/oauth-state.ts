import crypto from "crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

// ─── CSRF state cookie for the Google OAuth flow ──────────────────
const OAUTH_STATE_COOKIE = "gb_oauth_state";
const OAUTH_STATE_MAX_AGE = 5 * 60; // 5 minutes — just long enough for the redirect round-trip

export function generateOAuthNonce(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function setOAuthStateCookie(response: NextResponse, nonce: string): NextResponse {
  response.cookies.set(OAUTH_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_STATE_MAX_AGE,
  });
  return response;
}

export function clearOAuthStateCookie(response: NextResponse): NextResponse {
  response.cookies.set(OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export { OAUTH_STATE_COOKIE };

// ─── One-time exchange codes for handing off the OAuth login result ──
// Avoids ever putting the access token / user JSON in a URL query string
// (browser history, proxy logs, Referer headers).
//
// This MUST be backed by shared storage (Mongo), not an in-process Map — on
// Vercel, the callback route (which creates the code) and the exchange route
// (which redeems it, called moments later from the browser) are independent
// serverless invocations that can run on completely different underlying
// instances. An in-memory Map is only visible within the instance that
// created it, so the exchange route would almost always fail to find a code
// that was, in fact, just issued — surfacing to the user as "Failed to
// process Google login" despite Google's side of the flow having succeeded.
// This only ever worked in local dev because `next dev` is one long-lived
// process. Mongo is already shared across every instance, so it closes this
// gap the same way the distributed rate limiter (lib/rate-limit.ts) does.
type ExchangePayload = {
  accessToken: string;
  user: unknown;
  expiresIn: number;
  roleAdded?: boolean;
};

const EXCHANGE_TTL_MS = 60 * 1000; // one-time code is only valid for 60s

export async function createExchangeCode(accessToken: string, user: unknown, expiresIn: number, roleAdded?: boolean): Promise<string> {
  const code = crypto.randomBytes(32).toString("hex");
  const db = await getDb();
  await db.collection("oauth_exchange_codes").insertOne({
    code,
    accessToken,
    user,
    expiresIn,
    roleAdded: roleAdded ?? false,
    createdAt: new Date(),
  });
  return code;
}

export async function consumeExchangeCode(code: string): Promise<ExchangePayload | null> {
  const db = await getDb();
  const cutoff = new Date(Date.now() - EXCHANGE_TTL_MS);
  // findOneAndDelete makes the expiry check and one-time consumption atomic —
  // two near-simultaneous redemption attempts can't both succeed.
  const doc = await db.collection("oauth_exchange_codes").findOneAndDelete({
    code,
    createdAt: { $gte: cutoff },
  });
  if (!doc) return null;
  return {
    accessToken: doc.accessToken,
    user: doc.user,
    expiresIn: doc.expiresIn,
    roleAdded: doc.roleAdded,
  };
}
