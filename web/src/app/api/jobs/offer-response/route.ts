import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { sendOfferResponseEmail, sendBookingConfirmationEmail } from "@/lib/email";

// PATCH /api/jobs/offer-response — freelancer accepts/declines a direct offer
export async function PATCH(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 if (auth.payload.role !== "freelancer") {
 return NextResponse.json({ error: "Only freelancers can respond to offers" }, { status: 403 });
 }

 const body = await req.json();
 const { jobId, response } = body;

 if (!jobId || !["accepted", "declined"].includes(response)) {
 return NextResponse.json({ error: "jobId and response (accepted/declined) required" }, { status: 400 });
 }

 const db = await getDb();
 const job = await db.collection("jobs").findOne({ _id: new ObjectId(jobId) });

 if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
 if (job.type !== "direct_offer") return NextResponse.json({ error: "Not a direct offer" }, { status: 400 });
 if (job.offeredTo !== auth.payload.userId) return NextResponse.json({ error: "This offer is not for you" }, { status: 403 });
 if (job.offerStatus !== "pending") return NextResponse.json({ error: "Offer already responded to" }, { status: 400 });

 const update: Record<string, unknown> = { offerStatus: response };

 if (response === "accepted") {
 update.status = "accepted";
 update.acceptedBy = auth.payload.userId;
 update.acceptedAt = new Date().toISOString();
 update.finalPrice = job.startingPrice;

 // Create escrow transaction
 const fee = Number((job.startingPrice * 0.1).toFixed(2));
 await db.collection("transactions").insertOne({
 jobId,
 clientId: job.clientId,
 freelancerId: auth.payload.userId,
 grossAmount: job.startingPrice,
 platformFee: fee,
 netAmount: Number((job.startingPrice - fee).toFixed(2)),
 escrowStatus: "held",
 createdAt: new Date().toISOString(),
 });
 } else {
 update.status = "cancelled";
 }

 await db.collection("jobs").updateOne({ _id: new ObjectId(jobId) }, { $set: update });

 // Fire-and-forget: notify client about offer response
 const client = await db.collection("users").findOne(
 { _id: new ObjectId(job.clientId) },
 { projection: { email: 1, name: 1 } }
 );
 const freelancer = await db.collection("users").findOne(
 { _id: new ObjectId(auth.payload.userId) },
 { projection: { name: 1, email: 1 } }
 );
 if (client?.email) {
  sendOfferResponseEmail(
  client.email,
  client.name ?? "Client",
  freelancer?.name ?? "A freelancer",
  job.title ?? "Untitled Job",
  response as "accepted" | "declined",
  job.startingPrice ?? 0,
  jobId
  ).catch((err) => console.error("[Email Failed] offerResponse:", err));
 }

 // Post-deal-accept: send freelancer their booking confirmation with financials
  if (response === "accepted" && freelancer?.email) {
  sendBookingConfirmationEmail(
  freelancer.email,
  freelancer.name ?? "Freelancer",
  client?.name ?? "Client",
  job.title ?? "Untitled Job",
  job.startingPrice ?? 0,
  job.startingPrice ?? 0,
  jobId
  ).catch((err) => console.error("[Email Failed] bookingConfirmation:", err));
  }

  // ── POST-ACCEPTANCE: Auto-create chat room + system message ──
  let roomId: string | undefined;
  if (response === "accepted") {
  try {
  const acceptedAt = new Date().toISOString();
  const roomParticipants = [job.clientId, auth.payload.userId].sort();
  const existingRoom = await db.collection("chat_rooms").findOne({
  jobId, participantIds: { $all: roomParticipants },
  });
  if (existingRoom) {
  roomId = existingRoom._id.toString();
  } else {
  const roomResult = await db.collection("chat_rooms").insertOne({
  jobId, participantIds: roomParticipants,
  createdAt: acceptedAt, updatedAt: acceptedAt,
  });
  roomId = roomResult.insertedId.toString();
  await db.collection("chat_messages").insertOne({
  roomId, senderId: "system",
  text: `🎉 Direct offer for "${job.title}" accepted at $${(job.startingPrice ?? 0).toLocaleString()}. You can now discuss project details here.`,
  createdAt: acceptedAt,
  });
  }

  // In-app notifications
  const jobTitle = job.title ?? "Untitled Job";
  await db.collection("notifications").insertMany([
  {
  userId: job.clientId, type: "offer_accepted", isRead: false,
  title: `${freelancer?.name ?? "Freelancer"} accepted your offer for "${jobTitle}"`,
  body: `Price: $${(job.startingPrice ?? 0).toLocaleString()}. You can now message them.`,
  jobId, createdAt: acceptedAt,
  },
  {
  userId: auth.payload.userId, type: "offer_accepted", isRead: false,
  title: `You accepted the offer for "${jobTitle}"`,
  body: `Price: $${(job.startingPrice ?? 0).toLocaleString()}. Start the conversation with ${client?.name ?? "Client"}.`,
  jobId, createdAt: acceptedAt,
  },
  ]);
  } catch (postErr) {
  console.error("[Post-Accept] Offer post-acceptance failed:", postErr);
  }
  } else {
  // Declined — email can fail to deliver, so make sure the client also has
  // an in-app notification, not just an email, telling them what happened.
  try {
  await db.collection("notifications").insertOne({
  userId: job.clientId, type: "offer_declined", isRead: false,
  title: `${freelancer?.name ?? "The freelancer"} declined your offer for "${job.title ?? "Untitled Job"}"`,
  body: "You can offer this job to someone else or post it publicly.",
  jobId, createdAt: new Date().toISOString(),
  });
  } catch (notifErr) {
  console.error("[Post-Decline] Notification creation failed:", notifErr);
  }
  }

  return NextResponse.json({ ok: true, offerStatus: response, roomId });
 } catch (err) {
 console.error("[Offer Response Error]", err);
 return NextResponse.json({ error: "Failed to respond to offer" }, { status: 500 });
 }
}
