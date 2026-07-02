#!/usr/bin/env node
/**
 * Full-stack dev orchestrator.
 *
 * Boots the Express backend (all 6 services + gateway, via backend/scripts/dev.js)
 * and, once the gateway reports healthy, starts the Next.js web app. Output from
 * every child is line-prefixed and colorized so a single terminal is legible.
 * Dependency-free on purpose — no concurrently/nodemon needed.
 *
 *   npm run dev            # from repo root
 */
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GATEWAY_PORT = Number(process.env.GATEWAY_PORT || 8080);
const GATEWAY_HEALTH_TIMEOUT_MS = 60_000;

const COLORS = { backend: '\x1b[36m', web: '\x1b[35m', sys: '\x1b[32m', reset: '\x1b[0m' };
function log(tag, line) {
  const color = COLORS[tag] || COLORS.sys;
  process.stdout.write(`${color}[${tag}]${COLORS.reset} ${line}\n`);
}

function pipe(tag, child) {
  const relay = (buf) => {
    buf
      .toString()
      .split('\n')
      .filter((l) => l.length)
      .forEach((l) => log(tag, l));
  };
  child.stdout.on('data', relay);
  child.stderr.on('data', relay);
}

const children = [];
function spawnChild(tag, cmd, args, opts = {}) {
  const child = spawn(cmd, args, { cwd: ROOT, shell: process.platform === 'win32', ...opts });
  pipe(tag, child);
  child.on('exit', (code) => {
    log('sys', `${tag} exited with code ${code}`);
    shutdown(code ?? 0);
  });
  children.push(child);
  return child;
}

function waitForGateway() {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(
        { host: '127.0.0.1', port: GATEWAY_PORT, path: '/health', timeout: 2000 },
        (res) => {
          res.resume();
          // Accept 200 (all up) or 503 (gateway alive, some service still booting)
          if (res.statusCode === 200 || res.statusCode === 503) return resolve();
          retry();
        }
      );
      req.on('error', retry);
      req.on('timeout', () => { req.destroy(); retry(); });
    };
    const retry = () => {
      if (Date.now() - started > GATEWAY_HEALTH_TIMEOUT_MS) {
        return reject(new Error('gateway did not become reachable in time'));
      }
      setTimeout(tick, 800);
    };
    tick();
  });
}

let shuttingDown = false;
function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  log('sys', 'shutting down…');
  for (const c of children) {
    try { c.kill('SIGTERM'); } catch { /* already gone */ }
  }
  setTimeout(() => process.exit(code), 500);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

(async () => {
  log('sys', 'starting backend (services + gateway)…');
  spawnChild('backend', 'npm', ['--prefix', 'backend', 'start']);

  try {
    await waitForGateway();
    log('sys', `gateway reachable on :${GATEWAY_PORT} — starting web…`);
  } catch (err) {
    log('sys', `WARNING: ${err.message}. Starting web anyway.`);
  }

  spawnChild('web', 'npm', ['--prefix', 'web', 'run', 'dev']);
})();
