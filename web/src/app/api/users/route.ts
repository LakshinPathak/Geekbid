import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend";

/**
 * GET /api/users — list users (protected; admin sees email, others public view).
 * BFF proxy → gateway → auth-service GET /v1/users. The service enforces auth +
 * the admin/public projection, so behavior matches the former direct handler; we
 * just unwrap the `{ users: [...] }` envelope back to the bare array the UI expects.
 */
export async function GET(req: NextRequest) {
  const role = req.nextUrl.searchParams.get("role");
  const qs = role ? `?role=${encodeURIComponent(role)}&limit=200` : `?limit=200`;
  return proxyToBackend(req, `/v1/users${qs}`, { unwrapKey: "users" });
}
