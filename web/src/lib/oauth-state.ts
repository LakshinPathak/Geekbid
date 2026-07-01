import crypto from "crypto";
import { NextResponse } from "next/server";

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
// (browser history, proxy logs, Referer headers). In-memory is fine for a
// single-instance deployment — same tradeoff already made for rate limiting.
type ExchangePayload = {
  accessToken: string;
  user: unknown;
  expiresIn: number;
  createdAt: number;
};

const EXCHANGE_TTL_MS = 60 * 1000; // one-time code is only valid for 60s
const exchangeStore = new Map<string, ExchangePayload>();

function sweepExpired() {
  const now = Date.now();
  for (const [code, payload] of exchangeStore) {
    if (now - payload.createdAt > EXCHANGE_TTL_MS) exchangeStore.delete(code);
  }
}

export function createExchangeCode(accessToken: string, user: unknown, expiresIn: number): string {
  sweepExpired();
  const code = crypto.randomBytes(32).toString("hex");
  exchangeStore.set(code, { accessToken, user, expiresIn, createdAt: Date.now() });
  return code;
}

export function consumeExchangeCode(code: string): { accessToken: string; user: unknown; expiresIn: number } | null {
  sweepExpired();
  const payload = exchangeStore.get(code);
  if (!payload) return null;
  exchangeStore.delete(code); // one-time use
  if (Date.now() - payload.createdAt > EXCHANGE_TTL_MS) return null;
  return payload;
}
