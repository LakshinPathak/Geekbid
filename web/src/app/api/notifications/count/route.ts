import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";

// GET /api/notifications/count — Returns { unread: number } for navbar badge
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { payload } = auth;
    const db = await getDb();

    const unread = await db.collection("notifications").countDocuments({
      userId: payload.userId,
      read: { $ne: true },
    });

    return NextResponse.json({ unread });
  } catch (err) {
    console.error("[Notifications/count GET Error]", err);
    return NextResponse.json({ error: "Failed to fetch count" }, { status: 500 });
  }
}
