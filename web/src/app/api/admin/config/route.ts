import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

async function requireAdmin(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return { error: auth.error, status: auth.status };
  if (auth.payload.role !== "admin") return { error: "Forbidden", status: 403 };
  return { payload: auth.payload };
}

const CONFIG_KEY = "platform_config";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const db = await getDb();
  const config = await db.collection("platform_config").findOne({ key: CONFIG_KEY });

  const defaults = {
    platformFeePercent: 10,
    defaultDecayRate: 5,
    maintenanceMode: false,
    registrationOpen: true,
    aiEnabled: true,
    updatedAt: null,
    updatedBy: null,
  };

  return NextResponse.json(config ? { ...defaults, ...config, _id: config._id.toString() } : defaults);
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const allowed = ["platformFeePercent", "defaultDecayRate", "maintenanceMode", "registrationOpen", "aiEnabled"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const db = await getDb();
  await db.collection("platform_config").updateOne(
    { key: CONFIG_KEY },
    { $set: { ...update, key: CONFIG_KEY, updatedAt: new Date().toISOString(), updatedBy: auth.payload.userId } },
    { upsert: true }
  );

  await db.collection("audit_logs").insertOne({
    adminId: auth.payload.userId,
    action: "update_config",
    detail: `Updated config: ${Object.keys(update).join(", ")}`,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
