import { NextRequest, NextResponse } from "next/server";
import { consumeExchangeCode } from "@/lib/oauth-state";

/**
 * POST /api/auth/google/exchange
 *
 * Redeems the one-time code handed back by the Google OAuth callback for the
 * actual access token + user object. The code is single-use and expires
 * within 60s, so it's safe to have briefly touched the redirect URL — unlike
 * the access token itself, it's useless to anyone who only sees browser
 * history or a server log after the fact.
 */
export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "code is required" }, { status: 400 });
    }

    const payload = consumeExchangeCode(code);
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired exchange code" }, { status: 400 });
    }

    return NextResponse.json({
      accessToken: payload.accessToken,
      user: payload.user,
      expiresIn: payload.expiresIn,
    });
  } catch (err) {
    console.error("[Google Exchange Error]", err);
    return NextResponse.json({ error: "Failed to exchange code" }, { status: 500 });
  }
}
