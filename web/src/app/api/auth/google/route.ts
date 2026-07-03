import { NextResponse } from "next/server";
import { generateOAuthNonce, setOAuthStateCookie } from "@/lib/oauth-state";

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

 // Random per-flow nonce, stored in a short-lived httpOnly cookie and echoed
 // back through `state`. The callback rejects the flow unless they match —
 // otherwise an attacker could start the flow under their own account, hand
 // the resulting code to a victim, and log the victim into the attacker's
 // GeekBid account (login-CSRF / session fixation).
 const nonce = generateOAuthNonce();

 const params = new URLSearchParams({
 client_id: clientId,
 redirect_uri: redirectUri,
 response_type: "code",
 scope: "openid email profile",
 access_type: "offline",
 prompt: "consent",
 state: `${nonce}.${role}`,
 });

 const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

 const response = NextResponse.redirect(googleAuthUrl);
 return setOAuthStateCookie(response, nonce);
}
