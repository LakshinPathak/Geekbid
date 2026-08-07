import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import crypto from "crypto";
import { sendPaymentConfirmationEmail } from "@/lib/email";
import { ObjectId } from "mongodb";
import { splitEscrow, DEFAULT_PLATFORM_FEE_PERCENT } from "@/lib/money";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "secret_placeholder";

// POST /api/payments — Create a Razorpay order
export async function POST(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const { amount, currency = "INR", jobId, description } = await req.json();

 if (!amount || amount <= 0) {
 return NextResponse.json(
 { error: "Amount must be a positive number" },
 { status: 400 }
 );
 }

 const amountInPaise = Math.round(amount * 100);

 // Try real Razorpay API
 if (RAZORPAY_KEY_ID !== "rzp_test_placeholder") {
 try {
 const basicAuth = Buffer.from(
 `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`
 ).toString("base64");

 const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 Authorization: `Basic ${basicAuth}`,
 },
 body: JSON.stringify({
 amount: amountInPaise,
 currency,
 receipt: `rcpt_${jobId || "gen"}_${Date.now()}`,
 notes: { jobId, userId: auth.payload.userId },
 }),
 });

 if (rzpRes.ok) {
 const order = await rzpRes.json();
 return NextResponse.json({
 order,
 key: RAZORPAY_KEY_ID,
 mock: false,
 });
 }
 } catch (err) {
 console.error("[Razorpay API Error]", err);
 }
 }

 // Mock mode fallback
 const mockOrder = {
 id: `order_mock_${Date.now()}`,
 entity: "order",
 amount: amountInPaise,
 amount_paid: 0,
 amount_due: amountInPaise,
 currency,
 status: "created",
 created_at: Math.floor(Date.now() / 1000),
 notes: { jobId, userId: auth.payload.userId },
 };

 return NextResponse.json({
 order: mockOrder,
 key: RAZORPAY_KEY_ID,
 mock: true,
 });
 } catch (err) {
 console.error("[Payments POST Error]", err);
 return NextResponse.json(
 { error: "Failed to create order" },
 { status: 500 }
 );
 }
}

// PATCH /api/payments — Verify a Razorpay payment
export async function PATCH(req: NextRequest) {
 try {
 const auth = await authenticateRequest(req);
 if ("error" in auth) {
 return NextResponse.json({ error: auth.error }, { status: auth.status });
 }

 const {
 razorpay_order_id,
 razorpay_payment_id,
 razorpay_signature,
 amount,
 currency = "INR",
 jobId,
 description,
 } = await req.json();

 if (!razorpay_order_id || !razorpay_payment_id) {
 return NextResponse.json(
 { error: "Missing payment verification fields" },
 { status: 400 }
 );
 }

 if (!razorpay_signature) {
 return NextResponse.json(
 { error: "Missing razorpay_signature" },
 { status: 400 }
 );
 }

 const isMock = razorpay_order_id.startsWith("order_mock_");

 // Mock verification trusts the client-supplied amount, so it must never be
 // reachable in production — a forged order_mock_ id would otherwise let a
 // caller mint arbitrary-value transactions.
 if (isMock && process.env.NODE_ENV === "production") {
 return NextResponse.json(
 { error: "Mock payments are not allowed in production" },
 { status: 400 }
 );
 }

 // Mock orders never went through Razorpay, so there's no real HMAC to
 // check — the client sends the literal "mock_signature" placeholder
 // (payments/page.tsx, FeaturedBoostModal.tsx). Checking that against a
 // real computed HMAC would always fail, breaking every mock payment.
 // Real orders still get full signature verification below.
 if (!isMock) {
 const expectedSignature = crypto
 .createHmac("sha256", RAZORPAY_KEY_SECRET)
 .update(`${razorpay_order_id}|${razorpay_payment_id}`)
 .digest("hex");

 const expectedBuf = Buffer.from(expectedSignature, "hex");
 const providedBuf = Buffer.from(razorpay_signature, "hex");
 const verified =
 expectedBuf.length === providedBuf.length &&
 crypto.timingSafeEqual(expectedBuf, providedBuf);

 if (!verified) {
 return NextResponse.json(
 { error: "Payment signature verification failed" },
 { status: 400 }
 );
 }
 }

 // Never trust the client-supplied amount for a real payment — fetch what
 // Razorpay actually captured and use that for all ledger math.
 let grossAmount = amount ? Number(amount) : 0;
 if (!isMock) {
 try {
 const basicAuth = Buffer.from(
 `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`
 ).toString("base64");
 const rzpRes = await fetch(
 `https://api.razorpay.com/v1/payments/${razorpay_payment_id}`,
 { headers: { Authorization: `Basic ${basicAuth}` } }
 );
 if (!rzpRes.ok) {
 return NextResponse.json(
 { error: "Failed to verify payment with Razorpay" },
 { status: 400 }
 );
 }
 const rzpPayment = await rzpRes.json();
 if (rzpPayment.order_id !== razorpay_order_id) {
 return NextResponse.json(
 { error: "Payment does not belong to the given order" },
 { status: 400 }
 );
 }
 if (!["captured", "authorized"].includes(rzpPayment.status)) {
 return NextResponse.json(
 { error: "Payment has not been captured" },
 { status: 400 }
 );
 }
 grossAmount = Number(rzpPayment.amount) / 100;
 } catch (err) {
 console.error("[Razorpay Verify Error]", err);
 return NextResponse.json(
 { error: "Failed to verify payment with Razorpay" },
 { status: 502 }
 );
 }
 }

 // Save transaction to MongoDB
 const db = await getDb();

 // Idempotency: a given Razorpay payment can only ever fund one transaction —
 // replaying the same verified payload must not mint duplicate escrow rows.
 const existingTx = await db.collection("transactions").findOne({
 razorpayPaymentId: razorpay_payment_id,
 });
 if (existingTx) {
 const existingId = existingTx._id.toString();
 return NextResponse.json({
 verified: true,
 transactionId: existingId,
 transaction: { ...existingTx, _id: existingId, id: existingId },
 });
 }

 // Use the fee locked onto the job at creation time (blueprint §17), not a
 // flat default — otherwise a Plus/Premium client's 7%/5% rate silently
 // becomes 10% the moment their escrow is actually funded.
 const feeJob = jobId && ObjectId.isValid(jobId)
 ? await db.collection("jobs").findOne({ _id: ObjectId.createFromHexString(jobId) }, { projection: { platformFeePercent: 1 } })
 : null;
 const escrow = splitEscrow(grossAmount, feeJob?.platformFeePercent ?? DEFAULT_PLATFORM_FEE_PERCENT);
 // Use escrow.gross (the cent-rounded value splitEscrow actually split),
 // not the raw grossAmount float, as the stored amount — otherwise
 // tx.grossAmount can carry sub-cent float noise (e.g. Number(amount)/100
 // precision, or a client-supplied mock amount) that platformFee+netAmount
 // don't share, silently breaking the gross === platformFee + netAmount
 // invariant money.ts guarantees and that admin/disputes + milestones rely
 // on. Matches jobs/[id]/route.ts and jobs/offer-response/route.ts, which
 // already store escrow.gross.
 const gross = escrow.gross;
 const platformFee = escrow.platformFee;
 const netAmount = escrow.netAmount;

 // Tagged distinctly from the "job_escrow" transactions that accept/award
 // create directly (api/jobs/[id], jobs/offer-response) — this route's
 // jobId is only ever a loose reference (boost purchase, or a free-form
 // manual payment), never the job's actual funding row, so it must never
 // collide with the { jobId, purpose: "job_escrow" } filter complete/dispute
 // use to release the real escrow (see ISSUE-6).
 const purpose = (description || "").startsWith("featured_boost:") ? "featured_boost" : "manual_payment";

 const tx = {
 jobId: jobId || "",
 clientId: auth.payload.userId,
 freelancerId: "",
 grossAmount: gross,
 platformFee,
 netAmount,
 escrowStatus: "held",
 paymentMethod: "razorpay",
 razorpayOrderId: razorpay_order_id,
 razorpayPaymentId: razorpay_payment_id,
 razorpaySignature: razorpay_signature || "mock",
 currency,
 description: description || "",
 purpose,
 createdAt: new Date().toISOString(),
 verified: true,
 mock: isMock,
 };

 // The findOne check above is idempotency-in-spirit but not atomic — two
 // concurrent verify calls for the same payment can both pass it before
 // either insert lands. A unique index on razorpayPaymentId (see
 // scripts/create-fix-indexes.mjs) turns the loser's insert into a
 // duplicate-key error instead of a second escrow row; treat that the same
 // as the idempotent-return path above.
 let txId: string;
 try {
 const result = await db.collection("transactions").insertOne(tx);
 txId = result.insertedId.toString();
 } catch (err) {
 if ((err as { code?: number }).code === 11000) {
 const raceWinnerTx = await db.collection("transactions").findOne({ razorpayPaymentId: razorpay_payment_id });
 if (raceWinnerTx) {
 const existingId = raceWinnerTx._id.toString();
 return NextResponse.json({
 verified: true,
 transactionId: existingId,
 transaction: { ...raceWinnerTx, _id: existingId, id: existingId },
 });
 }
 }
 throw err;
 }

 // Fire-and-forget: send payment receipt to client. The transaction is
 // already durably recorded above — a bad client-supplied jobId (or any
 // other failure in this block) must never turn a successful payment into
 // a false "payment failed" response, so this is isolated in its own
 // try/catch rather than letting it fall through to the outer catch.
 try {
 const { ObjectId } = await import("mongodb");
 const payer = await db.collection("users").findOne(
 { _id: ObjectId.createFromHexString(auth.payload.userId) },
 { projection: { email: 1, fullName: 1 } }
 );
 const jobDoc = jobId && ObjectId.isValid(jobId) ? await db.collection("jobs").findOne(
 { _id: ObjectId.createFromHexString(jobId) },
 { projection: { title: 1 } }
 ) : null;
 if (payer?.email) {
 sendPaymentConfirmationEmail(
 payer.email, payer.fullName ?? "Client",
 gross, currency,
 jobDoc?.title ?? description ?? "GeekBid Project",
 txId, isMock
 ).catch((err) => console.error("[Email Failed] paymentConfirmation:", err));
 }
 } catch (err) {
 console.error("[Payments] Receipt email lookup failed (payment already recorded):", err);
 }

 return NextResponse.json({
 verified: true,
 transactionId: txId,
 transaction: { ...tx, _id: txId, id: txId },
 });
 } catch (err) {
 console.error("[Payments PATCH Error]", err);
 return NextResponse.json(
 { error: "Failed to verify payment" },
 { status: 500 }
 );
 }
}

// GET /api/payments — Get Razorpay config (public key)
export async function GET() {
 return NextResponse.json({
 key: RAZORPAY_KEY_ID,
 currency: "INR",
 mock: RAZORPAY_KEY_ID === "rzp_test_placeholder",
 });
}
