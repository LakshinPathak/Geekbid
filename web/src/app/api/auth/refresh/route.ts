import { NextRequest, NextResponse } from "next/server";
import {
  getRefreshTokenFromRequest,
  refreshAccessToken,
  setRefreshCookie,
  clearRefreshCookie,
} from "@/lib/auth";

/**
 * POST /api/auth/refresh
 *
 * Uses the HttpOnly refresh token cookie to issue a new access + refresh token pair.
 * Implements token rotation: each refresh invalidates the old refresh token.
 * If stolen token reuse is detected, ALL tokens for that user are revoked.
 */
export async function POST(req: NextRequest) {
  try {
    const currentRefreshToken = getRefreshTokenFromRequest(req);

    if (!currentRefreshToken) {
      return NextResponse.json(
        { error: "No refresh token. Please login again." },
        { status: 401 }
      );
    }

    const result = await refreshAccessToken(currentRefreshToken);

    if ("error" in result) {
      // Clear the bad cookie
      const errorResponse = NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
      return clearRefreshCookie(errorResponse);
    }

    // Return new access token + rotate refresh token cookie
    const response = NextResponse.json({
      accessToken: result.accessToken,
      user: result.user,
      expiresIn: 900,
    });

    return setRefreshCookie(response, result.refreshToken);
  } catch (err) {
    console.error("[Refresh Error]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
