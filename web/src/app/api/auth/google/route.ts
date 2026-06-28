import { NextResponse } from "next/server";

/**
 * GET /api/auth/google
 *
 * Initiates the Google OAuth flow by redirecting to Google's consent screen.
 * Accepts an optional `role` query param so we know what role to assign after signup.
 */
export async function GET(req: Request) {
 const { searchParams } = new URL(req.url);
 const role = searchParams.get("role") || "freelancer";

 const clientId = process.env.GOOGLE_CLIENT_ID;
 if (!clientId) {
 return NextResponse.json(
 { error: "Google OAuth is not configured" },
 { status: 500 }
 );
 }

 const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/google/callback`;

 const params = new URLSearchParams({
 client_id: clientId,
 redirect_uri: redirectUri,
 response_type: "code",
 scope: "openid email profile",
 access_type: "offline",
 prompt: "consent",
 state: role, // Pass role through OAuth state
 });

 const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

 return NextResponse.redirect(googleAuthUrl);
}
