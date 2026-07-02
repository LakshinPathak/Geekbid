import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend";

// GET /api/notifications/count → notification-service (returns { unread }).
export async function GET(req: NextRequest) {
  return proxyToBackend(req, "/v1/notifications/count");
}
