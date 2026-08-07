import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";
import crypto from "crypto";

const ALLOWED_FOLDERS = ["geekbid/avatars", "geekbid/portfolio", "geekbid/jobs"];

// POST /api/upload/sign — signs whatever params the Cloudinary upload widget
// itself decides to send (via its `uploadSignature` callback contract:
// `fetch(endpoint, { body: JSON.stringify({ paramsToSign }) })`, expects
// back `{ signature }`). The widget — not this endpoint — owns timestamp
// and any other upload params, so the signature here must cover exactly
// what it sends, or Cloudinary will reject the upload as tampered.
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const paramsToSign = (body.paramsToSign ?? {}) as Record<string, unknown>;

    // `folder` must always be present and allowlisted — previously this was
    // only checked when `folder` was truthy, so omitting it entirely bypassed
    // both the allowlist and the public_id override below, letting a caller
    // sign an arbitrary paramsToSign object (including an arbitrary
    // public_id) and overwrite any Cloudinary asset.
    const folder = paramsToSign.folder ? String(paramsToSign.folder) : "";
    if (!folder || !ALLOWED_FOLDERS.includes(folder)) {
      return NextResponse.json({ error: "Invalid upload folder" }, { status: 400 });
    }

    // public_id must always be server-derived and scoped to the caller's own
    // userId for every restricted folder — never trust a client-supplied
    // public_id, or an authenticated user could overwrite another user's
    // avatar/portfolio/job image by supplying its public_id under the
    // correct folder. Avatars intentionally keep a fixed, userId-only
    // public_id (one asset per user, each upload overwrites the last);
    // portfolio/jobs get a random suffix so a user can hold multiple
    // uploaded assets without colliding with (or overwriting) their own
    // prior uploads.
    paramsToSign.public_id =
      folder === "geekbid/avatars"
        ? `${folder}/${auth.payload.userId}`
        : `${folder}/${auth.payload.userId}-${crypto.randomUUID()}`;

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET!
    );

    return NextResponse.json({ signature });
  } catch (err) {
    console.error("[Upload Sign Error]", err);
    return NextResponse.json({ error: "Failed to generate signature" }, { status: 500 });
  }
}
