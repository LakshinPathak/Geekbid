import { NextRequest, NextResponse } from "next/server";
import { googleLoginUser, setRefreshCookie } from "@/lib/auth";
import { OAUTH_STATE_COOKIE, clearOAuthStateCookie, createExchangeCode } from "@/lib/oauth-state";

/**
 * GET /api/auth/google/callback
 *
 * Handles the OAuth callback from Google:
 * 1. Validates the CSRF state nonce against the cookie set when the flow started
 * 2. Exchanges the authorization code for tokens
 * 3. Fetches user profile from Google
 * 4. Creates or finds the user in our DB
 * 5. Issues our own JWT access + refresh token pair
 * 6. Redirects to /login with a one-time exchange code (never the token itself)
 */
export async function GET(req: NextRequest) {
 try {
 const { searchParams } = new URL(req.url);
 const code = searchParams.get("code");
 const state = searchParams.get("state") || "";
 const [nonce, role = "freelancer"] = state.split(".");
 const errorParam = searchParams.get("error");

 if (errorParam) {
 return NextResponse.redirect(
 `${process.env.NEXTAUTH_URL}/login?error=google_denied`
 );
 }

 if (!code) {
 return NextResponse.redirect(
 `${process.env.NEXTAUTH_URL}/login?error=no_code`
 );
 }

 const expectedNonce = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
 if (!nonce || !expectedNonce || nonce !== expectedNonce) {
 const response = NextResponse.redirect(
 `${process.env.NEXTAUTH_URL}/login?error=invalid_state`
 );
 return clearOAuthStateCookie(response);
 }

 // 1. Exchange code for Google tokens
 const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
 method: "POST",
 headers: { "Content-Type": "application/x-www-form-urlencoded" },
 body: new URLSearchParams({
 code,
 client_id: process.env.GOOGLE_CLIENT_ID!,
 client_secret: process.env.GOOGLE_CLIENT_SECRET!,
 redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/google/callback`,
 grant_type: "authorization_code",
 }),
 });

 const tokenData = await tokenRes.json();

 if (tokenData.error) {
 console.error("[Google Token Error]", tokenData);
 return NextResponse.redirect(
 `${process.env.NEXTAUTH_URL}/login?error=token_exchange_failed`
 );
 }

 // 2. Fetch user profile from Google
 const profileRes = await fetch(
 "https://www.googleapis.com/oauth2/v2/userinfo",
 { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
 );

 const profile = await profileRes.json();

 if (!profile.email) {
 return NextResponse.redirect(
 `${process.env.NEXTAUTH_URL}/login?error=no_email`
 );
 }

 // 3. Create or find user, issue our tokens
 const result = await googleLoginUser({
 email: profile.email,
 name: profile.name || profile.email.split("@")[0],
 avatarUrl: profile.picture,
 googleId: profile.id,
 role,
 });

 if ("error" in result) {
 return NextResponse.redirect(
 `${process.env.NEXTAUTH_URL}/login?error=${encodeURIComponent(String(result.error))}`
 );
 }

 // 4. Hand off the access token + user via a one-time exchange code instead
 // of putting them directly in the redirect URL — a URL query string ends
 // up in browser history, server/proxy access logs, and Referer headers.
 const exchangeCode = createExchangeCode(result.accessToken, result.user, 900);
 const redirectUrl = new URL("/login", process.env.NEXTAUTH_URL!);
 redirectUrl.searchParams.set("google_exchange", exchangeCode);

 const response = NextResponse.redirect(redirectUrl.toString());
 clearOAuthStateCookie(response);
 return setRefreshCookie(response, result.refreshToken);
 } catch (err) {
 console.error("[Google Callback Error]", err);
 return NextResponse.redirect(
 `${process.env.NEXTAUTH_URL}/login?error=internal_error`
 );
 }
}
