import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";

// GET /api/email-logs — list email logs (admin sees all, user sees own)
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const emailType = searchParams.get("emailType");
    const status = searchParams.get("status");
    const limit = Math.min(Number(searchParams.get("limit") || 50), 200);
    const page = Math.max(Number(searchParams.get("page") || 1), 1);

    const filter: Record<string, unknown> = {};

    // Non-admins can only see their own emails
    if (auth.payload.role !== "admin") {
      filter.$or = [
        { recipientId: auth.payload.userId },
        { to: auth.payload.email },
      ];
    } else {
      const userId = searchParams.get("userId");
      if (userId) filter.recipientId = userId;
    }

    if (emailType) filter.emailType = emailType;
    if (status) filter.status = status;

    const [logs, total] = await Promise.all([
      db.collection("email_logs")
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      db.collection("email_logs").countDocuments(filter),
    ]);

    return NextResponse.json({
      logs: logs.map((l) => ({ ...l, _id: l._id.toString(), id: l._id.toString() })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[Email Logs GET Error]", err);
    return NextResponse.json({ error: "Failed to fetch email logs" }, { status: 500 });
  }
}

// DELETE /api/email-logs — purge old logs (admin only)
export async function DELETE(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if (auth.payload.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const body = await req.json();
    const { olderThanDays, logId } = body;

    const db = await getDb();

    // Delete a single log by ID
    if (logId) {
      await db.collection("email_logs").deleteOne({ _id: new ObjectId(logId) });
      return NextResponse.json({ ok: true, message: "Log deleted" });
    }

    // Purge logs older than N days
    const days = Number(olderThanDays) || 30;
    const cutoff = new Date(Date.now() - days * 24 * 3600000).toISOString();
    const result = await db.collection("email_logs").deleteMany({
      createdAt: { $lt: cutoff },
    });

    return NextResponse.json({
      ok: true,
      deletedCount: result.deletedCount,
      message: `Purged logs older than ${days} days`,
    });
  } catch (err) {
    console.error("[Email Logs DELETE Error]", err);
    return NextResponse.json({ error: "Failed to delete logs" }, { status: 500 });
  }
}
