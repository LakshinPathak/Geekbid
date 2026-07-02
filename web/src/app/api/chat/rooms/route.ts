import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend";

/**
 * /api/chat/rooms — BFF proxy → gateway → chat-service.
 * GET: caller's rooms (token-scoped). POST: create room with job-association auth.
 */
export async function GET(req: NextRequest) {
  return proxyToBackend(req, "/v1/chat/rooms", { unwrapKey: "rooms" });
}

export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/v1/chat/rooms", { unwrapKey: "room" });
}
