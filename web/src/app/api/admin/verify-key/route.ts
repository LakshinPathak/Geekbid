import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (auth.payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { key } = await req.json();
  if (!key || typeof key !== "string") return NextResponse.json({ error: "Key required" }, { status: 400 });

  const valid = key === process.env.ADMIN_SECRET_KEY;
  if (!valid) {
    const db = await getDb();
    await db.collection("audit_logs").insertOne({
      adminId: auth.payload.userId,
      action: "admin_key_fail",
      detail: "Invalid admin key attempt",
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ error: "Invalid admin key" }, { status: 401 });
  }

  const db = await getDb();
  await db.collection("audit_logs").insertOne({
    adminId: auth.payload.userId,
    action: "admin_key_verified",
    detail: "Admin key verified successfully",
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ verified: true });
}
