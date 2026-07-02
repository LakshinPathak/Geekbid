/**
 * GeekBid API Gateway — reverse proxy in front of the microservices.
 *
 * This is the single door the Next.js BFF layer forwards to. It streams each
 * request straight through to the owning service (preserving method, headers,
 * body) and streams the response back untouched — so downstream services keep
 * full control of their own `{ success, data }` envelope, auth, and status codes.
 *
 * No body parsing here on purpose: parsing then re-serializing would corrupt
 * webhooks (raw-body signature checks) and waste memory. We pipe the raw stream.
 */
const http = require('http');
const helmet = require('helmet');
const express = require('express');

// ── Service registry: path prefix → upstream host:port ────────────────────────
const HOST = process.env.SERVICE_HOST || '127.0.0.1';
const UPSTREAMS = {
  auth: Number(process.env.AUTH_PORT || 3001),
  jobs: Number(process.env.JOB_PORT || 3003),
  bidding: Number(process.env.BIDDING_PORT || 3004),
  payments: Number(process.env.PAYMENT_PORT || 3005),
  notifications: Number(process.env.NOTIFICATION_PORT || 3006),
  chat: Number(process.env.CHAT_PORT || 3007),
};

/**
 * Map an incoming request path to the upstream service that owns it.
 * Order matters only in that every branch is a distinct, non-overlapping prefix.
 */
function resolveUpstream(pathname) {
  if (pathname.startsWith('/v1/auth')) return UPSTREAMS.auth;
  if (pathname.startsWith('/v1/users')) return UPSTREAMS.auth;
  if (pathname.startsWith('/v1/jobs')) return UPSTREAMS.jobs;
  if (pathname.startsWith('/v1/bids')) return UPSTREAMS.bidding;
  if (pathname.startsWith('/v1/payments')) return UPSTREAMS.payments;
  if (pathname.startsWith('/v1/transactions')) return UPSTREAMS.payments;
  if (pathname.startsWith('/v1/disputes')) return UPSTREAMS.payments;
  if (pathname.startsWith('/v1/notifications')) return UPSTREAMS.notifications;
  if (pathname.startsWith('/v1/chat')) return UPSTREAMS.chat;
  return null;
}

// ── CORS allowlist (the BFF is same-origin, so this is a backstop) ────────────
const ALLOWED_ORIGINS = (process.env.GATEWAY_ALLOWED_ORIGINS ||
  'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const app = express();
app.use(helmet());

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type,Authorization,X-Razorpay-Signature'
    );
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// ── Gateway metadata ──────────────────────────────────────────────────────────
app.get('/v1', (_req, res) =>
  res.json({ success: true, data: { name: 'GeekBid Gateway', status: 'ok' } })
);

app.get('/v1/info', (_req, res) =>
  res.json({
    success: true,
    data: {
      services: Object.fromEntries(
        Object.entries(UPSTREAMS).map(([k, port]) => [k, `http://${HOST}:${port}/v1`])
      ),
    },
  })
);

/**
 * Aggregate health: pings every upstream /health and reports per-service status.
 * Returns 200 only when all services are reachable, else 503 — so the dev
 * orchestrator / load balancer can gate on the gateway being fully wired.
 */
app.get('/health', async (_req, res) => {
  const entries = Object.entries(UPSTREAMS);
  const results = await Promise.all(
    entries.map(
      ([name, port]) =>
        new Promise((resolve) => {
          const r = http.get(
            { host: HOST, port, path: '/health', timeout: 2000 },
            (up) => {
              up.resume();
              resolve([name, up.statusCode === 200 ? 'up' : 'degraded']);
            }
          );
          r.on('error', () => resolve([name, 'down']));
          r.on('timeout', () => {
            r.destroy();
            resolve([name, 'down']);
          });
        })
    )
  );
  const status = Object.fromEntries(results);
  const allUp = results.every(([, s]) => s === 'up');
  res.status(allUp ? 200 : 503).json({ ok: allUp, services: status });
});

// ── Reverse proxy: everything under /v1/* streams to its owning service ───────
app.use((req, res) => {
  const port = resolveUpstream(req.path);
  if (!port) {
    return res
      .status(404)
      .json({ success: false, error: { code: 'ERR_NO_ROUTE', message: `No upstream for ${req.path}` } });
  }

  // Rebuild the forwarded headers, dropping hop-by-hop ones. Preserve
  // Authorization and Content-Type; set X-Forwarded-* for downstream logging.
  const headers = { ...req.headers };
  delete headers['host'];
  delete headers['connection'];
  headers['x-forwarded-host'] = req.headers.host || '';
  headers['x-forwarded-for'] =
    (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'] + ', ' : '') +
    (req.socket.remoteAddress || '');

  const upstreamReq = http.request(
    {
      host: HOST,
      port,
      method: req.method,
      path: req.originalUrl,
      headers,
      timeout: 30000,
    },
    (upstreamRes) => {
      res.status(upstreamRes.statusCode || 502);
      for (const [k, v] of Object.entries(upstreamRes.headers)) {
        if (k === 'transfer-encoding' || k === 'connection') continue;
        res.setHeader(k, v);
      }
      upstreamRes.pipe(res);
    }
  );

  upstreamReq.on('error', (err) => {
    if (!res.headersSent) {
      res.status(502).json({
        success: false,
        error: { code: 'ERR_BAD_GATEWAY', message: `Upstream unavailable: ${err.code || err.message}` },
      });
    } else {
      res.destroy();
    }
  });

  upstreamReq.on('timeout', () => {
    upstreamReq.destroy();
    if (!res.headersSent) {
      res.status(504).json({
        success: false,
        error: { code: 'ERR_GATEWAY_TIMEOUT', message: 'Upstream timed out' },
      });
    }
  });

  // Stream the raw client request body straight to the upstream.
  req.pipe(upstreamReq);
});

const port = Number(process.env.GATEWAY_PORT || 8080);
app.listen(port, () => console.log(`[gateway] reverse proxy running on :${port}`));
