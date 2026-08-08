import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { sendAssessmentPassedEmail } from "@/lib/email";

// GET /api/assessments — list available assessments, or ?results=true for user's results
export async function GET(req: NextRequest) {
 try {
 const { searchParams } = new URL(req.url);
 const showResults = searchParams.get("results") === "true";
 const assessmentId = searchParams.get("id");

 const db = await getDb();

 if (assessmentId) {
 if (!ObjectId.isValid(assessmentId)) {
 return NextResponse.json({ error: "Invalid assessment id" }, { status: 400 });
 }
 // Return a specific assessment (without correct answers for quiz taking)
 const assessment = await db.collection("assessments").findOne({ _id: new ObjectId(assessmentId) });
 if (!assessment) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
 return NextResponse.json({
 ...assessment,
 _id: assessment._id.toString(),
 id: assessment._id.toString(),
 questions: assessment.questions.map((q: { question: string; options: string[] }) => ({
 question: q.question,
 options: q.options,
 })),
 });
 }

 if (showResults) {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }
 const results = await db
 .collection("assessment_results")
 .find({ userId: auth.payload.userId })
 .sort({ completedAt: -1 })
 .toArray();
 return NextResponse.json(
 results.map((r) => ({ ...r, _id: r._id.toString(), id: r._id.toString() }))
 );
 }

 const assessments = await db.collection("assessments").find({}).toArray();
 return NextResponse.json(
 assessments.map((a) => ({
 _id: a._id.toString(),
 id: a._id.toString(),
 skill: a.skill,
 questionCount: a.questions.length,
 timeLimit: a.timeLimit,
 passingScore: a.passingScore,
 }))
 );
 } catch (err) {
 console.error("[Assessments GET Error]", err);
 return NextResponse.json({ error: "Failed to fetch assessments" }, { status: 500 });
 }
}

// POST /api/assessments — submit assessment answers
export async function POST(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const body = await req.json();
 const { assessmentId, answers, startedAt } = body;

 if (!assessmentId || !Array.isArray(answers)) {
 return NextResponse.json({ error: "assessmentId and answers required" }, { status: 400 });
 }
 if (!ObjectId.isValid(assessmentId)) {
 return NextResponse.json({ error: "Invalid assessment id" }, { status: 400 });
 }
 if (!startedAt) {
 return NextResponse.json({ error: "startedAt required" }, { status: 400 });
 }

 const db = await getDb();
 const assessment = await db.collection("assessments").findOne({ _id: new ObjectId(assessmentId) });
 if (!assessment) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });

 // Server-side time-limit enforcement — the client enforces its own
 // countdown (assessments/page.tsx), but nothing here ever compared elapsed
 // time to assessment.timeLimit, so a request sent after the clock ran out
 // (paused tab, replayed request, or a client simply not bothering to
 // enforce it) was scored exactly the same as an on-time submission.
 // timeLimit is in seconds; a modest grace period absorbs real network/
 // render latency without meaningfully extending the actual time allowed.
 const TIME_LIMIT_GRACE_SECONDS = 15;
 const elapsedSeconds = (Date.now() - new Date(startedAt).getTime()) / 1000;
 if (elapsedSeconds > assessment.timeLimit + TIME_LIMIT_GRACE_SECONDS) {
 return NextResponse.json({ error: "Time limit exceeded for this assessment" }, { status: 400 });
 }

 // Atomically claim the 30-day cooldown window before scoring — the previous
 // check-then-insert let two concurrent submits both read "no recent
 // attempt" and both insert a result, double-crediting geekScore. This
 // relies on a unique index on { userId, assessmentId } (see
 // scripts/create-fix-indexes.mjs): if the existing lock's cooldown hasn't
 // elapsed, or a concurrent request just won the race, the upsert collides
 // with it and throws a duplicate-key error — both cases mean "reject".
 const nowIso = new Date().toISOString();
 const cooldownUntilIso = new Date(Date.now() + 30 * 24 * 3600000).toISOString();
 try {
 await db.collection("assessment_cooldowns").findOneAndUpdate(
 {
 userId: auth.payload.userId,
 assessmentId,
 cooldownUntil: { $lte: nowIso },
 },
 { $set: { cooldownUntil: cooldownUntilIso, lastAttemptAt: nowIso } },
 { upsert: true }
 );
 } catch (err) {
 if ((err as { code?: number }).code === 11000) {
 return NextResponse.json({ error: "You can retake this assessment after 30 days" }, { status: 429 });
 }
 throw err;
 }

 // Score
 let correct = 0;
 assessment.questions.forEach((q: { correctIndex: number }, i: number) => {
 if (answers[i] === q.correctIndex) correct++;
 });
 const score = Math.round((correct / assessment.questions.length) * 100);
 const passed = score >= assessment.passingScore;

 const result = {
 userId: auth.payload.userId,
 assessmentId,
 skill: assessment.skill,
 score,
 passed,
 answers,
 startedAt: startedAt ?? new Date().toISOString(),
 completedAt: new Date().toISOString(),
 };

 await db.collection("assessment_results").insertOne(result);

 // If passed, add to verified skills and boost GeekScore
 if (passed) {
 // geekScore gates real things (direct-offer eligibility at >=500,
 // smart-match ranking, TalentPool "canHire") — it must only be awarded
 // the first time a skill is verified. $addToSet is a no-op on a skill
 // the user already has, but $inc always fires regardless, so before this
 // check a freelancer could retake the same assessment every 30 days
 // (the cooldown above allows exactly that) and rack up +50 geekScore
 // indefinitely without ever gaining a new skill. The 30-day cooldown CAS
 // above already serializes submissions for this (userId, assessmentId)
 // pair, so there's no concurrent-request race to worry about here.
 const userBefore = await db.collection("users").findOne(
 { _id: new ObjectId(auth.payload.userId) },
 { projection: { verifiedSkills: 1 } }
 );
 const alreadyVerified = (userBefore?.verifiedSkills ?? []).includes(assessment.skill);
 await db.collection("users").updateOne(
 { _id: new ObjectId(auth.payload.userId) },
 {
 $addToSet: { verifiedSkills: assessment.skill },
 ...(alreadyVerified ? {} : { $inc: { geekScore: 50 } }),
 }
 );

 // Fire-and-forget: congratulate the freelancer
 db.collection("users").findOne(
 { _id: new ObjectId(auth.payload.userId) },
 { projection: { fullName: 1 } }
 ).then((user) => {
 sendAssessmentPassedEmail(
 auth.payload.email,
 user?.fullName ?? "Freelancer",
 assessment.skill,
 score,
 assessmentId
 ).catch(() => {});
 }).catch(() => {});
 }

 return NextResponse.json({ ...result, passed, score }, { status: 201 });
 } catch (err) {
 console.error("[Assessment Submit Error]", err);
 return NextResponse.json({ error: "Failed to submit assessment" }, { status: 500 });
 }
}
