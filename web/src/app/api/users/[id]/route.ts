import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET /api/users/[id] — Public profile (excludes email/password)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    let user;
    try {
      user = await db.collection("users").findOne({ _id: new ObjectId(id) });
    } catch {
      user = await db.collection("users").findOne({ id });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Strip sensitive fields
    const { password: _pw, refreshToken: _rt, email: _em, ...publicProfile } = user;
    void _pw; void _rt; void _em;

    return NextResponse.json({
      ...publicProfile,
      _id: user._id.toString(),
      id: user._id.toString(),
    });
  } catch (err) {
    console.error("[Users/:id GET Error]", err);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}
