import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend";

/**
 * /api/chat/messages — BFF proxy → gateway → chat-service.
 * GET ?roomId=…: participant-gated message list. POST { roomId, text }: send.
 */
export async function GET(req: NextRequest) {
  return proxyToBackend(req, `/v1/chat/messages${req.nextUrl.search}`, {
    unwrapKey: "messages",
  });
}

export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/v1/chat/messages", { unwrapKey: "message" });
}
