import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { checkRateLimit } from "@/lib/sanitize";

const MAX_MESSAGE_LENGTH = 5000;

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
 { _id: (() => { try { return new ObjectId(roomId); } catch { return roomId; } })() as unknown as ObjectId },
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

 // Viewing a room's messages marks it read for this user (ISSUE-57: the
 // mobile inbox badge used the general notifications unread count because
 // there was no chat-specific read state to derive one from). Best-effort
 // — a failure here shouldn't block loading the messages themselves.
 db.collection("chat_rooms").updateOne(
 { _id: room._id },
 { $set: { [`lastReadBy.${auth.payload.userId}`]: new Date().toISOString() } }
 ).catch((err) => console.error("[Chat Messages] Failed to stamp lastReadBy:", err));

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
 if (text.trim().length > MAX_MESSAGE_LENGTH) {
 return NextResponse.json(
 { error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer` },
 { status: 400 }
 );
 }
 // 30 messages/minute per user, across all their rooms — chat had auth +
 // membership checks but nothing to stop a single user from flooding a
 // room as fast as the client can fire requests.
 if (!(await checkRateLimit(`chat:${auth.payload.userId}`, 30, 60 * 1000))) {
 return NextResponse.json(
 { error: "You're sending messages too quickly. Please slow down." },
 { status: 429 }
 );
 }

 const db = await getDb();

 // Verify the caller is a participant of this room before allowing a write —
 // otherwise any authenticated user could inject messages into a conversation
 // that isn't theirs.
 const room = await db.collection("chat_rooms").findOne({
 $or: [
 { _id: (() => { try { return new ObjectId(roomId); } catch { return roomId; } })() as unknown as ObjectId },
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

 const message = {
 roomId,
 senderId: auth.payload.userId,
 text: text.trim(),
 createdAt: new Date().toISOString(),
 };

 const result = await db.collection("chat_messages").insertOne(message);

 // Update room's updatedAt, and stamp the sender as caught-up as of this
 // message (they can't be unread on their own send) — see the read-state
 // comment on GET above.
 const nowIso = new Date().toISOString();
 const readUpdate = { updatedAt: nowIso, [`lastReadBy.${auth.payload.userId}`]: nowIso };
 try {
 await db.collection("chat_rooms").updateOne(
 { _id: new ObjectId(roomId) },
 { $set: readUpdate }
 );
 } catch {
 await db.collection("chat_rooms").updateOne(
 { id: roomId },
 { $set: readUpdate }
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
