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
