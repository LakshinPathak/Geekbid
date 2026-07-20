import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";

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

    if (paramsToSign.folder && !ALLOWED_FOLDERS.includes(String(paramsToSign.folder))) {
      return NextResponse.json({ error: "Invalid upload folder" }, { status: 400 });
    }

    // Avatars must be server-derived and scoped to the caller's own userId —
    // otherwise any authenticated user could get a valid signature to
    // overwrite another user's avatar asset by guessing/reading its public_id.
    if (paramsToSign.folder === "geekbid/avatars") {
      paramsToSign.public_id = `geekbid/avatars/${auth.payload.userId}`;
    }

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
