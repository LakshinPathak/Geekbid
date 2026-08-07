import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { sendNewReviewEmail } from "@/lib/email";
import { ObjectId } from "mongodb";

// GET /api/reviews?userId=xxx or ?jobId=xxx
export async function GET(req: NextRequest) {
 try {
 const db = await getDb();
 const { searchParams } = new URL(req.url);
 const userId = searchParams.get("userId");
 const jobId = searchParams.get("jobId");

 // Without userId/jobId this used to be an unauthenticated, unscoped dump
 // of the 50 most recent reviews platform-wide (including a guessable
 // jobId for otherwise access-controlled invite-only jobs). Public-profile
 // reviews (?userId=) stay public since ratings are shown on public
 // profiles; any other request (unscoped, or jobId-only) now requires
 // auth — a bare jobId used to skip authentication entirely, letting
 // anyone read an invite-only job's reviews just by guessing its id.
 let filter: Record<string, unknown> = {};
 if (userId) {
 filter = { revieweeId: userId };
 } else {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }
 if (!jobId) {
 filter = { $or: [{ reviewerId: auth.payload.userId }, { revieweeId: auth.payload.userId }] };
 }
 }
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
 if (!ObjectId.isValid(revieweeId) || !ObjectId.isValid(jobId)) {
 return NextResponse.json({ error: "Invalid jobId or revieweeId" }, { status: 400 });
 }

 const numRating = Number(rating);
 if (!numRating || numRating < 1 || numRating > 5) {
 return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
 }

 const trimmedComment = (comment ?? "").slice(0, 1000);

 const db = await getDb();

 // Verify job exists and is accepted with released escrow. `purpose:
 // "job_escrow"` matters here — a job can also carry an unrelated
 // "released" transaction (e.g. an admin-released manual payment, or a
 // featured-boost payment tagged with the same jobId) that would otherwise
 // wrongly authorize a review before the actual job escrow was released.
 const transaction = await db.collection("transactions").findOne({
 jobId,
 purpose: "job_escrow",
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

 // revieweeId must be the *other* party on this same transaction — without
 // this, a caller could pass any arbitrary user's id and move their
 // averageRating/totalReviews with a fabricated review unrelated to them.
 const expectedRevieweeId = isClient ? transaction.freelancerId : transaction.clientId;
 if (revieweeId !== expectedRevieweeId) {
 return NextResponse.json({ error: "revieweeId must be the other party on this job" }, { status: 403 });
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
 { _id: new ObjectId(revieweeId) },
 { $set: { averageRating: Number(avgRating.toFixed(2)), totalReviews: allReviews.length } }
 );

 // Fire-and-forget: email the reviewed user
 const reviewee = await db.collection("users").findOne(
 { _id: new ObjectId(revieweeId) },
 { projection: { email: 1, fullName: 1, name: 1 } }
 );
 const reviewer = await db.collection("users").findOne(
 { _id: new ObjectId(auth.payload.userId) },
 { projection: { fullName: 1, name: 1 } }
 );
 const jobForReview = await db.collection("jobs").findOne(
 { _id: new ObjectId(jobId) },
 { projection: { title: 1 } }
 );
 if (reviewee?.email) {
 sendNewReviewEmail(
 reviewee.email,
 reviewee.fullName ?? reviewee.name ?? "User",
 reviewer?.fullName ?? reviewer?.name ?? "Someone",
 numRating,
 trimmedComment,
 jobForReview?.title ?? "a project"
 ).catch(() => {});
 }

 return NextResponse.json(
 { ...review, _id: result.insertedId.toString(), id: result.insertedId.toString() },
 { status: 201 }
 );
 } catch (err) {
 console.error("[Reviews POST Error]", err);
 return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
 }
}
