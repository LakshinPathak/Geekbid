import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend";

// GET /api/bids/my — freelancer's bid history with job details joined.
// BFF proxy → gateway → bidding-service GET /v1/bids/my.
export async function GET(req: NextRequest) {
  return proxyToBackend(req, "/v1/bids/my", { unwrapKey: "bids" });
}
