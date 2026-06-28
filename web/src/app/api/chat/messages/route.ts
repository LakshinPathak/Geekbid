import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";

/**
 * GET /api/chat/messages?roomId=xxx — fetch messages for a room (protected)
 */
export async function GET(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const roomId = req.nextUrl.searchParams.get("roomId");
 if (!roomId) {
 return NextResponse.json(
 { error: "roomId query parameter required" },
 { status: 400 }
 );
 }

 const db = await getDb();

 // Verify user is a participant of this room
 const room = await db.collection("chat_rooms").findOne({
 $or: [
 { _id: (() => { try { const { ObjectId } = require("mongodb"); return new ObjectId(roomId); } catch { return roomId; } })() },
 { id: roomId },
 ],
 participantIds: auth.payload.userId,
 });

 if (!room) {
 return NextResponse.json(
 { error: "Room not found or access denied" },
 { status: 404 }
 );
 }

 const messages = await db
 .collection("chat_messages")
 .find({ roomId: room._id.toString() })
 .sort({ createdAt: 1 })
 .limit(500)
 .toArray();

 return NextResponse.json(
 messages.map((m) => ({
 ...m,
 _id: m._id.toString(),
 id: m._id.toString(),
 }))
 );
 } catch (err) {
 console.error("[Chat Messages GET Error]", err);
 return NextResponse.json(
 { error: "Failed to fetch messages" },
 { status: 500 }
 );
 }
}

/**
 * POST /api/chat/messages — send a message (protected)
 */
export async function POST(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const { roomId, text } = await req.json();
 if (!roomId || !text?.trim()) {
 return NextResponse.json(
 { error: "roomId and text are required" },
 { status: 400 }
 );
 }

 const db = await getDb();
 const message = {
 roomId,
 senderId: auth.payload.userId,
 text: text.trim(),
 createdAt: new Date().toISOString(),
 };

 const result = await db.collection("chat_messages").insertOne(message);

 // Update room's updatedAt
 const { ObjectId } = await import("mongodb");
 try {
 await db.collection("chat_rooms").updateOne(
 { _id: new ObjectId(roomId) },
 { $set: { updatedAt: new Date().toISOString() } }
 );
 } catch {
 await db.collection("chat_rooms").updateOne(
 { id: roomId },
 { $set: { updatedAt: new Date().toISOString() } }
 );
 }

 return NextResponse.json(
 {
 ...message,
 _id: result.insertedId.toString(),
 id: result.insertedId.toString(),
 },
 { status: 201 }
 );
 } catch (err) {
 console.error("[Chat Messages POST Error]", err);
 return NextResponse.json(
 { error: "Failed to send message" },
 { status: 500 }
 );
 }
}
