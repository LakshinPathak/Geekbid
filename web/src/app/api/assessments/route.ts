import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";

// GET /api/assessments — list available assessments, or ?results=true for user's results
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const showResults = searchParams.get("results") === "true";
    const assessmentId = searchParams.get("id");

    const db = await getDb();

    if (assessmentId) {
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

    const db = await getDb();
    const assessment = await db.collection("assessments").findOne({ _id: new ObjectId(assessmentId) });
    if (!assessment) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });

    // Check cooldown (30 days)
    const lastAttempt = await db.collection("assessment_results").findOne({
      userId: auth.payload.userId,
      assessmentId,
      completedAt: { $gt: new Date(Date.now() - 30 * 24 * 3600000).toISOString() },
    });
    if (lastAttempt) {
      return NextResponse.json({ error: "You can retake this assessment after 30 days" }, { status: 429 });
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
      await db.collection("users").updateOne(
        { _id: new ObjectId(auth.payload.userId) },
        {
          $addToSet: { verifiedSkills: assessment.skill },
          $inc: { geekScore: 50 },
        }
      );
    }

    return NextResponse.json({ ...result, passed, score }, { status: 201 });
  } catch (err) {
    console.error("[Assessment Submit Error]", err);
    return NextResponse.json({ error: "Failed to submit assessment" }, { status: 500 });
  }
}
