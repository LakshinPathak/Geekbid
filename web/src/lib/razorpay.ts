import crypto from "crypto";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "secret_placeholder";

// True once real Razorpay credentials are configured — subscription routes
// fall back to a mock-mode flow (matching api/payments/route.ts's existing
// convention) until then, so Phase 4 is testable before real Plans exist.
export const isRazorpayConfigured = RAZORPAY_KEY_ID !== "rzp_test_placeholder";

function authHeader(): string {
  return "Basic " + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
}

export { RAZORPAY_KEY_ID };

export async function razorpayRequest<T = unknown>(
  path: string,
  options: { method?: string; body?: object } = {}
): Promise<T> {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    const message = (data as { error?: { description?: string } })?.error?.description
      ?? `Razorpay request failed: ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

// Fail closed: an unset/misconfigured webhook secret must never be treated
// as "signature valid" — that would let anyone forge subscription events.
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    // Buffers of different length throw rather than returning false
    return false;
  }
}

// Verifies the signature Razorpay Checkout hands back to the client on a
// successful subscription payment (razorpay_payment_id + razorpay_subscription_id
// + razorpay_signature) — a different formula than the webhook's, and signed
// with the API key secret, not the webhook secret. This lets the frontend's
// "payment succeeded" callback be trusted server-side before showing a
// confirmation, rather than acting purely on an unverified client claim. The
// actual plan flip still only ever happens via the subscription.activated/
// charged webhook — this is a defense-in-depth check on the checkout
// response, not a replacement for that.
export function verifySubscriptionCheckoutSignature(
  paymentId: string,
  subscriptionId: string,
  signature: string
): boolean {
  if (RAZORPAY_KEY_SECRET === "secret_placeholder") return false;
  const expected = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${paymentId}|${subscriptionId}`)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
