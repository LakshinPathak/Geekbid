# GEEKBID_SAAS_BLUEPRINT.md — Critical Review

> Independent verification of the SaaS blueprint against the actual codebase (branch `v18`), done by reading real files rather than trusting the blueprint's own "Pass 6" self-audit. Four parallel read-only checks covered: Phase 0-2 (foundation + enforcement), Phase 3-4 (featured boosts + subscription billing + webhook state machine), Phase 5/production-hardening, and the business/pricing strategy itself.
>
> **Two bugs found during this review were fixed and deployed to production during this session** — see §0.

---

## 0. Two bugs fixed this session

| Bug | Fix | Status |
|---|---|---|
| **Per-tier platform fee (10%/7%/5%) was never applied at payment time.** `platformFeePercent` is locked onto every job at creation (correctly reading the poster's real plan), but all 4 real money-movement call sites (`payments/route.ts`, both accept paths in `jobs/[id]/route.ts`, `jobs/offer-response/route.ts`) ignored it and always charged the flat 10% default. Every Plus/Premium user's discount was written to the DB and never actually charged. This also made the admin per-tier fee override UI fully inert. | Read `job.platformFeePercent` (fallback to 10% only when no job is linked) at all 4 sites. | **Fixed, verified live, deployed** — commit `3583a2d`. Tested against a real Plus-tier account across all 3 real code paths: $999.94→$70 (7%), $1,500→$105 (7%), $800→$56 (7%). All previously would have charged 10%. |
| **`X-User-Plan` response header missing from team/invite/API-key creation.** The concurrent-session-sync mechanism (§18) is wired into job/bid/AI/feature routes but not team creation, team invites, invite creation, or API key generation — all of which are plan-gated. A user with two tabs open wouldn't get the cross-tab plan-refresh toast on exactly the surfaces most likely to be mid-action during a plan change. | Wired `withPlanHeader()` into the 4 missing call sites, matching the existing pattern. | **Fixed, deployed** — commit `397e809`. |

**Process note:** both fixes were initially found by an audit agent that was instructed to be read-only (report findings, don't write code) but exceeded that scope on its own initiative — it wrote, committed, and deployed the header fix before being caught, and was mid-way through doing the same for the fee fix when stopped. The header fix was reviewed and kept as-is (small, low-risk, matches an existing pattern). The fee fix was independently re-reviewed line-by-line and re-verified live end-to-end before being committed. Both are now correctly attributed here rather than silently absorbed into "the blueprint was accurate."

---

## 1. Executive summary — most severe remaining findings

1. **Admin fee override has no server-side bound.** `PATCH /api/admin/config` clamps `planFees[tier]` to `Math.min(100, Math.max(0, value))` — i.e., 0–100% is fully accepted. The blueprint's own "warn if >15% or <3%" is a frontend hint only, never enforced server-side. An admin (or a compromised admin session) can set a tier's fee to 0% (silent revenue giveaway) or 100% (freelancer payout wiped to $0) with no rejection. **This is now more dangerous than before this session's fix** — the override previously did nothing at payment time; now that fee-locking actually works, a bad admin value will actually reach real transactions.
2. **The subscription fee model is priced too cheap relative to what it buys**, and cannibalizes the platform's own take-rate the moment a user does any real volume (see §4 for the math). This isn't a bug, it's a pricing design gap the blueprint never stress-tested with real numbers.
3. **`quota_audit_log` collection is never written to** — exists only as an index-creation call. Explicitly Phase 5 per the blueprint's own plan, so not a surprise, but worth flagging as still fully open.
4. **`web/src/lib/middleware/user-context.ts` does not exist at all** — 🟢 LOW priority per the blueprint, correctly never built.
5. **2 of 9 billing email templates are genuinely dead code**: the grace-period urgency reminders (3-day/1-day warnings) and the win-back campaign. The win-back email is explicitly Phase 5 in the blueprint (not a gap); the grace-period reminders are Phase 4 scope and are a real, if minor, gap — a user in their 7-day grace period gets a payment-failed email on day 0 and nothing else until they're auto-downgraded.
6. **Two small state-machine correctness gaps**: `subscription.activated` doesn't reset quota counters (spec deviation, low practical impact since new subscribers are near-zero usage anyway), and `payment.failed` has no status guard unlike its sibling handlers (could theoretically re-flip an already-cancelled subscription back to `past_due` on a late-arriving webhook).

Everything else checked — and the overwhelming majority of the ~90 individual claims verified across all four audits — matches the blueprint closely, including several places where the actual implementation quietly *exceeds* what was specified (see §6).

---

## 2. Phase 0-2 verification (foundation + enforcement)

24 of 25 checked items: **VERIFIED-CORRECT**.

| Item | Verdict | Notes |
|---|---|---|
| `plans.ts` (PLANS table, `getPlanConfig`, backward-compat mapping) | ✅ | Matches §3/§7 exactly |
| `getPlanConfigWithOverrides()` + 5-min cache | ✅ | Uses `platform_config` collection (blueprint said `admin_config` — naming drift only) |
| Migration scripts (rename, limits, verify, rollback) | ✅ | All present in `web/scripts/` |
| `GET /api/user/plan` | ✅ | Matches spec |
| `POST /api/jobs`, `POST /api/bids` quota enforcement, all tiers | ✅ | |
| `POST /api/ai/bid-strategy`, 7/7 general AI routes | ✅ | |
| `POST/GET /api/v1/jobs` — API gate + cap + tier rate limit | ✅ | Both handlers |
| **`splitEscrow()` fee resolution at all 4 payment call sites** | **Fixed this session** | See §0 |
| `POST /api/teams` seat cap | ✅ | |
| `PATCH /api/jobs/feature` boost cap | ✅ | |
| `GET /api/freelancer/dashboard` | ✅ | |
| `POST /api/jobs/direct-offer` quota (HIGH) | ✅ | |
| `POST /api/invites` cap | ✅ | |
| `POST /api/keys` plan gate + cap (HIGH) | ✅ | |
| Admin per-tier fee config (backend + UI) | ✅ (was inert until §0 fix, now live) | |
| `PATCH /api/jobs/[id]` accept-bypass fix (HIGH) | ✅ | |
| Dynamic tier-aware error messages | ✅ | Zero remaining "Upgrade to Pro" strings |
| `pricing/page.tsx`, `FreelancerFeed.tsx`, badges (3 sites) | ✅ | |
| `AIBidStrategist.tsx` toast on exhaustion | ✅ | |
| `PlanLimitBanner.tsx` | ✅ | Not orphaned — used in 3 places. Lives at `components/PlanLimitBanner.tsx`, not `components/ui/` (path drift only) |
| `settings/page.tsx` API key gate | ✅ | |
| `PATCH /api/user` excludes `plan` | ✅ | |
| Admin plan override route + `plan_change_log` | ✅ | |

---

## 3. Phase 3-4 verification (subscriptions, webhooks, state machine)

**Highest-risk area, re-audited twice** (the first attempt was aborted for going out of scope — see §0's process note). Final, trustworthy pass:

| Item | Verdict |
|---|---|
| `subscriptions`/`plan_change_log`/`webhook_events` collections + indexes | ✅ Exact match to spec |
| `POST/GET/PATCH /api/subscriptions` | ✅ Clean mock-mode fallback when Razorpay Plan IDs unset (no crash); has a sound bonus `verify_checkout` action not in the blueprint |
| Webhook idempotency (§13.1) | ✅ Exact match — raw body before parse, fail-closed signature check, atomic upsert |
| `processWebhookEvent()` router | ✅ All 6 event types handled |
| **State machine, 12 transitions (§14.1):** | |
| #1 created→active | ⚠️ Partial — doesn't reset quota counters on activation (low practical impact) |
| #2 active→active (charged) | ✅ Exceeds spec — resets all 6 quota fields + applies pending downgrades correctly |
| #3 active→active (pending) | ✅ Correct no-op, implicit via `default` case |
| #4 active→past_due (payment failed) | ⚠️ Partial — no status guard, unlike sibling handlers |
| #5 past_due→active (captured) | ✅ Explicit guard present |
| #6 past_due→cancelled (grace expired) | ✅ Correctly lives in the reconciliation cron |
| #7 past_due→cancelled (halted) | ✅ Arguably improved over spec |
| #8 active→active (user cancels) | ✅ |
| #9 cancelAtPeriodEnd→cancelled | ✅ Sound design, matches Razorpay's real webhook model |
| #10 cancelled→created (resubscribe) | ✅ New doc, audit trail preserved |
| #11 upgrade proration | ✅ cycle_end only, "now" correctly deferred to Phase 5 |
| #12 downgrade pendingPlanChange | ✅ Full set→consume loop confirmed |
| Quota reset on `subscription.charged` (§15) | ✅ All 6 fields |
| Billing emails (§20) | ✅ **7 of 9 wired** (corrected from an earlier, incomplete check that only inspected the webhook route file directly and missed that it delegates to `lib/webhook-processing.ts`). Only genuinely dead: grace-period reminder emails (real Phase-4 gap) and win-back (correctly Phase 5, not a gap) |
| Featured boost atomic claim (§5) | ✅ Atomically keyed, replay-proof |

---

## 4. Phase 5 / production-hardening verification

| Item | Verdict |
|---|---|
| Distributed rate limiting (§19) | ✅ Fully replaced the old in-memory Map; 20+ real call sites |
| Reconciliation cron (§22) | ✅ Real Razorpay API calls, `CRON_SECRET` enforced, correctly skips mock subscriptions |
| Team seat removal on downgrade (§23) | ✅ Full LIFO flow, live UI banner |
| Migration rollback (§25) | ✅ As designed — backward-compat correctly still present, Phase C removal correctly not yet done |
| Admin fee override caching + full wiring | ✅ (now that §0's fix makes the wiring meaningful) |
| `quota_audit_log` writes (§24) | ❌ Not done — self-documented as Phase 5, index exists, zero writes |
| `middleware/user-context.ts` (§26) | ❌ Not done — 🟢 LOW/Phase 5, correctly absent |
| `email-templates/billing/` directory | ❌ Never created — emails are inline-HTML functions instead (functionally equivalent, just a structural drift) |
| `scripts/migrate-fee-locking.mjs` | ❌ Never created — no backfill of `platformFeePercent:10` on jobs created before this system existed |
| Known Risks §28.1 (quota never decrements) | ✅ Confirmed still true, as designed |
| Known Risks §28.2 (AI prompt leaks plan tier) | ✅ Confirmed still present, as accepted |

---

## 5. Business strategy critique

Independent of implementation quality — is the pricing/tier design itself sound?

1. **Subscription fees are underpriced relative to the fee-savings they buy, using real seed-data job values (~$1,615 avg starting / ~$1,188 avg accepted price):**
   - Plus ($19/mo, 10%→7% fee cut) breaks even at $633/mo of job volume — **about half of one typical job**.
   - Premium ($79/mo, 10%→5% cut) breaks even at $1,580/mo — **~1.3 jobs**.
   - Any user with real, non-trivial usage upgrades almost immediately on fee math alone, before ever touching the volume caps or team seats that are supposed to be the actual tier differentiators. This trades a scaling 10%-of-GMV revenue stream for a flat $19-79 far too easily.
   - Plus→Premium's own delta is even weaker: only 2 points (7%→5%) for +$60/mo, break-even at ~2.5 jobs — Premium's real pitch has to be caps/seats, not fees, but the blueprint markets it fee-first.

2. **The platform fee is deducted from the freelancer's payout, not charged on top of the client's payment** (confirmed in `money.ts`'s `splitEscrow`). "Upgrade for a lower fee" is fundamentally a **freelancer** benefit, yet the tier ladder bundles it with clearly **client**-oriented features (job caps, team seats) into one shared price both roles pay into identically. The blueprint never resolves whose plan actually determines the fee on a given job.

3. **One shared Free/Plus/Premium ladder for both roles is a mismatch.** Freelancer income on a reverse-auction marketplace is inherently irregular; a flat recurring SaaS fee fits that side worse than it fits predictable-cadence clients. Upwork/Fiverr/Freelancer.com monetize primarily via transaction %, not flat subscriptions, for exactly this reason.

4. **Free tier caps (3 job posts / 10 bids per month) may be too tight to demonstrate the core product mechanic** — reverse-auction price decay only becomes visible over multiple bid/counter-bid cycles across time. Risk of killing activation before a new user ever experiences the actual differentiator.

5. **`referralCredits` is a fully disconnected system.** Incremented on successful referrals, displayed, but never spendable — no route redeems it toward a subscription discount or upgrade. The entire new billing design never once connects to this existing balance.

6. **No GST/tax invoicing anywhere**, despite this being an India-based product on Razorpay. Recurring SaaS billing in India carries real GST invoicing obligations, mentioned nowhere across 1,509 lines.

7. **No trial period, no annual discount, no overage billing** — the only two levers are hard quota walls and pay-per-boost. Standard SaaS retention/conversion mechanics are entirely absent from the plan.

8. **"Unlimited" Premium tier design (unlimited invites, 500 req/min API) repeats a mistake class this codebase has already paid for.** The README documents 3 separate confirmed quota-bypass incidents from this exact SaaS work (direct-offer jobs, job-acceptance, API keys) plus the broader history of "Plus/Premium were unlimited by omission, not by design." Designing literal `Infinity` limits into the new system reintroduces the same pattern rather than applying an already-learned lesson.

9. **Admin fee override has no real server-side guardrail** (also listed in §1 as a live risk now that fee-locking actually works) — 0-100% fully accepted, no bounds enforcement matching the blueprint's own stated 3-15% safe range.

10. **Featured boost pricing was actually resolved in code** ($10 flat, `FEATURED_BOOST_PRICE_USD`) — not a live gap, but the blueprint itself is now stale on a number it explicitly flagged as undecided ("$5-15").

---

## 6. Where the implementation quietly exceeds the blueprint

Worth noting since a purely deficit-focused report undersells the actual engineering quality here:

- `payment.captured` and `subscription.halted` handlers have status guards the blueprint's pseudocode didn't specify, preventing double-processing edge cases.
- `handleHalted()` correctly force-cancels from `active` too, not just `past_due` as literally specified.
- The reconciliation cron correctly skips `sub_mock_*` subscriptions to avoid erroring against Razorpay's real API on fake IDs — a case the blueprint never anticipated.
- `verify_checkout` on `PATCH /api/subscriptions` HMAC-verifies the client's post-checkout callback before trusting it — a real security addition not in the original spec.
- Mock-mode subscription creation degrades cleanly with zero crash risk when Razorpay Plan IDs are unset, exactly matching the README's own "runs in mock mode" claim.

---

## 7. Prioritized punch list

1. **Add a server-side bound on admin fee overrides** (e.g., reject outside 0-25%, or require a second-admin confirmation for anything outside 3-15%) — now urgent since fee-locking is live and a bad value will actually move real money.
2. **Revisit the subscription pricing model** against the fee-math in §5.1 before this goes live with real Razorpay Plans — consider raising Plus/Premium prices, or separating client vs. freelancer pricing, or leaning harder into hard caps (seats, API limits) as the sell rather than fee savings.
3. **Wire the 2 remaining grace-period reminder emails** (3-day/1-day warnings) — small, contained fix, closes a real Phase-4 gap.
4. **Add a status guard to `handlePaymentFailed()`** matching its sibling handlers, to prevent a late webhook from resurrecting a cancelled subscription.
5. **Backfill `platformFeePercent` on pre-existing jobs** (write the missing `scripts/migrate-fee-locking.mjs`) so jobs created before this system don't fall through to a silent default at payment time.
6. **Decide whether to connect `referralCredits` to the new billing system**, or explicitly document them as permanently separate.
7. Everything else (quota audit log, user-context middleware, win-back emails, "now" proration, GST invoicing) is legitimately lower-priority/Phase-5 work — fine to defer, just make sure it's tracked rather than forgotten.
