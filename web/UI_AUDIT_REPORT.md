# Landing Page UI Audit — GeekBid (`/`)

Audited live at `http://localhost:3000/` with Playwright MCP across desktop (1440px), tablet (768px), and mobile (390px) viewports. Scope: landing page only, including responsiveness.

---

## P1 — High severity

### 1. "Five stations" mechanism diagram — all node labels clipped/invisible — ✅ FIXED
**Where:** `web/src/components/landing/MechanismTrace.tsx` (the dark "Five stations, running continuously" section)
**Reproduces on:** desktop, tablet, and mobile — not a responsive-only bug.
**Status:** fixed — `viewBox` widened from `"0 0 600 160"` to `"-40 -20 680 200"` so all five labels sit fully inside the box. Verified by screenshot at 1440px and 390px: "Post", "Decay", "Bid", "Accept", "Escrow" all render in full.

The loop diagram's SVG has `viewBox="0 0 600 160"`, but the station label `<text>` elements are positioned right at or past the edge of that box:

```tsx
const STATIONS = [
  { label: "Post",    x: 100, y: 20,  anchor: "middle", dy: -14 },      // text y = 6   → clipped (above y=0)
  { label: "Decay",   x: 500, y: 20,  anchor: "middle", dy: -14 },      // text y = 6   → clipped (above y=0)
  { label: "Bid",     x: 580, y: 80,  anchor: "start",  dy: 4, dx: 14 },// text x = 594 → clipped (viewBox width = 600)
  { label: "Accept",  x: 300, y: 140, anchor: "middle", dy: 26 },       // text y = 166 → fully outside (height = 160)
  { label: "Escrow",  x: 20,  y: 80,  anchor: "end",    dy: 4, dx: -14 }// text x = 6, extends left of x=0 → clipped
];
```

Effect: "Post" and "Decay" show only the bottom half of their letters, "Accept" is almost entirely invisible below the diagram, and "Bid"/"Escrow" are reduced to a single stray character ("E" / a sliver) at the diagram's left/right edges. This is the most visible bug on the page — a labeled diagram in the hero-adjacent "mechanism" section where 4 of 5 labels are unreadable.

**Fix:** widen the viewBox to add padding, e.g. `viewBox="-30 -14 660 190"`, or pull the node coordinates inward so labels stay within `0–160`/`0–600`. Verify by screenshotting the section after the change — text should be fully visible at every node.

---

### 2. Testimonial avatars broken (CSP blocks the placeholder image host) — ✅ FIXED
**Where:** "Loved by freelancers and clients alike" section
**Console:**
```
Loading the image 'https://randomuser.me/api/portraits/...' violates the following
Content Security Policy directive: "img-src 'self' data: blob: https://res.cloudinary.com https://*.razorpay.com"
```
All 3 testimonial avatars (Derek Olsen, Emma Johnson, Marcus Chen) render as empty gray circles instead of photos — every load, on every viewport.
**Status:** fixed — `web/src/components/landing/data.ts` already had `avatar` initials (`DO`/`EJ`/`MC`) and `CloudinaryAvatar` already had an initials-fallback path built in; the only problem was the dead `photo: "https://randomuser.me/..."` URLs being passed in. Cleared those three `photo` fields to `""`, so the component deterministically renders the initials circle instead of depending on an `onError` firing after a CSP block. Verified: console errors on the landing page dropped from 13 to 1 (the remaining one is the unrelated `/api/jobs` 500, item #6), and all three avatars now show clean initials.

---

## P2 — Medium severity

### 3. Pricing cards: uneven feature-list length leaves large empty gaps — ✅ PARTIALLY FIXED
**Where:** `web/src/components/landing/PricingSection.tsx` (landing-page pricing section; the dedicated `/pricing` route uses its own card markup and wasn't touched — same issue there was noted but not in this file's scope).
The "Plus" card has 8 feature bullets; "Free" has 5 and "Premium" has 6. Because all three cards share a row and stretch to equal height, Free and Premium ended up with a large dead-space gap between their last bullet and the CTA button.
**Status:** improved — the feature `<ul>` was `flex-1` (correctly pinning the CTA to a consistent baseline) but left all its slack below the last item. Added `flex flex-col justify-center` so the list is vertically centered within the available space instead: whitespace is now split above/below the list rather than dumped in one block, which reads as intentional instead of unfinished. A content-level fix (equalizing feature counts, or a "+N more" pattern) would close the gap further but wasn't done here — this was a pure layout tweak.

### 4. Mobile header has no way to reach nav links or Sign In
**Where:** landing page header at ≤390px width.
Desktop/tablet header shows: `How It Works · Compare · Pricing · Testimonials · Sign In · Get Started`. At mobile width, everything collapses to just the logo and a "Get Started" button — no hamburger/menu affordance appears, so mobile visitors have no way to reach **Sign In** (existing users must scroll the entire page hoping to find a login link, which doesn't exist below the fold either) or jump to How It Works/Compare/Testimonials. Confirmed via accessibility snapshot — those five nav items simply aren't present in the mobile DOM, not just visually hidden.
**Fix:** add a mobile menu (hamburger → drawer/sheet) that includes at minimum Sign In, since it's a completely different action from "Get Started."

---

## P3 — Low / informational

### 5. Next.js dev-tools indicator sits over bottom-left content
Not a production bug (`<nextjs-portal>` / "Open Next.js Dev Tools" button, dev-mode only), but it visibly overlaps the footer's first column ("The reverse-auction marketplace for freelance talent.") and the mechanism section heading on mobile, because that content is flush against the bottom-left corner with no safe-area padding. Purely cosmetic in dev, but if a real fixed widget is ever added there (chat bubble, cookie banner), it will collide the same way — worth giving bottom-left/bottom-right page content a little breathing room from the viewport edge.

### 6. `/api/jobs` returns 500 on every landing-page load
**Console:** `Failed to load resource: the server responded with a status of 500 @ /api/jobs`
**Root cause:** no `.env.local` in `web/` (only `.env.example`) — `NEXTAUTH_SECRET` and `MONGODB_URI` are unset, so any route touching auth/DB throws at module-eval time. The landing page itself doesn't visibly break (its hero/ticker numbers are static demo data), so this doesn't produce a visible landing-page bug today — but it's worth fixing so console output is clean and so any future landing-page section that does fetch real data doesn't silently fail. Not something I could fix without real DB/auth credentials.

---

## Verified non-issues (checked, ruled out)
- The typewriter "|" cursor in the login-page headline (not landing page, checked while scoping) — intentional typing animation, not a stray character.
- The dark "Five stations"/"Authority stream" full-bleed bands against an otherwise light page — intentional per the existing design system, not a broken dark-mode toggle.
- Footer text on `/pricing` appearing to touch the left viewport edge at tablet width — measured via `getBoundingClientRect`; the element is correctly inset and centered. Screenshot compression made it look clipped; DOM confirms it isn't.

---

## Motion-concepts artifact — analysis & tie-in to bug #1

Reference: [Five Designers, One Brief — GeekBid Motion Concepts](https://claude.ai/code/artifact/b828f333-703c-4a43-b57d-d5a8c58bcff5)

**What it is:** a motion-design brainstorm doc, not built code — 45 concepts total (5 designer "lanes" × 9 not-yet-built landing-page animation moments), framed as a menu to pick from. The five lanes: Minimalist, Data-viz, Playful/tactile, Cinematic scroll, Systems-diagram. Shared constraints across all five: accent is `#5b21b6` only (no gradients/neon/glow), headings weight 500 (never bold), pill buttons, sparse soft shadows, everything degrades to a static frame under `prefers-reduced-motion`.

**Direct tie-in to bug #1 above:** the doc's Section 3, "Mechanism trace," proposes ambient/traveling-dot animation for the **exact same Post→Decay→Bid→Accept→Escrow loop diagram** that has the label-clipping bug in `MechanismTrace.tsx`. All five designer takes in that section assume the node labels are legible and layer motion on top (ripples, traveling packets, pulsing nodes). Right now most of those labels are invisible, so any of these concepts would ship broken on top of a broken base. **Fix the viewBox clipping first, then layer motion on** — don't animate a diagram whose labels don't render.

**Which lanes fit GeekBid's brand** (per PRODUCT.md: "premium, confident... financial/trading terminal crossed with editorial marketplace," anti-references explicitly rule out generic-AI-SaaS motion):

- **Systems-diagram and Data-viz fit best.** Both treat motion as instrumentation (state-gated escrow, count-ups tied to real deltas, telemetry-style dot traversal) — the "trading terminal" read the brand wants, and the most differentiated of the five against generic SaaS motion.
- **Playful/tactile — avoid wholesale.** It leans on spring/bounce/overshoot easing (squash-and-stretch, "settle-bounce," rubber-stamp thud) on nearly every section, which conflicts with the project's own motion rule (ease-out-quart/quint, no bounce/elastic) and skews the tone younger/friendlier than "Sharp, Trustworthy" calls for.
- **Minimalist** is the safe fallback for anything shipped fast with zero risk of feeling busy — good default, but a full page of it reads a little flat.
- **Cinematic scroll** is the heaviest engineering lift (scroll-pinning, scrubbed progress) — worth spending on one or two high-value moments (the doc's own strongest picks: Section 2 case timeline, Section 7 payoff band) rather than all nine, or it fights the "restraint" side of the brand.
