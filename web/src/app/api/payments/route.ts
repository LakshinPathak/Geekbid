import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import crypto from "crypto";

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

    let verified = false;

    // Mock order: auto-verify
    if (razorpay_order_id.startsWith("order_mock_")) {
      verified = true;
    } else {
      // Real signature verification
      if (!razorpay_signature) {
        return NextResponse.json(
          { error: "Missing razorpay_signature" },
          { status: 400 }
        );
      }

      const expectedSignature = crypto
        .createHmac("sha256", RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      verified = expectedSignature === razorpay_signature;
    }

    if (!verified) {
      return NextResponse.json(
        { error: "Payment signature verification failed" },
        { status: 400 }
      );
    }

    // Save transaction to MongoDB
    const db = await getDb();
    const grossAmount = amount ? Number(amount) : 0;
    const platformFee = Number((grossAmount * 0.1).toFixed(2));
    const netAmount = Number((grossAmount * 0.9).toFixed(2));

    const tx = {
      jobId: jobId || "",
      clientId: auth.payload.userId,
      freelancerId: "",
      grossAmount,
      platformFee,
      netAmount,
      escrowStatus: "held",
      paymentMethod: "razorpay",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature || "mock",
      currency,
      description: description || "",
      createdAt: new Date().toISOString(),
      verified: true,
      mock: razorpay_order_id.startsWith("order_mock_"),
    };

    const result = await db.collection("transactions").insertOne(tx);

    return NextResponse.json({
      verified: true,
      transactionId: result.insertedId.toString(),
      transaction: { ...tx, _id: result.insertedId.toString(), id: result.insertedId.toString() },
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
