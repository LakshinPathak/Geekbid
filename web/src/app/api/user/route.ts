import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { backendFetch, proxyToBackend, tokenFromRequest } from "@/lib/backend";

// GET /api/user — authenticated user's own profile.
// BFF proxy → gateway → auth-service GET /v1/auth/me (self view, includes email).
export async function GET(req: NextRequest) {
  return proxyToBackend(req, "/v1/auth/me", { unwrapKey: "user" });
}

// PATCH /api/user — update own profile via auth-service PATCH /v1/users/:id,
// injecting the caller's own id from the verified token.
export async function PATCH(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const body = await req.json().catch(() => ({}));
  const result = await backendFetch<{ updated?: string[] }>(
    `/v1/users/${encodeURIComponent(auth.payload.userId)}`,
    { method: "PATCH", token: tokenFromRequest(req), body }
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, updated: result.data?.updated ?? [] });
}
