import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";

// PATCH /api/jobs/feature — toggle featured status
export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { jobId, featured } = body;

    if (!jobId) {
      return NextResponse.json({ error: "jobId required" }, { status: 400 });
    }

    const db = await getDb();
    const job = await db.collection("jobs").findOne({ _id: new ObjectId(jobId) });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Only admin or the job's client can feature
    if (auth.payload.role !== "admin" && job.clientId !== auth.payload.userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await db.collection("jobs").updateOne(
      { _id: new ObjectId(jobId) },
      {
        $set: {
          featured: !!featured,
          featuredAt: featured ? new Date().toISOString() : null,
        },
      }
    );

    return NextResponse.json({ ok: true, featured: !!featured });
  } catch (err) {
    console.error("[Feature PATCH Error]", err);
    return NextResponse.json({ error: "Failed to update featured status" }, { status: 500 });
  }
}
