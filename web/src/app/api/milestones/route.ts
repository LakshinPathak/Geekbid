import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { sendMilestoneSubmittedEmail, sendMilestoneApprovedEmail } from "@/lib/email";

// GET /api/milestones?jobId=xxx
export async function GET(req: NextRequest) {
 try {
 const { searchParams } = new URL(req.url);
 const jobId = searchParams.get("jobId");
 if (!jobId) {
 return NextResponse.json({ error: "jobId required" }, { status: 400 });
 }

 const db = await getDb();
 const milestones = await db
 .collection("milestones")
 .find({ jobId })
 .sort({ order: 1 })
 .toArray();

 return NextResponse.json(
 milestones.map((m) => ({ ...m, _id: m._id.toString(), id: m._id.toString() }))
 );
 } catch (err) {
 console.error("[Milestones GET Error]", err);
 return NextResponse.json({ error: "Failed to fetch milestones" }, { status: 500 });
 }
}

// POST /api/milestones — create milestones for a job (client only)
export async function POST(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const body = await req.json();
 const { jobId, milestones } = body;

 if (!jobId || !Array.isArray(milestones) || milestones.length === 0) {
 return NextResponse.json({ error: "jobId and milestones array required" }, { status: 400 });
 }

 const db = await getDb();
 const job = await db.collection("jobs").findOne({ _id: new ObjectId(jobId) });
 if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
 if (job.clientId !== auth.payload.userId) {
 return NextResponse.json({ error: "Only the job client can add milestones" }, { status: 403 });
 }

 const docs = milestones.map((m: { title: string; description?: string; amount: number }, i: number) => ({
 jobId,
 title: (m.title ?? "").slice(0, 200),
 description: (m.description ?? "").slice(0, 1000),
 amount: Number(m.amount) || 0,
 order: i + 1,
 status: "pending",
 createdAt: new Date().toISOString(),
 }));

 const result = await db.collection("milestones").insertMany(docs);
 const ids = Object.values(result.insertedIds).map((id) => id.toString());

 return NextResponse.json(
 docs.map((d, i) => ({ ...d, _id: ids[i], id: ids[i] })),
 { status: 201 }
 );
 } catch (err) {
 console.error("[Milestones POST Error]", err);
 return NextResponse.json({ error: "Failed to create milestones" }, { status: 500 });
 }
}

// PATCH /api/milestones — update milestone status
export async function PATCH(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const body = await req.json();
 const { milestoneId, action } = body;

 if (!milestoneId || !action) {
 return NextResponse.json({ error: "milestoneId and action required" }, { status: 400 });
 }

 const db = await getDb();
 const milestone = await db.collection("milestones").findOne({ _id: new ObjectId(milestoneId) });
 if (!milestone) return NextResponse.json({ error: "Milestone not found" }, { status: 404 });

 const job = await db.collection("jobs").findOne({ _id: new ObjectId(milestone.jobId) });
 if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

 const update: Record<string, unknown> = {};

 if (action === "start") {
 update.status = "in_progress";
 } else if (action === "submit") {
 if (job.acceptedBy !== auth.payload.userId) {
 return NextResponse.json({ error: "Only the assigned freelancer can submit" }, { status: 403 });
 }
 update.status = "submitted";
 update.submittedAt = new Date().toISOString();
 } else if (action === "approve") {
 if (job.clientId !== auth.payload.userId && auth.payload.role !== "admin") {
 return NextResponse.json({ error: "Only client or admin can approve" }, { status: 403 });
 }
 update.status = "approved";
 update.approvedAt = new Date().toISOString();
 } else {
 return NextResponse.json({ error: "Invalid action" }, { status: 400 });
 }

 await db.collection("milestones").updateOne(
 { _id: new ObjectId(milestoneId) },
 { $set: update }
 );

 // Fire-and-forget: milestone email notifications
 if (action === "submit" && job.clientId) {
 // Freelancer submitted → notify the client
 const client = await db.collection("users").findOne(
 { _id: new ObjectId(job.clientId) },
 { projection: { email: 1, name: 1 } }
 );
 const freelancer = await db.collection("users").findOne(
 { _id: new ObjectId(auth.payload.userId) },
 { projection: { name: 1 } }
 );
 if (client?.email) {
 sendMilestoneSubmittedEmail(
 client.email,
 client.name ?? "Client",
 freelancer?.name ?? "A freelancer",
 milestone.title ?? "Milestone",
 milestone.amount ?? 0,
 job.title ?? "Untitled Job"
 ).catch(() => {});
 }
 } else if (action === "approve" && job.acceptedBy) {
 // Client approved → notify the freelancer
 const freelancer = await db.collection("users").findOne(
 { _id: new ObjectId(job.acceptedBy) },
 { projection: { email: 1, name: 1 } }
 );
 if (freelancer?.email) {
 sendMilestoneApprovedEmail(
 freelancer.email,
 freelancer.name ?? "Freelancer",
 milestone.title ?? "Milestone",
 milestone.amount ?? 0,
 job.title ?? "Untitled Job"
 ).catch(() => {});
 }
 }

 return NextResponse.json({ ok: true, status: update.status });
 } catch (err) {
 console.error("[Milestones PATCH Error]", err);
 return NextResponse.json({ error: "Failed to update milestone" }, { status: 500 });
 }
}
