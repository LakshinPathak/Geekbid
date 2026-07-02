import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend";

/**
 * GET /api/users/[id] — public profile (excludes email/password/googleId).
 * BFF proxy → gateway → auth-service GET /v1/users/:id, which now strips email
 * and googleId to match the former public projection. Unwraps `{ user }` to the
 * bare object the UI spreads.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToBackend(req, `/v1/users/${encodeURIComponent(id)}`, {
    unwrapKey: "user",
  });
}
