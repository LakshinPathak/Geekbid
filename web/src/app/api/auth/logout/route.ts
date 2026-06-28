import { NextRequest, NextResponse } from "next/server";
import {
 getRefreshTokenFromRequest,
 verifyRefreshToken,
 logoutUser,
 clearRefreshCookie,
} from "@/lib/auth";

/**
 * POST /api/auth/logout
 *
 * Revokes ALL refresh tokens for the user and clears the HttpOnly cookie.
 */
export async function POST(req: NextRequest) {
 try {
 const refreshToken = getRefreshTokenFromRequest(req);

 if (refreshToken) {
 const payload = await verifyRefreshToken(refreshToken);
 if (payload) {
 await logoutUser(payload.userId);
 }
 }

 const response = NextResponse.json({ ok: true, message: "Logged out successfully" });
 return clearRefreshCookie(response);
 } catch (err) {
 console.error("[Logout Error]", err);
 // Still clear the cookie even if there's an error
 const response = NextResponse.json({ ok: true });
 return clearRefreshCookie(response);
 }
}
