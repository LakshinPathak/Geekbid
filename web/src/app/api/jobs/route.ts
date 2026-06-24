import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";

// GET /api/jobs — list all open jobs (public)
export async function GET() {
  try {
    const db = await getDb();
    const jobs = await db
      .collection("jobs")
      .find({})
      .sort({ postedAt: -1 })
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
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Title required" },
        { status: 400 }
      );
    }

    const db = await getDb();
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
    };

    const result = await db.collection("jobs").insertOne(job);
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
