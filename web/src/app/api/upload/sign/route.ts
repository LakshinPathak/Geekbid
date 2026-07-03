import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const folder = body.folder ?? "geekbid/avatars";
    const ALLOWED_FOLDERS = ["geekbid/avatars", "geekbid/portfolio", "geekbid/jobs"];
    if (folder && !ALLOWED_FOLDERS.includes(folder)) {
      return NextResponse.json({ error: "Invalid upload folder" }, { status: 400 });
    }
    const timestamp = Math.round(Date.now() / 1000);

    // Restrict to safe image formats — baked into the signature so the client
    // can't request a different format without invalidating it. Cloudinary's
    // upload API doesn't take a per-request max-file-size signed param; that
    // has to be enforced via account/upload-preset settings on Cloudinary's side.
    const allowedFormats = "jpg,jpeg,png,webp,gif";

    const signature = cloudinary.utils.api_sign_request(
      { folder, timestamp, allowed_formats: allowedFormats },
      process.env.CLOUDINARY_API_SECRET!
    );

    return NextResponse.json({
      signature,
      timestamp,
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      folder,
      allowedFormats,
    });
  } catch (err) {
    console.error("[Upload Sign Error]", err);
    return NextResponse.json({ error: "Failed to generate signature" }, { status: 500 });
  }
}
