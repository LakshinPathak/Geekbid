# GeekBid CI/CD Fix Report
**Date:** 2026-07-01
**Branch:** v11 (synced to main/master)

## Summary

All 6 documented issues are fixed, plus **2 additional root-cause bugs found during verification** that weren't in the original issue list — one of which is almost certainly the actual reason the pipeline has been "failing every time":

- A real `npm ci` failure (peer dependency conflict) that's masked locally by a global `~/.npmrc` with `legacy-peer-deps=true`, but has no such override on a clean GitHub Actions runner.
- An Alpine/musl `localhost` IPv6-resolution bug in the Docker healthchecks that marked the web container "unhealthy" even though the app was running fine.

## Issues Fixed

| # | Issue | File | Status |
|---|-------|------|--------|
| 1 | Docker build-arg mismatch (Dockerfile declares 7 ARGs, CI only passed 3) | `ci.yml` docker job | ✅ Fixed — all 16 build-args now passed |
| 2 | web/Dockerfile missing ARGs for Cloudinary/Gemini/Admin/Resend vars | `web/Dockerfile` | ✅ Fixed — added all 9 missing ARG+ENV pairs |
| 3 | Lint/typecheck/backend-check silently passing via `\|\| true` | `ci.yml` quality + backend jobs | ✅ Fixed — typecheck and backend check now hard-fail; lint uses `continue-on-error: true` (visible, non-blocking) since it has ~50 pre-existing errors unrelated to this fix — see Remaining TODOs |
| 4 | `deploy-staging` unreachable (`needs: docker`, but `docker` only ran on main/master) | `ci.yml` | ✅ Fixed — added `staging` to the `docker` job's branch condition |
| 5 | No `staging` branch exists — trigger is currently dead | `ci.yml` | ⚠️ Documented, not created — see Remaining TODOs (branch creation wasn't something to do unprompted) |
| 6 | docker-compose.yml web service missing build-args | `docker-compose.yml` | ✅ Fixed — all args added, reading from env vars with sensible dev defaults; also added the same vars to `environment:` since server-side code reads several of them at request time, not just build time |
| **7 (found)** | `npm ci` fails with `ERESOLVE` on a clean environment — `@auth/mongodb-adapter@^3.11.1` requires `mongodb@^6`, but the project uses `mongodb@^7.1.1`. Passes locally only because of a global `~/.npmrc` with `legacy-peer-deps=true` that CI runners don't have | `web/package.json` | ✅ Fixed — removed `@auth/mongodb-adapter` and `next-auth`, both confirmed unused anywhere in `src/` (this app uses its own custom JWT auth, not NextAuth). Regenerated `package-lock.json` |
| **8 (found)** | Both Dockerfiles' `HEALTHCHECK`, and both of docker-compose's `healthcheck.test` entries, use `http://localhost:PORT/...`. On Alpine (musl), `localhost` resolves IPv6 first; the Next.js/Node servers only bind the IPv4 wildcard, so `wget` gets an immediate connection-refused on `::1` with no IPv4 fallback — container reports unhealthy despite the app working | `web/Dockerfile`, `backend/Dockerfile`, `docker-compose.yml` | ✅ Fixed — changed to `127.0.0.1` explicitly in all four healthcheck commands |

Also updated the `on.push.branches` list in `ci.yml` to include `v11` (was still only listing `v10`).

## Local Build Test Results

| Test | Command | Result |
|------|---------|--------|
| TypeScript | `npx tsc --noEmit` | ✅ Clean, 0 errors |
| Lint | `npm run lint` | ⚠️ 125 problems (53 errors, 72 warnings) — unchanged from baseline before this fix, all pre-existing |
| `npm ci` (clean env, no `~/.npmrc`) | `HOME=<empty> npm ci` | ✅ Passes after removing `@auth/mongodb-adapter`/`next-auth` (previously failed with ERESOLVE) |
| Next.js build | `cd web && npm run build` (full placeholder env set) | ✅ Succeeds — all ~70 routes compiled |
| Docker backend | `docker build -t geekbid-backend ./backend` | ✅ Succeeds |
| Docker web | `docker build -t geekbid-web ./web --build-arg ...` (all 16 args) | ✅ Succeeds |
| `docker-compose up --build` | mongodb + backend + web | ✅ All three start; mongodb and backend report `healthy`. The already-running `web` container from before the healthcheck fix still shows `unhealthy` (couldn't be recreated — sandbox blocked container stop/restart in this session), but a **freshly built container from the same image** (`geekbid-web-healthcheck-test`, isolated on port 3005) reports `healthy`, confirming the fix works. Run `docker-compose down && docker-compose up --build -d` to pick it up cleanly. |

### A note on something unrelated found during testing

The backend container's startup log printed a line from the `dotenv` package (v17.4.2, official upstream code in `node_modules/dotenv/lib/main.js`) that reads: `⌁ auth for agents [www.vestauth.com]`. This is confirmed to be a hardcoded promotional "tip" the `dotenv` maintainer ships in recent versions (alongside tips for their own `dotenvx` product) — not a compromise specific to this repo. I did not visit that URL or act on it. Still, a widely-used package randomly printing third-party domains into production logs — one phrased as a call-to-action for "agents" — is bad practice worth avoiding regardless of intent. Recommend pinning `dotenv` to an older version or passing `{ quiet: true }` to suppress the tip output.

## Pipeline Architecture (after fix)

```
push/PR → main, master, v10, v11, staging
                │
                ▼
        ┌───────────────┐
        │ quality        │  lint (visible, non-blocking) + typecheck (blocking)
        └───────┬────────┘
                │
       ┌────────┴────────┐
       ▼                 ▼
┌─────────────┐   ┌──────────────┐
│ build (web)  │   │ backend      │  npm run build w/ full env   │  node --check on all 7 services
└──────┬──────┘   └──────┬───────┘
       └────────┬────────┘
                ▼
        ┌───────────────┐
        │ docker         │  only on main/master/staging
        │ (backend+web,  │  builds both images with full build-arg sets
        │  full args)    │
        └───────┬────────┘
                │
        ┌───────┴────────┐
        ▼                ▼
┌───────────────┐  ┌──────────────────┐
│ deploy-staging │  │ deploy-production │
│ (staging push) │  │ (main push)       │
└───────────────┘  └──────────────────┘
```

## Remaining TODOs

- [ ] Add actual deploy commands (Railway/Render/Fly.io) — currently placeholders
- [ ] Configure GitHub repo secrets for production: `MONGODB_URI`, `NEXTAUTH_SECRET`, `ADMIN_SECRET_KEY`, `GOOGLE_CLIENT_ID`/`SECRET`, `RAZORPAY_KEY_ID`/`SECRET`, `CLOUDINARY_API_KEY`/`SECRET`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `GEMINI_API_KEY`, `RESEND_API_KEY` — the `docker`/deploy jobs currently only use placeholder values, fine for build validation but deploy jobs will need real secrets wired in via `${{ secrets.X }}` once actual deploy commands are added
- [ ] Create a `staging` branch if the staging workflow is actually going to be used — right now the trigger is valid but dormant since no such branch exists
- [ ] Clear the ~50 pre-existing lint errors, then remove `continue-on-error: true` from the Lint step so it becomes a hard gate again
- [ ] Consider pinning/downgrading `dotenv` or setting `{ quiet: true }` to stop the promotional "tip" log lines in production output
- [ ] `npm audit` reports vulnerabilities in both `web` (5) and `backend` (7) — not addressed here since out of scope for a CI/CD pipeline fix, but worth a separate pass
- [ ] Docker BuildKit flags 18 `SecretsUsedInArgOrEnv` warnings on the web image build (build-time ARG/ENV isn't the ideal way to hand a builder secrets). Since these are placeholder values in CI and the real secrets differ per environment anyway, this is low-priority, but `--secret` mount syntax would be the more correct long-term approach if this becomes a concern
