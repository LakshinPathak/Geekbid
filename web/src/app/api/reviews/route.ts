import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";

// GET /api/reviews?userId=xxx or ?jobId=xxx
export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const jobId = searchParams.get("jobId");

    const filter: Record<string, string> = {};
    if (userId) filter.revieweeId = userId;
    if (jobId) filter.jobId = jobId;

    const reviews = await db
      .collection("reviews")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json(
      reviews.map((r) => ({ ...r, _id: r._id.toString(), id: r._id.toString() }))
    );
  } catch (err) {
    console.error("[Reviews GET Error]", err);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

// POST /api/reviews — create review (auth required, only after escrow released)
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { jobId, revieweeId, rating, comment } = body;

    if (!jobId || !revieweeId) {
      return NextResponse.json({ error: "jobId and revieweeId required" }, { status: 400 });
    }

    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
    }

    const trimmedComment = (comment ?? "").slice(0, 1000);

    const db = await getDb();

    // Verify job exists and is accepted with released escrow
    const transaction = await db.collection("transactions").findOne({
      jobId,
      escrowStatus: "released",
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Can only review after escrow is released" },
        { status: 400 }
      );
    }

    // Check reviewer is part of this job
    const isClient = transaction.clientId === auth.payload.userId;
    const isFreelancer = transaction.freelancerId === auth.payload.userId;
    if (!isClient && !isFreelancer) {
      return NextResponse.json({ error: "You are not part of this job" }, { status: 403 });
    }

    // Check uniqueness
    const existing = await db.collection("reviews").findOne({
      jobId,
      reviewerId: auth.payload.userId,
    });
    if (existing) {
      return NextResponse.json({ error: "You already reviewed this job" }, { status: 409 });
    }

    const review = {
      jobId,
      reviewerId: auth.payload.userId,
      revieweeId,
      rating: numRating,
      comment: trimmedComment,
      reviewerRole: auth.payload.role === "client" ? "client" : "freelancer",
      createdAt: new Date().toISOString(),
    };

    const result = await db.collection("reviews").insertOne(review);

    // Update reviewee's average rating on user document
    const allReviews = await db
      .collection("reviews")
      .find({ revieweeId })
      .toArray();
    const avgRating =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await db.collection("users").updateOne(
      { _id: (await import("mongodb")).ObjectId.createFromHexString(revieweeId) },
      { $set: { averageRating: Number(avgRating.toFixed(2)), totalReviews: allReviews.length } }
    );

    return NextResponse.json(
      { ...review, _id: result.insertedId.toString(), id: result.insertedId.toString() },
      { status: 201 }
    );
  } catch (err) {
    console.error("[Reviews POST Error]", err);
    return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
  }
}
