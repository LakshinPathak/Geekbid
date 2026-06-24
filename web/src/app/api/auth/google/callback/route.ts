import { NextRequest, NextResponse } from "next/server";
import { googleLoginUser, setRefreshCookie } from "@/lib/auth";

/**
 * GET /api/auth/google/callback
 *
 * Handles the OAuth callback from Google:
 * 1. Exchanges the authorization code for tokens
 * 2. Fetches user profile from Google
 * 3. Creates or finds the user in our DB
 * 4. Issues our own JWT access + refresh token pair
 * 5. Redirects to /feed with tokens saved
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const role = searchParams.get("state") || "freelancer";
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

    // 4. Redirect to /feed with access token + user data in URL fragment
    //    (fragment is never sent to server, stays client-side only)
    const userData = encodeURIComponent(JSON.stringify(result.user));
    const redirectUrl = new URL("/login", process.env.NEXTAUTH_URL!);
    redirectUrl.searchParams.set("google_token", result.accessToken);
    redirectUrl.searchParams.set("google_user", userData);
    redirectUrl.searchParams.set("expires_in", "900");

    const response = NextResponse.redirect(redirectUrl.toString());
    return setRefreshCookie(response, result.refreshToken);
  } catch (err) {
    console.error("[Google Callback Error]", err);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/login?error=internal_error`
    );
  }
}
