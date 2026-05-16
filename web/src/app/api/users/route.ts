import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";

/**
 * GET /api/users — list users (protected, admin sees all, others see public profiles)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const db = await getDb();
    const role = req.nextUrl.searchParams.get("role");
    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;

    const projection =
      auth.payload.role === "admin"
        ? { password: 0 }
        : { password: 0, googleId: 0 };

    const users = await db
      .collection("users")
      .find(filter, { projection })
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    return NextResponse.json(
      users.map((u) => ({
        ...u,
        _id: u._id.toString(),
        id: u._id.toString(),
      }))
    );
  } catch (err) {
    console.error("[Users GET Error]", err);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
