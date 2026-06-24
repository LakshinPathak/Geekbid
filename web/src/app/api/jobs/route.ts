import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";

// GET /api/jobs — list all jobs (public), supports ?category= filter
export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const filter: Record<string, unknown> = {};
    if (category && category !== "all") {
      filter.category = category;
    }

    const jobs = await db
      .collection("jobs")
      .find(filter)
      .sort({ featured: -1, postedAt: -1 })
      .limit(100)
      .toArray();
    return NextResponse.json(
      jobs.map((j) => ({ ...j, _id: j._id.toString(), id: j._id.toString() }))
    );
  } catch (err) {
    console.error("[Jobs GET Error]", err);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}

// POST /api/jobs — create a new job (protected)
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    if (auth.payload.role !== "client") {
      return NextResponse.json(
        { error: "Only clients can post jobs" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      title,
      description,
      skillsRequired,
      startingPrice,
      minimumPrice,
      decayRatePerHour,
      estimatedHours,
      deadlineAt,
      category,
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Title required" },
        { status: 400 }
      );
    }

    const validCategories = ["ai_ml", "web_dev", "mobile", "devops", "security", "data_eng", "blockchain", "design", "qa", "other"];
    const jobCategory = validCategories.includes(category) ? category : "other";

    const db = await getDb();

    // Plan limit enforcement
    const user = await db.collection("users").findOne({ _id: new ObjectId(auth.payload.userId) });
    if (user) {
      const plan = user.plan ?? "free";
      if (plan === "free") {
        const limits = user.planLimits ?? { jobsPostedThisMonth: 0, monthResetAt: new Date(0).toISOString() };
        if (new Date(limits.monthResetAt) < new Date()) {
          await db.collection("users").updateOne({ _id: user._id }, {
            $set: { "planLimits.jobsPostedThisMonth": 0, "planLimits.bidsPlacedThisMonth": 0, "planLimits.monthResetAt": new Date(Date.now() + 30 * 24 * 3600000).toISOString() }
          });
        } else if (limits.jobsPostedThisMonth >= 3) {
          return NextResponse.json({ error: "Free plan limit: 3 jobs/month. Upgrade to Pro for unlimited." }, { status: 403 });
        }
      }
    }
    const job = {
      clientId: auth.payload.userId,
      title,
      description: description ?? "",
      skillsRequired: skillsRequired ?? [],
      startingPrice: Number(startingPrice),
      minimumPrice: Number(minimumPrice),
      decayRatePerHour: Number(decayRatePerHour),
      estimatedHours: Number(estimatedHours),
      postedAt: new Date().toISOString(),
      deadlineAt:
        deadlineAt ?? new Date(Date.now() + 48 * 3600000).toISOString(),
      status: "open",
      category: jobCategory,
      featured: false,
    };

    const result = await db.collection("jobs").insertOne(job);

    // Increment plan counter
    await db.collection("users").updateOne(
      { _id: new ObjectId(auth.payload.userId) },
      { $inc: { "planLimits.jobsPostedThisMonth": 1 } }
    );

    return NextResponse.json(
      { ...job, _id: result.insertedId.toString(), id: result.insertedId.toString() },
      { status: 201 }
    );
  } catch (err) {
    console.error("[Jobs POST Error]", err);
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 }
    );
  }
}
