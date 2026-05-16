import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";

/**
 * GET /api/chat/rooms — fetch user's chat rooms (protected)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const db = await getDb();
    const rooms = await db
      .collection("chat_rooms")
      .find({ participantIds: auth.payload.userId })
      .sort({ updatedAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json(
      rooms.map((r) => ({
        ...r,
        _id: r._id.toString(),
        id: r._id.toString(),
      }))
    );
  } catch (err) {
    console.error("[Chat Rooms GET Error]", err);
    return NextResponse.json(
      { error: "Failed to fetch chat rooms" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat/rooms — create a chat room (protected)
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { jobId, participantIds } = await req.json();
    if (!jobId || !participantIds?.length) {
      return NextResponse.json(
        { error: "jobId and participantIds required" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Check if room already exists for this job + participants
    const existing = await db.collection("chat_rooms").findOne({
      jobId,
      participantIds: { $all: participantIds },
    });

    if (existing) {
      return NextResponse.json({
        ...existing,
        _id: existing._id.toString(),
        id: existing._id.toString(),
      });
    }

    const room = {
      jobId,
      participantIds,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const result = await db.collection("chat_rooms").insertOne(room);
    return NextResponse.json(
      {
        ...room,
        _id: result.insertedId.toString(),
        id: result.insertedId.toString(),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[Chat Rooms POST Error]", err);
    return NextResponse.json(
      { error: "Failed to create chat room" },
      { status: 500 }
    );
  }
}
