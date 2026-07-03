import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";

/**
 * GET /api/notifications — fetch user's notifications (protected)
 */
export async function GET(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const db = await getDb();
 const filter =
 auth.payload.role === "admin"
 ? {}
 : { userId: auth.payload.userId };

 const notifications = await db
 .collection("notifications")
 .find(filter)
 .sort({ createdAt: -1 })
 .limit(100)
 .toArray();

 return NextResponse.json(
 notifications.map((n) => ({
 ...n,
 _id: n._id.toString(),
 id: n._id.toString(),
 }))
 );
 } catch (err) {
 console.error("[Notifications GET Error]", err);
 return NextResponse.json(
 { error: "Failed to fetch notifications" },
 { status: 500 }
 );
 }
}

/**
 * POST /api/notifications — create a notification (internal/admin)
 */
export async function POST(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const body = await req.json();
 const { type, title, body: notifBody, jobId } = body;

 if (!title) {
 return NextResponse.json(
 { error: "title is required" },
 { status: 400 }
 );
 }

 const db = await getDb();
 const notification = {
 userId: auth.payload.userId,
 type: type ?? "general",
 title,
 body: notifBody ?? "",
 jobId: jobId ?? null,
 isRead: false,
 createdAt: new Date().toISOString(),
 };

 const result = await db.collection("notifications").insertOne(notification);
 return NextResponse.json(
 {
 ...notification,
 _id: result.insertedId.toString(),
 id: result.insertedId.toString(),
 },
 { status: 201 }
 );
 } catch (err) {
 console.error("[Notifications POST Error]", err);
 return NextResponse.json(
 { error: "Failed to create notification" },
 { status: 500 }
 );
 }
}

/**
 * PATCH /api/notifications — mark notifications read (protected)
 */
export async function PATCH(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const { notificationId, markAll } = await req.json();
 const db = await getDb();

 if (markAll) {
 await db.collection("notifications").updateMany(
 { userId: auth.payload.userId, isRead: false },
 { $set: { isRead: true } }
 );
 return NextResponse.json({ ok: true, message: "All marked read" });
 }

 if (notificationId) {
 const { ObjectId } = await import("mongodb");
 await db.collection("notifications").updateOne(
 { _id: new ObjectId(notificationId), userId: auth.payload.userId },
 { $set: { isRead: true } }
 );
 return NextResponse.json({ ok: true });
 }

 return NextResponse.json(
 { error: "Provide notificationId or markAll" },
 { status: 400 }
 );
 } catch (err) {
 console.error("[Notifications PATCH Error]", err);
 return NextResponse.json(
 { error: "Failed to update notifications" },
 { status: 500 }
 );
 }
}
