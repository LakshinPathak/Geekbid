import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend";

/**
 * /api/notifications — BFF proxy → gateway → notification-service.
 * GET: list (admin all / else own), PATCH: mark read ({notificationId}|{markAll}),
 * POST: create for the caller. The service matches the app's string-userId schema.
 */
export async function GET(req: NextRequest) {
  return proxyToBackend(req, "/v1/notifications", { unwrapKey: "notifications" });
}

export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/v1/notifications", { unwrapKey: "notification" });
}

export async function PATCH(req: NextRequest) {
  return proxyToBackend(req, "/v1/notifications");
}
