import "server-only";
import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side client for the Express microservices, reached through the gateway.
 *
 * This is the single seam of the BFF (backend-for-frontend) layer: Next.js route
 * handlers call `proxyToBackend` / `backendFetch` to forward the caller's request
 * to the gateway, and it normalizes the two contract mismatches in one place:
 *
 *  1. Envelope — services reply `{ success, data }` / `{ success, error }`; the
 *     frontend expects raw JSON. We unwrap `data` and re-surface errors verbatim.
 *  2. Auth — we forward the incoming Bearer token untouched. The services share
 *     the web app's NEXTAUTH_SECRET (as JWT_SECRET), so the token verifies as-is.
 *
 * Nothing here is ever bundled to the client (`server-only`), so the gateway URL
 * and internal topology stay private.
 */

const GATEWAY_URL =
  process.env.BACKEND_GATEWAY_URL?.replace(/\/$/, "") || "http://127.0.0.1:8080";

export type BackendResult<T = unknown> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string; code?: string };

/** Low-level call to a gateway path. Returns a normalized result (never throws on HTTP errors). */
export async function backendFetch<T = unknown>(
  path: string,
  init: {
    method?: string;
    token?: string | null;
    body?: unknown;
    headers?: Record<string, string>;
    /** Pass a raw string/Buffer body through untouched (e.g. webhooks). */
    rawBody?: string;
    signal?: AbortSignal;
  } = {}
): Promise<BackendResult<T>> {
  const url = `${GATEWAY_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = { ...(init.headers ?? {}) };

  if (init.token) headers["authorization"] = `Bearer ${init.token}`;

  let body: string | undefined;
  if (init.rawBody != null) {
    body = init.rawBody;
  } else if (init.body != null) {
    headers["content-type"] = headers["content-type"] ?? "application/json";
    body = JSON.stringify(init.body);
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? "GET",
      headers,
      body,
      signal: init.signal,
      // Server-to-server; never send/forward browser cookies to the gateway.
      cache: "no-store",
    });
  } catch (err) {
    return {
      ok: false,
      status: 502,
      error: "Backend gateway unreachable",
      code: "ERR_BAD_GATEWAY",
    };
  }

  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      // Non-JSON upstream body (should not happen for our services)
      return res.ok
        ? { ok: true, status: res.status, data: text as unknown as T }
        : { ok: false, status: res.status, error: text || res.statusText };
    }
  }

  // Unwrap the service envelope: { success, data } / { success, error }
  if (parsed && typeof parsed === "object" && "success" in parsed) {
    const env = parsed as {
      success: boolean;
      data?: T;
      error?: { code?: string; message?: string };
    };
    if (env.success) {
      return { ok: true, status: res.status, data: (env.data ?? {}) as T };
    }
    return {
      ok: false,
      status: res.status,
      error: env.error?.message ?? "Request failed",
      code: env.error?.code,
    };
  }

  // Upstream returned bare JSON (no envelope) — pass through as-is.
  if (res.ok) return { ok: true, status: res.status, data: parsed as T };
  return {
    ok: false,
    status: res.status,
    error:
      (parsed as { error?: string })?.error ?? res.statusText ?? "Request failed",
  };
}

/** Extract the Bearer token from an incoming NextRequest, if present. */
export function tokenFromRequest(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  return auth?.startsWith("Bearer ") ? auth.slice(7) : null;
}

/**
 * Forward an incoming route request to a gateway path and return a NextResponse
 * whose body is the unwrapped `data` (or `{ error }` on failure) with the
 * upstream status — i.e. exactly the shape the frontend already consumes.
 *
 * `pathOverride` lets a Next route (e.g. `/api/jobs`) target a differently-shaped
 * service path (e.g. `/v1/jobs`); default reuses the incoming path after `/api`.
 */
export async function proxyToBackend(
  req: NextRequest,
  pathOverride?: string,
  opts: { body?: unknown; unwrapKey?: string } = {}
): Promise<NextResponse> {
  const method = req.method.toUpperCase();
  const gatewayPath =
    pathOverride ??
    req.nextUrl.pathname.replace(/^\/api/, "/v1") + (req.nextUrl.search || "");

  let body = opts.body;
  if (body === undefined && method !== "GET" && method !== "DELETE") {
    body = await req.json().catch(() => undefined);
  }

  const result = await backendFetch(gatewayPath, {
    method,
    token: tokenFromRequest(req),
    body,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  // Optionally lift a nested key (services often wrap lists like { jobs: [...] })
  const payload =
    opts.unwrapKey && result.data && typeof result.data === "object"
      ? (result.data as Record<string, unknown>)[opts.unwrapKey] ?? result.data
      : result.data;

  return NextResponse.json(payload, { status: result.status });
}
