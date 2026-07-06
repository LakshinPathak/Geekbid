import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { invalidatePlanFeeCache } from "@/lib/plans";

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
    defaultDecayRate: 5,
    maintenanceMode: false,
    registrationOpen: true,
    aiEnabled: true,
    // Per-tier fee overrides — falls back to the PLANS defaults in lib/plans.ts
    // until an admin explicitly overrides a tier here.
    planFees: { free: 10, plus: 7, premium: 5 },
    updatedAt: null,
    updatedBy: null,
  };

  return NextResponse.json(
    config
      ? { ...defaults, ...config, planFees: { ...defaults.planFees, ...config.planFees }, _id: config._id.toString() }
      : defaults
  );
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const allowed = ["defaultDecayRate", "maintenanceMode", "registrationOpen", "aiEnabled"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (body.planFees && typeof body.planFees === "object") {
    const planFees: Record<string, number> = {};
    for (const tier of ["free", "plus", "premium"]) {
      const value = Number(body.planFees[tier]);
      if (Number.isFinite(value)) planFees[tier] = Math.min(100, Math.max(0, value));
    }
    if (Object.keys(planFees).length > 0) update.planFees = planFees;
  }

  const db = await getDb();
  await db.collection("platform_config").updateOne(
    { key: CONFIG_KEY },
    { $set: { ...update, key: CONFIG_KEY, updatedAt: new Date().toISOString(), updatedBy: auth.payload.userId } },
    { upsert: true }
  );

  if (update.planFees) invalidatePlanFeeCache();

  await db.collection("audit_logs").insertOne({
    adminId: auth.payload.userId,
    action: "update_config",
    detail: `Updated config: ${Object.keys(update).join(", ")}`,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
