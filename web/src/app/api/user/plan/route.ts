import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { getPlanConfig } from "@/lib/plans";

// GET /api/user/plan — current plan config + remaining quota for the authenticated user
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const db = await getDb();
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(auth.payload.userId) },
      { projection: { plan: 1, planLimits: 1, subscriptionId: 1, planExpiresAt: 1 } }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const config = getPlanConfig(user.plan);
    const limits = user.planLimits ?? {};

    // Premium's invitesPerMonth is the JS value Infinity (lib/plans.ts) to
    // mean "unlimited" — JSON has no representation for Infinity, so
    // JSON.stringify silently turns it into `null` on the wire. Serializing
    // `config` as-is would ship that as an undocumented accident (and any
    // client doing `used < config.limits.invitesPerMonth` against a `null`
    // would coerce it to 0 and read every user as already over their limit).
    // Make the "unlimited" contract explicit instead: null on the wire,
    // called out here rather than left to be discovered as a footgun.
    const responseConfig = {
      ...config,
      limits: {
        ...config.limits,
        invitesPerMonth: config.limits.invitesPerMonth === Infinity ? null : config.limits.invitesPerMonth,
      },
    };

    return NextResponse.json({
      plan: user.plan ?? "free",
      config: responseConfig,
      usage: {
        jobsPostedThisMonth: limits.jobsPostedThisMonth ?? 0,
        bidsPlacedThisMonth: limits.bidsPlacedThisMonth ?? 0,
        aiUsesThisMonth: limits.aiUsesThisMonth ?? 0,
        aiBidUsesThisMonth: limits.aiBidUsesThisMonth ?? 0,
        featuredBoostsUsedThisMonth: limits.featuredBoostsUsedThisMonth ?? 0,
        invitesSentThisMonth: limits.invitesSentThisMonth ?? 0,
        monthResetAt: limits.monthResetAt ?? null,
      },
      subscriptionId: user.subscriptionId ?? null,
      planExpiresAt: user.planExpiresAt ?? null,
    });
  } catch (err) {
    console.error("[User Plan GET Error]", err);
    return NextResponse.json(
      { error: "Failed to fetch plan" },
      { status: 500 }
    );
  }
}
