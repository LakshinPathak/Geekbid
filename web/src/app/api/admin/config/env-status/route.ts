import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";

const TRACKED_VARS = [
  "RAZORPAY_KEY_ID",
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "GEMINI_API_KEY",
  "GOOGLE_CLIENT_ID",
  "MONGODB_URI",
  "NEXTAUTH_SECRET",
];

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (auth.payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const status: Record<string, boolean> = {};
  for (const v of TRACKED_VARS) {
    status[v] = !!process.env[v] && process.env[v] !== "";
  }

  return NextResponse.json(status);
}
