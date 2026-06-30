/**
 * Input sanitization utilities — prevents NoSQL injection, ReDoS, and prototype pollution.
 * Import from here before using ANY user-supplied value in a MongoDB query.
 */

/** Force input to plain string; rejects objects that could carry MongoDB operators. */
export function sanitizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim();
}

/** Validate a 24-hex MongoDB ObjectId; returns null if invalid. */
export function sanitizeObjectId(input: unknown): string | null {
  const str = String(input ?? "");
  return /^[a-f\d]{24}$/i.test(str) ? str : null;
}

/**
 * Strip $ keys and __proto__ from an object to prevent NoSQL operator injection
 * and prototype pollution. Call on req.body before spreading into a query.
 */
export function sanitizeQuery(input: unknown): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return {};
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
    if (key.startsWith("$")) continue;
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
    clean[key] = typeof val === "object" && val !== null ? String(val) : val;
  }
  return clean;
}

/** Coerce to a finite number, returning defaultVal if not finite. */
export function sanitizeNumber(input: unknown, defaultVal = 0): number {
  const n = Number(input);
  return Number.isFinite(n) ? n : defaultVal;
}

/** Clamp page and limit to safe ranges. */
export function sanitizePagination(page: unknown, limit: unknown) {
  return {
    page: Math.max(1, sanitizeNumber(page, 1)),
    limit: Math.min(100, Math.max(1, sanitizeNumber(limit, 20))),
  };
}

/**
 * Escape regex metacharacters so user search strings can't cause ReDoS
 * or match unintended patterns when passed to MongoDB $regex.
 */
export function sanitizeSearchRegex(input: unknown): string {
  const str = sanitizeString(input);
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Simple in-memory rate limiter for Next.js edge routes ──────────────────

interface RateEntry { count: number; resetAt: number }
const _store = new Map<string, RateEntry>();

/** Returns true if the caller is within the allowed limit, false if blocked. */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = _store.get(key);
  if (!entry || now > entry.resetAt) {
    _store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  if (entry.count > maxRequests) return false;
  return true;
}

/** Extract client IP from Next.js request for rate-limit keys. */
export function getClientIp(req: Request): string {
  const hdr = (req as unknown as { headers: Headers }).headers;
  return (
    hdr.get("x-forwarded-for")?.split(",")[0].trim() ??
    hdr.get("x-real-ip") ??
    "unknown"
  );
}
