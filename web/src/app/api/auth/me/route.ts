import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/**
 * GET /api/auth/me
 *
 * Returns the authenticated user's profile from the access token.
 * Used on page load to validate the session is still valid.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const db = await getDb();
    const user = await db
      .collection("users")
      .findOne(
        { _id: new ObjectId(auth.payload.userId) },
        { projection: { password: 0 } }
      );

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        ...user,
        _id: user._id.toString(),
        id: user._id.toString(),
      },
    });
  } catch (err) {
    console.error("[Me Error]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
