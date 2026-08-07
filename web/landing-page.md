# GeekBid Landing Page — Full Audit

Audited live at `http://localhost:3000` (Next.js dev server) using Playwright MCP across four viewports, cross-referenced against source in `src/app/page.tsx` and `src/components/landing/*.tsx`. Four parallel audit passes were run — one per viewport — each independently walking every rendered section, capturing screenshots, reading computed styles/`getBoundingClientRect()`, and logging console output. This document leads with a deduped executive summary of everything that recurred across viewports, then includes each viewport's full, unabridged findings.

**Render order** (from `page.tsx`, everything wrapped in `LandingGate`):
`Nav → Hero → PriceDecayShowcase (incl. nested HowItWorks + CaseTimeline) → LiveAuctions → EscrowPerimeter → WhyGeekBidSection (incl. nested Comparison + PricingSection) → Testimonials → FAQ → CTA → Footer`

**Component files:** `src/components/landing/{Nav,Hero,PriceDecayShowcase,LiveAuctions,EscrowPerimeter,WhyGeekBidSection,Comparison,PricingSection,Testimonials,FAQ,CTA,Footer,LandingGate,ScrollProgress,CaseTimeline,PriceDecayDemo,SectionDivider,hooks,data}.tsx/.ts`

**Global page styling:** background `#fbfaf7` (warm off-white), text `#17171f` (near-black), brand purple `#5b21b6`, decay/urgency red `#c14d3a`, success green `#16a34a`. Base wrapper (`LandingGate`) sets `bg-[#fbfaf7] text-[#17171f] overflow-x-hidden`.

**Viewports audited:**
| Codename | Size | Device class |
|---|---|---|
| Mobile | 375×812 | iPhone SE / 13 mini |
| Tablet | 768×1024 | iPad portrait |
| Laptop | 1440×900 | Standard laptop |
| Desktop-XL | 1920×1080 | Full HD desktop |

---

## Executive Summary — Cross-Viewport Findings

### 🔴 Critical bugs (confirmed at every viewport)

1. **Sticky nav is completely broken.** `Nav.tsx` sets `sticky top-0 z-50`, but `LandingGate.tsx` wraps the whole page in a div with only `overflow-x-hidden` set. Per the CSS spec, setting one overflow axis forces the other to compute as `auto` (confirmed live via `getComputedStyle` → `overflow-y: auto`), which turns that div into a scroll container and breaks `position: sticky` for any descendant. Verified via `getBoundingClientRect()` at multiple scroll depths (e.g. `scrollY: 3231` → `nav.getBoundingClientRect().top === -3231`, i.e. scrolling 1:1 with the page instead of pinning). **Practical impact:** once a visitor scrolls past the hero (~1100–1140px), the entire nav — logo, all 5 section links, "Sign In", "Get Started" — disappears for the rest of the page (~8000+px of scroll). Only the thin fixed `ScrollProgress` hairline (uses `position: fixed`, unaffected) remains visible. This affects Live Auctions, Trust, Pricing, Testimonials, FAQ, and CTA — everywhere a "Get Started" impulse click matters most. **Fix:** set `overflow-y: visible` (or restructure to avoid `overflow-x-hidden` on an ancestor of a sticky element) on the `LandingGate` wrapper.
2. **Footer "Company" and "Legal" columns are dead links.** 7 of the footer's 11 nav-style items — "About Us", "Careers", "Blog", "Contact", "Terms of Service", "Privacy Policy", "Cookie Policy" — render as plain `<span>` text with identical styling (color, size, spacing) to the 4 real "Platform" links (`Browse Jobs`, `Post a Job`, `Find Work`, `Pricing`), but have no `href`, no click handler, and no hover state. Visually indistinguishable from working links until clicked. Confirmed at all four viewports.
3. **`GET /api/jobs` returns `500 Internal Server Error`** on every page load (4+ repeated console errors per session, every viewport). Doesn't visibly break any landing content since all "live" data (LiveAuctions grid, MarketTerminal, PriceDecayDemo, Testimonials, stats) is hard-coded/illustrative per in-code comments — but it's a real, repeated server error firing on a route that shouldn't need it pre-auth. Worth backend triage.
4. **Nav's "PRICING" link renders falsely active on initial page load** (solid purple, the "current section" style) while scrolled to the very top of the Hero, nowhere near Pricing. Caught at the Desktop-XL pass via pixel inspection of the nav row. Root cause: `useActiveSection`'s IntersectionObserver (rootMargin `-40% 0px -50% 0px`) appears to mis-fire against pre-hydration/pre-layout DOM state on mount.

### 🟠 Recurring UX gaps

5. **No hamburger menu / mobile nav fallback exists anywhere in `Nav.tsx`.** Below the `md` breakpoint (768px), the 5 section links and "Sign In" simply vanish (`hidden md:flex` / `hidden sm:block`) with **zero replacement affordance** — no menu icon, no drawer, nothing in the DOM. Confirmed via `document.querySelectorAll('nav button, nav svg')` at 375px: only the logo, the (hidden) Sign In button, and Get Started exist. A mobile visitor's only way to reach "How it Works", "Live Auctions", "Trust", "Pricing", "Testimonials" is manual scrolling. At exactly 768px (tablet, the `md` cutoff) the full desktop link row is present with literally zero margin to spare — one pixel narrower and every link disappears with nothing to replace it.
6. **Auto-playing carousels can't be paused by touch.** Both the Hero activity ticker (CSS `animate-marquee`, no pause mechanism at all) and the Testimonials carousel (JS `setInterval` auto-scroll, pause wired to `onMouseEnter`/`onMouseLeave` only) keep moving under touch input, where "hover" never fires — confirmed at Mobile and Tablet passes. This is the single most consistent mobile-specific interaction gap on the page. Testimonials' auto-scroll also has **no `prefers-reduced-motion` check at all** (every other timer-driven widget on the page — PriceDecayDemo, MarketTerminal, LiveAuctions decay, EscrowPerimeter token travel, Hero ticker, FAQ transitions — correctly freezes/simplifies under reduced motion; Testimonials does not).
7. **Comparison table forces horizontal scroll on mobile with no swipe affordance.** `min-w-[500px]` inside a ~343px-wide content column (375px viewport) means the "Traditional" column and the right edge of every row sit off-screen by default, discoverable only via a thin native scrollbar. At tablet (768px) and above the same `min-w-[500px]` fits comfortably and this is a non-issue.
8. **Recurring sub-44px touch targets** across breakpoints where touch applies (mobile/tablet): Nav "Get Started" pill (~31px tall), Nav "Sign In" (~44×15px), individual nav links (~88×15px), LiveAuctions category chips (~33–51px tall), Testimonials nav dots (~6px), Footer links (~20px tall), FAQ `<summary>` row hit-box (~23px tall despite larger visual padding), Hero's non-functional demo "Accept at $…" button (~39px). Primary CTAs (Hero, CTA section, FAQ rows, EscrowPerimeter's "Approve & release") all meet or exceed the ~44px guideline — the gaps cluster on secondary/tertiary controls.
9. **Inconsistent content-column max-width, most visible at Desktop-XL (1920px).** Measured precisely via `getBoundingClientRect()`:

   | Section | Max-width | Side margin at 1920px |
   |---|---|---|
   | Nav / Hero / PriceDecayShowcase / Testimonials / Footer | 1400px | ~258–263px |
   | LiveAuctions | 1320px | ~298–303px |
   | Comparison (in WhyGeekBidSection) | 1024px | ~446–451px |
   | PricingSection (in WhyGeekBidSection) | 1152px | ~384px |
   | EscrowPerimeter (Trust) | 820px | ~548–553px |
   | FAQ | 760px | ~578–583px |
   | CTA headline block | ~1024px | ~448px |

   No two adjacent sections reliably share a column width. At laptop (1440px) and below this mostly disappears behind padding; at 1920px it becomes a real, measurable inconsistency — Trust and FAQ in particular leave 45–60% of the viewport empty on plain, undecorated backgrounds, while Hero/PriceDecayShowcase/LiveAuctions use the extra width purposefully via multi-column grids. Sections that scale well: **PriceDecayShowcase**, **LiveAuctions**, **PricingSection**.

### 🟡 Minor / polish items

10. Footer's 9-dot "constellation" background is dead code — its twinkle animation is explicitly neutered in CSS (`animation: none; opacity: 0`), so the dots render fully invisible at every viewport.
11. Pricing's "Upgrade to Plus" button **lightens** on hover (`#5b21b6 → #7c3aed`) while every other primary CTA on the page (`.btn-primary`) **darkens** on hover (`#4b3f8f → #3d3373`) — an inconsistent hover direction for the same visual role.
12. Hero's `PriceDecayDemo` (right-side card) permanently stops/freezes once its price hits the $800 floor and never resets/loops — a visitor who lingers will eventually see it "go stale" with no replay control. By contrast, the larger `MarketTerminal` in PriceDecayShowcase resets to $4,200 and loops indefinitely.
13. LiveAuctions cards show a hover lift/shadow/border-brighten treatment that implies clickability, but the cards aren't links/clickable — most noticeable on desktop where hover is far more likely to be triggered by casual mouse movement.
14. The Comparison section's anchor (`#compare`) is not included in the Nav's link list (Nav only links to how-it-works/live/trust/pricing/testimonials), so it's reachable only by scrolling past Trust, unlike its sibling Pricing directly below it.
15. At exactly 768px (tablet), `PricingSection`'s own code comment assumes tablet gets a "stacked" layout where the ascending-stairs SVG connector should hide — but 768px is the `md` breakpoint where cards are actually already 3-across, so the stairs render (correctly functionally, but contradicting the code's own assumption) above noticeably cramped ~222px-wide cards.

---

# Viewport Detail: Mobile (375×812)

Audited live at `http://localhost:3000` with the browser viewport forced to 375×812 (iPhone SE / 13 mini class). Findings drawn from real rendered screenshots plus DOM measurements (`getBoundingClientRect`, computed styles) taken in a live session, cross-referenced against source.

Global page background/text: `#fbfaf7` / `#17171f`, set by `LandingGate`'s wrapper div, which also sets `overflow-x-hidden` on the whole page.

## LandingGate (wrapper, not a visible section)

1. **Purpose**: Auth gate + root background wrapper. `src/components/landing/LandingGate.tsx`.
2. **Copy**: None — renders no visible UI of its own.
3. **Creative/visual inventory**: None directly; supplies the page's base background color `#fbfaf7`, text color `#17171f`, and `overflow-x-hidden` inherited by every section.
4. **Layout**: A single wrapping `<div>` around all children; no layout behavior of its own.
5. **Interactive elements**: None.
6. **Animation/motion**: None itself, but it gates *when* children mount: returns `null` until `mounted` is true (client-hydration flag from `useApp()`), and permanently returns `null` (redirecting to `/feed` via `router.replace`) if a logged-in user is detected. No user was logged in during this audit, so content rendered normally after hydration — a logged-out visitor's first paint (before hydration) is a blank white screen with no loading indicator/skeleton.
7. **Mobile-specific issues**: None specific to mobile; the `overflow-x-hidden` here is precisely what prevents the page-level horizontal scrollbar that would otherwise be introduced by the Comparison table and the two carousels (verified: `document.body.scrollWidth` (370px) === `document.documentElement.clientWidth` (370px) → **no page-level horizontal overflow**).

## Nav

1. **Purpose**: Sticky top navigation bar with logo, section-scroll links, and primary CTA.
2. **Verbatim copy**:
   - Logo wordmark: "**Geek**" (dark `#26243A`) + "**Bid**" (`#453B78`)
   - Desktop-only link labels: "How it Works", "Live Auctions", "Trust", "Pricing", "Testimonials"
   - "Sign In" (desktop-only button)
   - "Get Started" (always-visible button, with an arrow glyph)
3. **Creative/visual inventory**:
   - Logo mark: 60×60 viewBox SVG — solid dark-purple circle (`#453B78`), two white bracket strokes forming `< >`, small green dot (`#4ADE80`) center — rendered `h-7 w-7` (28px).
   - Hairline bottom border (`rgba(91,33,182,0.22)`) separates nav from content.
   - `ScrollProgress`: thin horizontal bar pinned to the top edge (`.landing-scroll-progress`) that grows in width as the user scrolls — confirmed visually growing from a small nub near the top to a fuller bar by CTA/Footer.
   - "Get Started" button: solid purple pill (`btn-primary`) with a diagonal `ArrowUpRight` icon.
4. **Layout at 375px**: `flex h-14 items-center justify-between`, `px-8`, capped `max-w-[1400px]`. Only **two elements are visible**: logo (left) and "Get Started" pill (right).
   - Middle link cluster (`NAV_LINKS`) is `hidden md:flex` — confirmed `display: none` at 375px; appears only ≥768px.
   - "Sign In" is `hidden sm:block` — confirmed 0×0 bounding rect at 375px; appears only ≥640px.
5. **Interactive elements**:
   - "Get Started" → `Link href="/login?tab=register&role=client"`. Measured **130×31px** — below the ~44px recommended tap target; it's the only persistently-reachable interactive nav element on mobile.
   - "Sign In" and the 5 section links: present in DOM but fully inaccessible on mobile.
6. **Animation/motion**: Logo translates 2px on `group-hover` (desktop-only). Nav links get `hover:text-[#5b21b6]` + active-state styling driven by `useActiveSection` (moot on mobile since links aren't rendered). `ScrollProgress` animates continuously via rAF-throttled scroll listener.
7. **Mobile-specific issues**:
   - **No hamburger menu / drawer exists at all**, verified both visually and via `document.querySelectorAll('nav button, nav svg')` (only logo, hidden Sign In, Get Started + its icon — no menu-toggle or off-canvas markup anywhere). Five primary nav destinations are completely unreachable via any control on mobile.
   - "Get Started" pill height (31px) is under the 44px guideline.
   - Sign In fully hidden with no fast path to login elsewhere (footer has no login link either).

### Hero

1. **Purpose**: Above-the-fold pitch — headline, subhead, dual CTA, trust badges, a live price-decay demo card, and a scrolling activity ticker.
2. **Verbatim copy**:
   - Eyebrow badge: "**Live · Reverse Auction Platform**" (pulsing purple dot)
   - H1: "**Hire freelancers**" / "**at the right price**" (second line `landing-emphasis`, terracotta `#c14d3a`-family accent)
   - Body: "The reverse-auction pricing engine for freelance talent. Post a job, watch the price decay to true market rate, hire at your sweet spot — free to start, and paid plans that cut your platform fee to as low as 5%."
   - Primary CTA: "**Start Free**" (right-arrow icon)
   - Secondary CTA: "**See Pricing**" (`Code` "&lt;&gt;" icon)
   - Trust badges (4): "🔒 Escrow Protected", "⚡ &lt; 4hr Match Time", "🛡️ Dispute Resolution", "✨ No Upfront Fees"
   - Activity ticker (12 items, 6 unique, duplicated): "⚡ AI Chatbot · $2,450 → accepted in 6h", "🔒 Kubernetes Hardening · $1,100 · escrow released", "🔥 DeFi Audit · $2,200 · 8 bids competing", "🎨 Logo Design · $650 · 5 bids competing", "✍️ Blog Content · $480 · matched in 3h 20m", "🎬 Explainer Video · $1,500 · hired at $900"
3. **Creative/visual inventory**:
   - Full-bleed animated gradient mesh (`.landing-mesh-bg`) + grain overlay (`.landing-grain-overlay`) + mouse-follow radial glow (`.landing-mouse-glow`, fine-pointer only via `usePointerFine` — inert on touch, no listener attached).
   - 10 small floating "ember" particles (purple dots `bg-[#5b21b6]`, 2–4px) drifting upward on staggered timers (`animate-ember`), fixed hand-authored positions (avoids SSR hydration mismatch).
   - Faint animated dot-grid background (32px grid, `animate-hero-grid`).
   - Subtle horizontal "CRT scan-line" sweep (`.hero-scan-line`).
   - Three large soft blurred "breathing" glow blobs in purple tones, staggered.
   - 1px top hairline gradient.
   - Right-side `PriceDecayDemo` widget (see below).
   - Ticker strip: left/right gradient fade-masks + center radial "glow highlight" so items brighten crossing center.
4. **Layout at 375px**: Two-column desktop grid collapses to a single stacked column: badge → H1 → paragraph → CTA row → trust badges, center-aligned, followed by the `PriceDecayDemo` card (full width, `max-w-sm`, centered). Ticker sits full-width beneath. CTAs stack vertically ("Start Free" then "See Pricing"). Trust badges wrap onto 2 lines.
5. **Interactive elements**:
   - "Start Free" → `/login?tab=register&role=client`. Measured **180×56px** — comfortably above 44px minimum.
   - "See Pricing" → smooth-scrolls to `#pricing`. Measured **191×58px**.
   - Trust badges static, non-interactive.
   - Ticker items non-interactive.
6. **Animation/motion**:
   - Staggered fade-up entrance: badge → per-word headline reveal → line 2 → paragraph → CTAs → trust badges (0–~1000ms).
   - Demo card fades in from the right.
   - Ticker becomes visible/animates once scrolled into view (`useInView(0.4)`), then runs continuous `animate-marquee` — **auto-playing, non-stoppable on mobile** (desktop pause is `onMouseEnter`-only, never fires on touch).
   - Under `prefers-reduced-motion`, marquee class drops and shows a static strip instead — correct a11y fallback.
   - Ambient glows/particles/scan-line/dot-grid animate continuously, purely decorative (`aria-hidden`/`pointer-events-none`).
7. **Mobile-specific issues**: None layout-breaking; text legible, no overflow. Ticker un-pausable by touch (see Executive Summary #6). No "cheaper on mobile" branch for the always-on ambient animation set — battery/perf consideration, not a visible break.

#### PriceDecayDemo (embedded in Hero)

1. **Purpose**: Self-contained, auto-playing "live price decay" demo card — the page's first concrete illustration of the reverse-auction mechanic.
2. **Verbatim copy**: "Live Price Decay" / "AI Chatbot Development" / badge "LIVE". Price line + "↘ -$25/hr". "Floor: $800" / "Start: $2,400". Stat tiles "Bids"/"Watching"/"Left" ("7", "23", countdown). Button "Accept at $&lt;current price&gt;".
3. **Creative/visual inventory**: White rounded card, purple-tinted border, animated glow (`animate-card-border-glow`) + a free-floating blurred glow orb behind it restarting every tick. Pulsing "LIVE" pill (`animate-live-breathe`). 2px decay progress bar with shimmer sweep. Spark particles burst near the price every 3rd tick. 3-column stat grid. Full-width purple "Accept at $…" footer button.
4. **Layout at 375px**: Single card, `max-w-sm`, centered under hero copy; 3-stat grid stays 3 columns.
5. **Interactive elements**: "Accept at $…" button — full width, **non-functional** (no `onClick`/link, purely illustrative). Measured **39px** tall, under 44px guideline (moot since inert).
6. **Animation/motion**: Auto-plays on a 120ms interval, price ticks down from $2,400 toward $800, "Left" countdown moves in lockstep, **stops permanently at $800** (interval cleared, no reset/loop) — a lingering visitor eventually sees it "go stale" with no replay. Border-glow/sparks/shimmer run until then. Under `prefers-reduced-motion`, interval never starts; card freezes at $2,400.
7. **Mobile-specific issues**: None layout-breaking; the no-replay-at-floor behavior is a content/polish issue more likely witnessed on mobile due to longer dwell time.

### PriceDecayShowcase (id `how-it-works`) — includes MarketTerminal + HowItWorks

1. **Purpose**: The centerpiece explainer — a second, larger "live" price-decay terminal, a 4-step "how it works" breakdown, a collapsible pricing-formula code sample, and a collapsible real-case walkthrough.
2. **Verbatim copy**:
   - H2: "**The price is never fixed. It's falling right now.**"
   - Subhead: "Every job on GeekBid starts high and decays automatically — hour by hour — until a freelancer accepts or the client awards the lowest bid. No haggling. No back-and-forth emails. Just the market finding its real number, live."
   - Ghost button: "**See how decay works**" (scrolls to `#how-it-works`, i.e. itself)
   - MarketTerminal header: "Live Market" / mono tag "GB-AUCTION//01"
   - MarketTerminal body: "Kubernetes Migration"; price $4,200 decaying to $1,450 then resetting; "↘ −$40/tick"; decay bar; "Floor $1,450" / "Start $4,200"; "Activity" log rotating through a 10-item pool (e.g. "sarah_dev bid $3,180 on Kubernetes Migration", "Job accepted at $1,920 — DeFi Smart Contract Audit", "14 freelancers watching · React Native Rebuild"); footnote "Illustrative example — not a real job or live market data."
   - HowItWorks H3: "From posting to payment in **four** simple steps"
   - Subhead: "Traditional hiring is slow, expensive, and opaque. GeekBid's algorithmic pricing finds the true market rate automatically."
   - 4 step cards ("01"–"04"): **Post Your Project** — "Define scope, set a starting price and floor, choose the decay rate. Your job goes live instantly." **Watch Prices Drop** — "Our engine decreases the price every hour. Freelancers monitor and bid when the price hits their sweet spot." **Review & Accept** — "Compare GeekScores, review counter-bids, and chat with candidates. Accept the best match with one click." **Escrow & Deliver** — "Payment locks in escrow automatically. Release funds when the work ships. Dispute resolution if needed."
   - Toggle 1: "◈ View the Price Decay Formula ◈" → code block (`const currentPrice = max(startPrice - (decayRate * hoursElapsed), floorPrice);`) + "Prices never go below your configured minimum. You control the speed."
   - Toggle 2: "◈ See a real case, start to finish ◈" → `CaseTimeline` ("Payment Fraud-Detection Service", $3,200 → $1,480 accepted).
3. **Creative/visual inventory**: Layered radial purple gradients over off-white base + top hairline rule. MarketTerminal: white/blur card, purple border, pulsing live-dot header, giant tabular-nums price in terracotta that "ticks" (scale/opacity pulse every 900ms), rounded decay bar, bordered Activity sub-panel with `›`-prefixed lines that truncate with ellipsis. Step cards: glassmorphic, colored icon tiles (green/purple/amber/purple), mono step-number badge, 3D tilt-on-hover (inert on touch — correct, cards sit flat/static on mobile). Dashed connector lines between step cards are **desktop-only** (`hidden lg:flex`), absent in mobile stack.
4. **Layout at 375px**: 2-column grid collapses to single stacked column — H2/subhead/button, then full MarketTerminal card. Step-card grid becomes a **single-column stack of 4 full-width cards** (connectors hidden). Both `<details>` toggles stack full-width beneath.
5. **Interactive elements**: "See how decay works" ghost button scrolls to the section's own top (slightly odd — it re-scrolls to a heading it's already inside rather than deep-linking further down). Two native `<details>/<summary>` accordions, no JS state.
6. **Animation/motion**: MarketTerminal decays every 900ms by $40, resetting at floor — **runs indefinitely** (unlike Hero's demo, which stops at floor). New activity line every 2,200ms, keeps latest 4 with fading opacity. Under `prefers-reduced-motion`, intervals never start; log shows one static line. Section fades/slides in on scroll (`useInView(0.15)`, 800ms safety-net). Step-card icons stagger-pop in.
7. **Mobile-specific issues**: MarketTerminal activity log lines truncate with ellipsis (e.g. "marcus_k bid $2,640 on ML Recomm…") — acceptable for a decorative feed, occasionally cuts mid-word. No other overflow/broken layout at 375px.

### LiveAuctions (id `live`)

1. **Purpose**: "Right now on GeekBid" — a filterable grid of 6 independently live-decaying auction cards; absorbs the former standalone "Categories" section as filter chips.
2. **Verbatim copy**:
   - Eyebrow: "Right now on GeekBid" (pulsing dot)
   - H2: "**Live auctions dropping**"
   - Link: "**Browse all auctions →**" (`/feed`)
   - Category chips: "All", "Design 214", "Development 381", "Writing 156", "Marketing 129", "Video & Animation 97", "Data & AI 143"
   - Active-category stat line: "**{avgDrop}%** avg price drop" / "**{timeToHire}** median time-to-hire" (e.g. Design: 46% / 5h 40m)
   - 6 auction cards: category pill, "&lt;time&gt; left" countdown, title, current price + strikethrough original, progress bar, "N freelancers bidding". Titles: "Landing page for fintech app" (Design), "React dashboard rebuild" (Development), "20 blog posts on SaaS pricing" (Writing), "Launch campaign for D2C skincare brand" (Marketing), "60-second explainer video, motion graphics" (Video & Animation), "Fine-tune a support-ticket classifier" (Data & AI).
   - Footnote: "Auctions and category stats shown are illustrative — sign up to browse real listings."
3. **Creative/visual inventory**: Category chips — pill buttons with a lucide icon per category (Palette/Code2/PenLine/Megaphone/Clapperboard/BrainCircuit) + name + dimmed count; active = solid purple fill/white text, inactive = outlined. Auction cards: off-white rounded-2xl, purple-tinted border, category pill top-left, countdown top-right, bold title, large price that **flashes red-orange and scales ~5%** for 350ms on each tick, thin purple progress bar, bidder count caption.
4. **Layout at 375px**: Header row wraps onto separate lines. Category chips wrap into multiple rows. Card grid becomes a **single-column stack of 6 full-width cards**.
5. **Interactive elements**: Category chips toggle `activeCategory` filter live. Measured **118×33px** — under 44px guideline; chips sit close together in wrapped rows, mis-taps plausible. "Browse all auctions" → `/feed`. Cards themselves not clickable.
6. **Animation/motion**: Each auction decays every 1,800ms by a category-proportional step, flashing color/scale for 350ms per tick, resets to a fresh randomized cycle near floor — runs indefinitely. Progress bars animate width with 1200ms easing. Section/chips fade in on scroll, cards stagger `i*0.08s`. Under `prefers-reduced-motion`: all 6 freeze at midpoint, no interval.
7. **Mobile-specific issues**: No structural breakage. Category-chip tap targets (33px) are the main concrete a11y concern. Countdown text (`text-[11px]`, `text-[#b3aec0]`) is small/low-contrast against the off-white card — borderline legibility in bright light.

### EscrowPerimeter (id `trust`)

1. **Purpose**: Trust/security section — interactive Payment → Escrow → Payout diagram plus a merged bid-volume stat strip.
2. **Verbatim copy**:
   - Eyebrow: "Trust"
   - H2: "**Your money never leaves escrow until you approve**"
   - Stat strip: "**140** bids this week" (count-up) … tick-mark sparkline (27 ticks, one taller "survivor") … "**1** decision was yours"
   - Station labels: "Your payment", "Escrow", "Freelancer payout"; status cycles "—" → "Held" → "Released"
   - Buttons: "**Approve & release**" (check icon), "**Replay**" (rotate-ccw icon)
3. **Creative/visual inventory**: Horizontal connecting rail with a small round purple token (white "$" glyph) traveling left→center→right. Three white rounded-xl station cards; center "Escrow" card gets an animated self-drawing SVG rectangle outline (`strokeDashoffset`) that draws itself when the token arrives and fades on release. Sparkline: 27 thin bars, center one taller/solid. Buttons: solid purple pill + outlined ghost pill.
4. **Layout at 375px**: Fully single-column/centered (`max-w-[820px]`, `text-center`) — no responsive grid to collapse; reads essentially the same shape as desktop, just narrower. Stat strip wraps onto its own line.
5. **Interactive elements**:
   - "Approve & release": disabled (40% opacity) until token reaches "Escrow"; enabled, click releases token to "payout" after an 800ms delay. Measured **196×44px** — meets the 44px guideline exactly.
   - "Replay": resets the whole sequence.
6. **Animation/motion**: On scroll-into-view (`useInView(0.2)`), token auto-travels to "Escrow" over 900ms and waits indefinitely for a real tap — the one section where progression is gated behind explicit user action rather than a timer (deliberate "stillness is the point" per source comments). Bid-count stat animates 0→140 via `useCountUp` (~1.1s). Under `prefers-reduced-motion`, token jumps straight to "held"; count-up still runs.
7. **Mobile-specific issues**: None observed — one of the cleanest sections at 375px given its intentionally narrow container. Station labels wrap to 2 lines within ~33%-width columns without overlap/truncation.

### WhyGeekBidSection — Comparison + PricingSection

#### Comparison (id `compare`)

1. **Purpose**: 2-column feature comparison table, "GeekBid" vs. "Traditional" hiring.
2. **Verbatim copy**:
   - H2: "**Why GeekBid, not the old way**" ("GeekBid" in purple)
   - Subhead: "Everything built into the platform, and how it stacks up against the old way of sourcing freelance talent."
   - Header: (blank) | "⚡ GeekBid" | "Traditional"
   - Row 1 "Time to Hire": ✓ "Hours, not weeks" | ✗ "2-6 weeks average"
   - Row 2 "Reputation": ✓ "GeekScore™ (data-driven reputation score)" | ✗ "Subjective reviews"
3. **Creative/visual inventory**: `glass-panel` card, 3-column grid table; GeekBid column light purple tint with purple check icons; Traditional plain gray X icons; `Zap` icon beside "GeekBid" header.
4. **Layout at 375px — confirmed horizontal-scroll issue**: `overflow-x-auto` wrapper around an inner `min-w-[500px]` grid — at ~343px available width the table **does not fit**, requiring horizontal scroll. Confirmed visually: table cut off mid-column, visible scrollbar thumb, "Traditional" column content off-screen by default.
5. **Interactive elements**: None (static table); irrelevant `hover:bg-[...]` tint on touch.
6. **Animation/motion**: Section/rows fade/slide in on scroll, staggered 60ms each.
7. **Mobile-specific issues**: Horizontal-scroll-required table is the headline issue — discoverable via a thin native scrollbar but no explicit "swipe me" affordance; a first-time visitor may not realize there's more content to the right.

#### PricingSection (id `pricing`)

1. **Purpose**: Three-tier pricing cards (Free / Plus / Premium), sourced from `lib/plans.ts` as single source of truth.
2. **Verbatim copy**:
   - H2: "**Start free. Scale when you win.**"
   - Subhead: "Every plan includes the full reverse-auction engine, escrow protection, and AI tools. Paid tiers raise your limits and cut your platform fee — from 10% down to 5%."
   - **Free** — "$0 forever" — "Everything you need to try the reverse auction." Features: "3 job posts / month", "10 bids / month", "5 AI analyses / month", "Escrow-protected payments", "10% platform fee". CTA "**Start Free**" → `/login`
   - **Plus** (badge "MOST POPULAR") — "$19 /month" — "For serious clients and full-time freelancers." Features: "50 job posts / month", "100 bids / month", "50 AI analyses + 15 Bid Strategist runs", "2 featured boosts + 3 team seats", "API access (100 req/min)", "7% platform fee". CTA "**Upgrade to Plus**" → `/pricing`
   - **Premium** — "$79 /month" — "For agencies and teams that hire at scale." Features: "500 job posts / month", "500 bids / month", "200 AI analyses + 60 Bid Strategist runs", "5 boosts + 10 team seats + unlimited invites", "API access (500 req/min) + dedicated support", "5% platform fee". CTA "**Go Premium**" → `/pricing`
   - Footnote: "No featured boosts on Free? Feature any job for a one-off $10. Upgrade, downgrade, or cancel anytime — your data is never deleted."
3. **Creative/visual inventory**: Three white rounded-2xl cards, tier icon (Zap/Crown/Building2), large price numerals, bullet feature list with purple checkmarks, full-width CTA (solid for "Plus", outlined for others). "Plus" card has purple border/glow + absolutely-positioned "MOST POPULAR" pill. Decorative "ascending stairs" SVG connector is `hidden md:block` — **not rendered on mobile** (appropriate, since "ascending" has no spatial meaning in a single column).
4. **Layout at 375px**: 3-column grid becomes a single-column stack, Free → Plus → Premium, full-width cards.
5. **Interactive elements**: Three CTA links, ~270×58px measured — comfortably sized.
6. **Animation/motion**: Cards have `hover:-translate-y-1` (desktop-only in practice).
7. **Mobile-specific issues**: None structural. Longer feature lines wrap to 2 lines cleanly.

### Testimonials (id `testimonials`)

1. **Purpose**: Auto-scrolling social-proof carousel of 3 testimonials (duplicated to 6 for a seamless loop).
2. **Verbatim copy**:
   - H2: "**Loved by freelancers and clients alike**"
   - Subhead: "Real results from real people using GeekBid to hire and get hired."
   - Card 1 (tag "Client"): "The escrow and dispute resolution gave us confidence to try GeekBid for our entire engineering pipeline. We've saved 40% on average." — "Saved 40%" — **Derek Olsen**, VP Engineering · FinScale
   - Card 2 (tag "Freelancer"): "I switched from Upwork after my first job on GeekBid. The price decay means I actually get fair market rates instead of racing to the bottom." — "Fair market rates" — **Emma Johnson**, Senior Full-Stack Developer · Independent
   - Card 3 (tag "Client"): "Posted a React Native project at $3,000. Three qualified engineers bid within 6 hours. Hired at $1,800. That's the power of reverse auctions." — "Hired at $1,800" — **Marcus Chen**, CTO · LaunchPad AI
3. **Creative/visual inventory**: Cards (`min-w-[360px] max-w-[420px]`) with gradient border (`landing-testimonial-border`), large decorative serif quotation mark top-right, role tag pill, 5 filled purple stars, quote as `<blockquote>`, checkmark "result" pill, divider, attribution row with circular avatar. All three testimonials have empty `photo` strings → all render as initials-in-a-circle ("DO"/"EJ"/"MC") via `CloudinaryAvatar`, each with a small green "online" dot. Edge gradient fade-masks. Two giant decorative quote-mark glyphs in far corners are `hidden lg:block` — **not rendered on mobile**.
4. **Layout at 375px**: Single horizontally-scrolling row (`flex gap-6 overflow-x-auto`, free scroll, no scroll-snap) — this **is** the intended mobile pattern. ~1 card fully visible with next peeking at the right edge.
5. **Interactive elements**: Track natively swipe-scrollable. 3 nav dots below (`aria-label="Testimonial 1/2/3"`), jump scroll position on tap. Active dot **20×6px**, inactive ~6×6px — far under the 44px guideline, fiddly to hit precisely.
6. **Animation/motion**: Auto-scrolls continuously (1px/30ms) via `setInterval`, loops by wrapping `scrollLeft` at the halfway point. Pause mechanism wired to `onMouseEnter`/`onMouseLeave` only — **no touch equivalent**: auto-scroll keeps drifting during/after a manual swipe, fighting the gesture. No `prefers-reduced-motion` handling found for this carousel.
7. **Mobile-specific issues**: Auto-scroll-fighting-swipe is the main one; no reduced-motion support (unlike nearly every other animated element on the page).

### FAQ (id `faq`)

1. **Purpose**: 6-item accordion FAQ using native `<details>/<summary>`.
2. **Verbatim copy**:
   - Eyebrow: "FAQ" / H2: "**Questions, answered**"
   - Q1: "Can I set my own floor price and decay rate?" → "Yes. When you post a job you choose the starting ceiling, the floor it will never drop below, and how fast it decays per hour — we just suggest defaults based on your category."
   - Q2: "Is posting a job really free?" → "Yes. Posting, receiving bids, and messaging freelancers costs nothing. We only charge freelancers a success fee when they win a job."
   - Q3: "What happens if I never find a price I like?" → "You are never obligated to hire. If no bid meets your bar before time runs out, you can relist the job or close it with no cost."
   - Q4: "How do you keep quality from racing to the bottom with price?" → "Every bid shows the freelancer's rating, past work, and win rate alongside the price, so you're never choosing blind on price alone."
   - Q5: "Can freelancers see each other's bids?" → "Freelancers see the current lowest price so they know what to beat, but never who placed it or their profile details."
   - Q6: "What categories of work can I post?" → "Design, development, writing, marketing, video and animation, and data and AI work today, with more categories opening regularly."
3. **Creative/visual inventory**: Simple list, hairline bottom border per item; `Plus` icon rotates 45° (becomes "×") when expanded via `group-open:rotate-45`.
4. **Layout at 375px**: Single column, `max-w-[760px]` — all 6 collapsed rows fit within roughly one viewport height.
5. **Interactive elements**: Each `<summary>` row full-width tap target, measured **330×45px** — meets guideline. Expand/collapse via CSS grid-rows trick (`grid-rows-[0fr]` → `group-open:grid-rows-[1fr]`), `motion-reduce:transition-none` correctly disables it under reduced motion.
6. **Animation/motion**: Rows fade/slide in on scroll, staggered 60ms. Expand/collapse is a 300ms eased height transition — confirmed working live.
7. **Mobile-specific issues**: None — one of the most mobile-appropriate sections on the page.

### CTA

1. **Purpose**: Closing conversion section — a quiet dark "payoff" log-line lead-in, then the headline hook and final CTA pair.
2. **Verbatim copy**:
   - Payoff lines: "Friday, 5:04pm." (mono, dim) / "Three jobs hired." / "Zero emails sent."
   - Eyebrow: "Join 2,400+ freelancers on GeekBid"
   - H2: "**Ready to hire** _smarter?_" ("smarter?" in purple)
   - Subhead: "Join thousands of companies using reverse auctions to find the best freelance talent at the right price."
   - CTA 1: "**Get Started Free**" → `/login?tab=register&role=client`
   - CTA 2: "**Apply as Freelancer**" → `/login?tab=register&role=freelancer`
   - Fine print: "No credit card required · Free to post · 10% success fee only"
3. **Creative/visual inventory**: Full-bleed dark band (`#1b1523`) for payoff lines, inside a section with a grid-pattern background, a large soft purple glow blob centered behind the headline, top/bottom hairline gradient rules. CTA 1 solid purple pill w/ arrow; CTA 2 outlined ghost pill w/ chevron.
4. **Layout at 375px**: Already single-column/centered by design; two CTAs stack vertically.
5. **Interactive elements**: "Get Started Free" measured **248×56px**; "Apply as Freelancer" comparable — both well above 44px guideline.
6. **Animation/motion**: 3 payoff lines fade/slide in sequentially (~0.4s stagger) on scroll-into-view; rest of section renders in place without scroll-reveal.
7. **Mobile-specific issues**: None observed; clean, legible, generously spaced.

### Footer

1. **Purpose**: Standard site footer — brand blurb, 3 link columns, copyright bar.
2. **Verbatim copy**:
   - Brand blurb: "The reverse-auction marketplace for freelance talent."
   - **Platform**: "Browse Jobs" (`/feed`), "Post a Job" (`/post-job`), "Find Work" (`/login?role=freelancer`), "Pricing" (`/pricing`)
   - **Company**: "About Us", "Careers", "Blog", "Contact"
   - **Legal**: "Terms of Service", "Privacy Policy", "Cookie Policy"
   - Bottom bar: "© 2026 GeekBid Inc. All rights reserved."
3. **Creative/visual inventory**: Faint "constellation" background of 9 small pulsing purple dots at fixed positions. Logo mark+wordmark repeated slightly larger (`h-8 w-8`) than nav's.
4. **Layout at 375px**: 4-column grid becomes a single centered column, stacking Brand → Platform → Company → Legal, items centered.
5. **Interactive elements**: **Only the 4 "Platform" items are real links.** "Company" and "Legal" items are plain `<span>` text — styled identically to real links but inert. Measured one real footer link at **84×20px** — under 44px guideline, though `gap-2.5` (10px) between stacked items gives reasonable separation.
6. **Animation/motion**: Constellation dots pulse continuously (decorative, `aria-hidden`). Link hover states are desktop-only.
7. **Mobile-specific issues**: Dead "Company"/"Legal" links (see Executive Summary #2) are the standout issue — on mobile especially there's no cursor affordance to reveal the lack of a link before tapping.

### Cross-cutting findings specific to this pass

- **Console**: `Failed to load resource: 500 (Internal Server Error) @ /api/jobs`, repeated on every load.
- **No page-level horizontal scroll**: confirmed via `document.body.scrollWidth === document.documentElement.clientWidth` (both 370px) — `overflow-x-hidden` on `LandingGate`'s wrapper successfully contains the Comparison table's forced-width overflow and both carousels' native scroll.
- Full recurring-issue rollup is in the Executive Summary above.

---

# Viewport Detail: Tablet (768×1024)

Audited live at `http://localhost:3000`, browser resized to exactly 768×1024 (iPad portrait, DPR 1). Layout facts cross-verified with `getComputedStyle`/`getBoundingClientRect` reads at a confirmed `window.innerWidth === 768`. Total page `scrollHeight` at this width: **9477px** (10.4 viewport-heights of scrolling).

## Site-wide issue found during this pass (affects every section below the hero)

**The sticky nav does not stick. At all.** `Nav.tsx` sets `sticky top-0 z-50`, but `LandingGate.tsx` wraps the entire page in `<div className="bg-[#fbfaf7] text-[#17171f] overflow-x-hidden">`. Setting `overflow-x: hidden` without an explicit `overflow-y` makes the browser auto-compute `overflow-y: auto`, breaking `position: sticky` on the nav inside it.

Verified directly: at `scrollY = 3231` (Live Auctions section), `nav.getBoundingClientRect().top === -3231` and `getComputedStyle(nav).position === "sticky"` — sticky is applied but doing nothing, because the containing div's computed `overflow-y` is `auto`. Screenshot proof captured scrolled into Live Auctions: no nav bar at all, only the thin fixed 2px `ScrollProgress` line (uses `position: fixed`, unaffected by this containing-block gotcha).

Practical impact at tablet: once scrolled past the ~1140px-tall hero, **all primary nav links and both header CTAs ("Sign In" / "Get Started") disappear for the remaining ~8300px of scroll** — through pricing, testimonials, and FAQ. Not tablet-specific (same bug at every breakpoint) but fully reproducible here.

Also found: **4 repeated console errors** — `500 (Internal Server Error) @ /api/jobs`.

## LandingGate

1. **Purpose:** Client-side auth gate wrapping the whole landing page.
2. **Copy:** None — renders `null` while `!mounted`, or redirects logged-in users to `/feed`.
3. **Creative/visual:** None directly; supplies base background/text color and the `overflow-x-hidden` class responsible for the sticky-nav bug.
4. **Layout:** Full-bleed wrapper div, no grid/columns of its own.
5. **Interactive:** None.
6. **Animation:** None (no loading spinner during the `!mounted` gate — blank flash).
7. **Tablet-specific issues:** None unique to tablet; the overflow issue originates here and cascades to Nav at every breakpoint.

## Nav

1. **Purpose:** Primary site navigation + auth entry points, intended to stay pinned while scrolling (it doesn't).
2. **Verbatim copy:**
   - Logo wordmark: "**Geek**" + "**Bid**", no tagline.
   - Nav links: "How it Works", "Live Auctions", "Trust", "Pricing", "Testimonials".
   - Buttons: "Sign In", "Get Started" (arrow icon).
3. **Creative/visual inventory:**
   - Logo mark: 28×28px circular SVG, `< >` bracket strokes + green "online" dot.
   - 2px scroll-progress bar fixed to the viewport top, gradient `#5b21b6 → #5b21b6 → #17171f`, width animates with scroll depth — the only thing that stays visible after scrolling.
   - Nav bar: white background, 1px translucent-violet bottom border, height 56px.
   - "Get Started": solid violet pill, `ArrowUpRight` icon.
   - Active-link styling via `useActiveSection` scroll-spy.
4. **Layout at 768px:** Confirmed via computed style: `nav .hidden.md\:flex` → `display: flex`. **At exactly 768px (Tailwind's `md` breakpoint), the full desktop nav-link row shows — no hamburger menu.** All 5 links + Sign In + Get Started fit on one row, no wrapping. One pixel narrower (767px) and the links fall to `sm:hidden` → nothing, with no fallback whatsoever.
5. **Interactive elements:** 5 links scroll-into-view via JS (`scrollIntoView`, not native anchor jump) to their section ids. "Sign In" → `/login`. "Get Started" → `/login?tab=register&role=client`.
6. **Animation/motion:** Logo translates 2px on hover (180ms). Nav links get a color transition on hover. Progress bar updates continuously (rAF-throttled).
7. **Tablet-specific issues:**
   - **Critical:** sticky positioning broken (see site-wide issue) — nav vanishes after ~1 viewport-height of scroll.
   - Undersized touch targets: "Sign In" measured **44×15px**, nav links **88×15px** — under the ~44px height guideline. "Get Started" 130×31px, still short of 44px tall.
   - 768px is the exact `md` cutoff — a legitimately awkward width where this is the *last* pixel showing full desktop nav; anything narrower silently loses all nav links with nothing to replace them.

## Hero

1. **Purpose:** Above-the-fold value prop + primary CTA + live social-proof ticker.
2. **Verbatim copy:** Same as Mobile pass (eyebrow, H1, subhead, CTAs, trust badges, ticker items — see Mobile section above for full text). Demo card captured at "$800" (floor) with "Bids"/"Watching"/"Left" = "7"/"23"/"1h".
3. **Creative/visual inventory:** Same layered mesh/grain/mouse-glow, 10 ember particles, dot-grid, scan-line, 3 breathing glow blobs, 1px hairline, ticker fade-masks + center glow, demo card glow/spark treatment — identical asset set to other viewports, just reflowed.
4. **Layout at 768px:** Confirmed `heroGrid` computed style → **1 column** (`grid-template-columns: 715px`, single track) — the `lg:grid-cols-2` two-column split does **not** activate until 1024px, so at tablet the copy stacks fully above the demo card. This makes the hero noticeably tall at this width — headline + subhead + CTAs + trust badges + full demo card all stacked before the ticker even starts.
5. **Interactive elements:** "Start Free" → `/login?tab=register&role=client`. "See Pricing" → smooth-scrolls to `#pricing`. Demo "Accept at $X" is decorative/non-functional.
6. **Animation/motion:** Same staggered entrance sequence as other viewports. PriceDecayDemo ticks every 120ms toward $800 floor, then freezes (no loop) until reload. All intervals stop under `prefers-reduced-motion`.
7. **Tablet-specific issues:** Single-column stacking (confirmed) makes the hero very tall at 768px — likely 1100px+ of scroll before `PriceDecayShowcase`, a fair amount of "dead" vertical scroll for a device whose whole point is a taller-than-wide reading pattern. No layout breakage, wrapping, or clipping observed otherwise.

## PriceDecayShowcase (id="how-it-works")

1. **Purpose:** Explains and dramatizes the price-decay mechanic; the page's conceptual centerpiece.
2. **Verbatim copy:** Same H2/subhead/CTA, MarketTerminal copy (captured at "$3,000" mid-decay), HowItWorks 4-step copy, and both collapsed-toggle contents (formula + `CaseTimeline`) as documented in full under the Mobile section above.
3. **Creative/visual inventory:** Dual radial-gradient section background, MarketTerminal card (white/blurred, violet border, terracotta price, gradient decay bar), 4 glassmorphic tilt step cards with colored icon badges, dashed connector line (desktop-only, confirmed absent at 768px), dark syntax-highlighted formula code block, CaseTimeline's vertical progress rail with 5 lighting-up dot-nodes.
4. **Layout at 768px:**
   - Copy+terminal top block: confirmed **single column** at 768 (source requires `lg`/1024px for the split).
   - HowItWorks 4-step grid: computed style confirms **`gridTemplateColumns: 339.5px 339.5px` → 2 columns** (`sm:grid-cols-2` active; desktop's 7-track layout doesn't apply). Screenshot confirms steps 01/02 on row 1, 03/04 on row 2, connectors correctly hidden with no orphaned artifacts.
5. **Interactive elements:** "See how decay works" self-referential anchor. Two native accordions. CaseTimeline's internal "Replay" button re-triggers its draw-in animation.
6. **Animation/motion:** Section-level scroll-reveal. MarketTerminal ticks -$40/900ms, loops indefinitely (resets at floor, unlike Hero's demo). Activity log pushes a line every 2200ms, capped at 4 with decreasing opacity. Step cards pop-in + stagger, 3D tilt on hover (fine pointers). Accordions use smooth `grid-template-rows` transitions. CaseTimeline rail draws over 1600ms in 5 steps.
7. **Tablet-specific issues:** No broken layout — the 2-column step grid and single-column copy/terminal split both look clean and intentional at 768px, one of the better-considered breakpoints on the page. Formula/CaseTimeline content sits behind two low-contrast toggle labels, easy to miss on a first scroll (design choice, not a tablet-specific bug). Section is long: hero (~1140px) + this section (~2090px) ≈ 34% of total page height before Live Auctions starts.

## LiveAuctions (id="live")

1. **Purpose:** "Right now on GeekBid" — dramatizes breadth via category-filterable live-decaying auction cards.
2. **Verbatim copy:** Same eyebrow/H2/link/category-chip/auction-card copy as documented under Mobile above (6 titles, footnote, avgDrop/timeToHire stat line format).
3. **Creative/visual inventory:** Same lucide category icons, active/inactive chip styling, cream auction cards with purple border, flashing terracotta price on tick, thin progress bar.
4. **Layout at 768px:** Computed style confirms `#live .grid` → **`gridTemplateColumns: 339.5px 339.5px` = 2 columns** (`sm:grid-cols-2` active; desktop 3-up doesn't apply until 1024px). With 6 auctions this renders as a clean 3-row × 2-column grid, no orphaned trailing card. Category chips wrap onto 2 rows — confirmed clean via `flex-wrap`, no clipping.
5. **Interactive elements:** Category chips filter client-side (toggle to clear). "Browse all auctions" → `/feed`.
6. **Animation/motion:** Each auction decays independently every 1800ms, resets to a fresh randomized cycle at floor. Cards fade/translateY in with 80ms-per-card stagger. Active-category stat line appears/disappears instantly, no transition.
7. **Tablet-specific issues:** None significant — the 2-column grid is a deliberate, clean mid-point between mobile's 1-col and desktop's 3-col. Category chip touch target measured **51×33px** — still short of ~44px height, consistent with the nav's undersized-target pattern.

## EscrowPerimeter (id="trust")

1. **Purpose:** Builds trust via an interactive payment→escrow→payout diagram plus a merged stat strip.
2. **Verbatim copy:** Same as documented under Mobile — "140 bids this week"/"1 decision was yours" stat strip, station labels, "Approve & release"/"Replay" buttons.
3. **Creative/visual inventory:** Centered narrow column, cream background; sparkline of 27 ticks (one taller "survivor"); token travel diagram with self-drawing Escrow perimeter outline.
4. **Layout at 768px:** Single-column, centered, no grid breakpoints — `max-w-[820px]` container comfortably fits within 768px with `px-5 sm:px-8` side padding (container is effectively full-width minus padding, not reaching its 820px cap). 3 diagram stations use `width: 33%` flex children regardless of viewport, scaling proportionally rather than reflowing.
5. **Interactive elements:** "Approve & release" disabled until token is "Held"; triggers release animation. "Replay" resets to idle and restarts.
6. **Animation/motion:** Token auto-travels to "Escrow" over 900ms on scroll-into-view (20% threshold), then waits for user action. Bid-count counts up over 1100ms. Escrow perimeter SVG draws/holds/fades in sync with phase. Freezes to resolved "Held" frame under `prefers-reduced-motion`.
7. **Tablet-specific issues:** None found — width-agnostic by design (percentage-based 3-station layout), rendered correctly and legibly at 768px with no clipping, overlap, or wrapping.

## WhyGeekBidSection — Comparison + PricingSection

1. **Verbatim copy:** Identical Comparison (H2/subhead/table rows) and PricingSection (H2/subhead/3 tiers/footnote) copy as documented in full under the Mobile section above; PricingSection figures confirmed sourced live from `lib/plans.ts`, not copy-drift-prone hardcoding.
2. **Creative/visual inventory:** Comparison — glass-panel card, violet-tinted GeekBid column, gray Traditional column. Pricing — 3 white cards, Plus card with violet border/glow + floating "MOST POPULAR" badge, "ascending stairs" SVG connector that self-draws with 3 lighting-up anchor dots.
3. **Layout at 768px:**
   - Comparison table: computed style confirms header/row grid → **3 columns always** (`grid-cols-[1fr_1fr_1fr]`, not responsive). Sits inside `overflow-x-auto` wrapper with `min-w-[500px]` inner panel; at 768px (~728px available after padding) the 500px minimum fits with room to spare — **no horizontal scroll triggered**, confirmed visually.
   - Pricing tiers: computed style confirms **`gridTemplateColumns: 222.328px 222.328px 222.328px` → 3 columns** (`md:grid-cols-3` active exactly at 768px). Notable mismatch: the code comment in `PricingSection.tsx` assumes tablet gets a "stacked layout" where the stairs connector should hide — but at 768px cards are **not** stacked, they're already 3-across, and the connector (`hidden md:block`) **is shown**. Renders correctly, but each ~222px-wide card is more cramped for its feature-list text than at desktop widths.
4. **Interactive elements:** 3 pricing CTAs ("Start Free" → `/login`, "Upgrade to Plus"/"Go Premium" → `/pricing`).
5. **Animation/motion:** Comparison rows fade/translateY in staggered. Stairs connector self-draws over 1100ms with proportionally-delayed anchor-dot fills. Pricing cards lift slightly on hover.
6. **Tablet-specific issues:** Pricing cards at 222px feel noticeably tighter than intended — feature lines wrap to 2 lines often, "MOST POPULAR" badge nearly spans the card's full width. The code comment's "stacked at tablet" assumption doesn't match actual 768px behavior (visual result isn't broken, but worth flagging as a documentation/implementation mismatch). Comparison table correctly avoids horizontal scroll at this width.

## Testimonials (id="testimonials")

1. **Verbatim copy:** Identical 3-testimonial copy (Derek Olsen/Emma Johnson/Marcus Chen quotes, result pills, attributions) as documented under Mobile above.
2. **Creative/visual inventory:** Same gradient-bordered cards, decorative quote marks (giant background pair `hidden lg:block` — **not shown at 768px**), role tag pills, 5-star rows, initials-avatar `CloudinaryAvatar` fallback (no photo URLs set), edge fade-masks, nav dots.
3. **Layout at 768px:** Cards fixed-width (`minWidth: 360px, maxWidth: 420px`), not a responsive grid — roughly **1.7–1.9 cards** visible at once (one full card + a second card's left portion, third clipped by the fade mask) — by design, consistent with the horizontal-scroll carousel pattern.
4. **Interactive elements:** Auto-scroll marquee (~33px/sec). Hover pauses it (`onMouseEnter`/`onMouseLeave` — inert on a touch-only tablet, no persistent hover state, so touch users get no pause affordance beyond drag-scrolling directly). Nav dots jump scroll position.
5. **Animation/motion:** Continuous auto-scroll wraps seamlessly via `scrollLeft` reset at the midpoint. Cards lift slightly on hover. Active dot updates live. Section fades/translates in on scroll-into-view.
6. **Tablet-specific issues:** None broken — fixed-width carousel scales down gracefully by showing fewer cards, the expected tablet behavior. Decorative giant quote-mark glyphs correctly hide below `lg`, avoiding clutter.

## FAQ (id="faq")

1. **Verbatim copy:** Identical 6 Q&A pairs as documented under Mobile above.
2. **Creative/visual inventory:** Plain white background, bordered-bottom rows, rotating `Plus` icon per row.
3. **Layout at 768px:** Single centered column, `max-w-[760px]`, comfortably narrower than the viewport — no wrapping/overflow concerns.
4. **Interactive elements:** 6 native accordions, multiple can be open simultaneously. Tested live: clicking the first question opens it, icon rotates, answer reveals with a smooth height transition.
5. **Animation/motion:** Section-level fade/translateY on scroll with 60ms per-row stagger. Open/close animates via `grid-template-rows` (300ms custom cubic-bezier), motion-reduce-safe.
6. **Tablet-specific issues:** None found. **Touch target note:** the `<summary>` row's own bounding box measured **696×23px** — only 23px tall for the clickable hit area (visual row height is taller due to parent `<details>`'s padding, but that padding doesn't extend the `<summary>`'s own click box) — another instance of the touch-target pattern seen elsewhere.

## CTA

1. **Verbatim copy:** Identical payoff lines, eyebrow, headline, subhead, dual CTAs, and fine print as documented under Mobile above.
2. **Creative/visual inventory:** Dark band (`#1b1523`) for payoff lead-in with dot-bullet prefixes, cream background with dot-grid pattern + centered glow blob below it, top/bottom hairlines.
3. **Layout at 768px:** Fully centered single-column content (`max-w-[600px]` payoff band, `max-w-5xl` headline/CTA block) — no grid to break at any width; buttons stack via `flex-col sm:flex-row` → **at 768px (≥ `sm` 640px) the two CTA buttons sit side-by-side**, not stacked.
4. **Interactive elements:** Two CTA links as documented above.
5. **Animation/motion:** Payoff lines fade/translateY in sequentially (400ms stagger) once 30% in view. Eyebrow dot pulses. Icons nudge right on hover.
6. **Tablet-specific issues:** None found — straightforward centered layout scales cleanly, no wrapping or overflow at 768px.

## Footer

1. **Verbatim copy:** Identical brand blurb, Platform/Company/Legal column items, and copyright line as documented under Mobile above.
2. **Creative/visual inventory:** White background, faint 9-dot "constellation" with individual pulse/twinkle delays, logo mark+wordmark (32px here vs 28px in nav), violet uppercase column headers, top divider above copyright bar.
3. **Layout at 768px:** Computed style confirms footer grid → **`gridTemplateColumns: 144.75px 144.75px 144.75px 144.75px` = 4 columns** (`sm:grid-cols-4` active at 768px since `sm` is 640px) — Brand/Platform/Company/Legal all sit in one row rather than stacking. Each column quite narrow (~145px). Text left-aligned (`sm:text-left` overrides mobile's centered default) — confirmed in screenshot.
4. **Interactive elements:** 4 real navigational links (Platform only); Company/Legal columns visually identical to links but inert plain text.
5. **Animation/motion:** Constellation dots pulse/twinkle on staggered delays (ambient, continuous, `aria-hidden`). Platform links nudge right 0.5px + darken on hover.
6. **Tablet-specific issues:** 4-column footer at 768px produces quite narrow (~145px) columns for a 768px-wide page — legible but tight; no wrapping occurs since link text here is short, but columns visually crowd together more than at desktop widths. The inert Company/Legal "fake link" text is fully visible and identically styled at this viewport too.

## Summary of cross-cutting findings from this pass

- Broken sticky nav (see site-wide issue above) — highest priority, confirmed via `getBoundingClientRect()` and screenshot.
- 4× repeated `500 Internal Server Error` on `GET /api/jobs`.
- Multiple touch targets under ~44×44px: nav "Sign In" (44×15), nav links (88×15), category filter chips (51×33), FAQ `<summary>` row (696×23 tall).
- 768px nav breakpoint edge case — full desktop link row present with zero margin to spare, no hamburger fallback for anything narrower.
- Footer dead links present at this viewport as at every other.
- No horizontal overflow/scroll anywhere on the page at 768px (`document.documentElement.scrollWidth: 763` vs `innerWidth: 768`).
- Grid column counts confirmed by computed style at 768px: Hero 1-col, HowItWorks steps 2-col, Live Auctions 2-col, Comparison table fixed 3-col (no scroll needed), Pricing tiers 3-col (narrower than ideal, cramped), Footer 4-col.

---

# Viewport Detail: Laptop (1440×900)

Audited live at `http://localhost:3000`, viewport forced to 1440×900.

**Global console check:** one recurring error throughout the session: `500 (Internal Server Error) @ /api/jobs` (4+ times). The landing page itself doesn't call this (all sections use hard-coded/illustrative data in `data.ts`) — likely a background fetch from app-shell/layout-level data hooks. Doesn't visibly break the landing page but is a real server error on every load.

**Critical structural bug found and verified live: the sticky nav does not actually stick.** `LandingGate` wraps the whole page in a div with Tailwind's `overflow-x-hidden`. Setting only one axis of `overflow` forces the other to compute as `auto` (confirmed live: `getComputedStyle(gateDiv).overflowY === "auto"`), which breaks `position: sticky` on `<Nav>` inside it. Confirmed via `getBoundingClientRect()`: at `scrollY: 3231`, the nav's `rect.top` was `-3231` — scrolled fully off-screen 1:1 with scroll distance, not pinned at `top: 0`. Only the separate `position: fixed` `ScrollProgress` hairline bar stays visible once you scroll away from the hero.

## LandingGate

1. **Purpose:** Auth/mount gate wrapping the entire landing page. Not a visual section.
2. **Copy:** None.
3. **Creative/visual inventory:** None. Sets base background/text color and `overflow-x-hidden`.
4. **Layout:** N/A — passthrough wrapper.
5. **Interactive elements:** None directly, but its `overflow-x-hidden` class is the root cause of the broken sticky nav.
6. **Animation/motion:** None itself. On mount, checks `useApp()` for `currentUser`; if logged in, calls `router.replace("/feed")` and renders `null` until then — a silent redirect/blank-flash gate, not a spinner or skeleton.
7. **Desktop-specific issues:** This is the component responsible for the sticky-nav bug (see global note above).

## Nav

1. **Purpose:** Primary site navigation / wayfinding + top-level auth CTAs. Intended to be a sticky header.
2. **Copy (verbatim):**
   - Logo wordmark: "**Geek**" (`#26243A`) + "**Bid**" (`#453B78`), single word "GeekBid".
   - Nav links: `How it Works` (`#how-it-works`), `Live Auctions` (`#live`), `Trust` (`#trust`), `Pricing` (`#pricing`), `Testimonials` (`#testimonials`).
   - Right-side: `Sign In` (→ `/login`), `Get Started` (→ `/login?tab=register&role=client`).
3. **Creative/visual inventory:**
   - Logo mark: 28×28px circular SVG — indigo circle, white `< >` bracket strokes, small green dot centered.
   - `ScrollProgress` bar: `position: fixed`, 2px tall, pinned to viewport top (`z-60`), gradient indigo → near-black, width driven by scroll percentage — the only header element that visibly persists once you scroll.
   - Nav bar background: solid white, translucent-indigo bottom hairline, height 56px.
   - "Get Started" button: solid indigo pill with white text + `ArrowUpRight` icon.
4. **Layout at 1440px:** Full-width bar, inner content constrained to `max-w-[1400px] mx-auto px-8`, `flex justify-between`. Logo left, 5 links center, Sign In + Get Started right. Comfortably fits on one row with room to spare — no crowding.
5. **Interactive elements & hover:**
   - Logo: hovering nudges the mark down 2px (180ms ease-out).
   - Nav links: `hover:text-[#5b21b6]` transition-colors 200ms. **Verified live** — hovering "Live Auctions" turned it solid indigo. `useActiveSection` scroll-spy also applies active styling to whichever section is currently in view.
   - Nav links use scoped smooth-scroll (`scrollIntoView`) via manual click handler, explicitly not a global CSS rule, so it doesn't leak to other routes (per in-code comment).
   - "Sign In": text-only, `hover:text-[#5b21b6]`.
   - "Get Started": hover darkens background `#4b3f8f` → `#3d3373`, 0.18s ease — verified darkening on hover.
6. **Animation/motion:** Logo hover-nudge (180ms); nav-link color transitions (200ms); scroll-progress bar width updates continuously and smoothly (rAF-throttled, no jank).
7. **Desktop-specific issues (major):** **The nav does not stay pinned while scrolling**, despite `sticky top-0` in its className. Root cause confirmed live (see global note). Practical effect: once a visitor scrolls past the hero, there is no nav bar, no logo, no "Get Started" button, and no quick section links until scrolling back to the very top — only the thin 2px scroll-progress hairline remains. Very likely unintentional given the component's own code comments describe scroll-spy/active-link behavior implying an always-visible nav.

## Hero

1. **Purpose:** Above-the-fold value prop + primary conversion CTA + a live-feeling product demo, closing with a scrolling social-proof ticker.
2. **Copy (verbatim):** Same eyebrow/H1/subhead/CTA/trust-badge/ticker copy as documented in full under the Mobile section above. Demo card: "Live Price Decay" / "AI Chatbot Development" / "LIVE" badge; price starting $2,400 ticking "↘ -$25/hr"; footer "Floor: $800" / "Start: $2,400"; stat tiles "7 Bids"/"23 Watching"/"{N}h Left"; button "Accept at $\{price\}".
3. **Creative/visual inventory:**
   - `landing-mesh-bg`: oversized triple radial-gradient blob field that slowly drifts/scales (22s loop).
   - `landing-grain-overlay`: present in markup but CSS-neutered (`display:none`) — no visible film grain, a deliberate "Pastel Indigo" theme decision per code comment.
   - `landing-mouse-glow`: 500px radial highlight following the cursor, fine-pointer only.
   - 10 floating "ember" particles rising/fading via `animate-ember` (1.8s loop, staggered delays).
   - Animated dot-grid background, fades in once (2s).
   - `hero-scan-line`: 1px horizontal gradient sweeping top-to-bottom every 12s, essentially invisible against the light background.
   - Three large blurred "breathing" glow orbs (900×700, 500×500, 400×400px) on staggered 8–12s cycles.
   - 1px top hairline gradient.
   - Demo card: animated glowing border (3s loop) + a `landing-glow-orb` behind it that re-triggers every price tick — soft indigo flash synced to the ticking price. Spark particles occasionally shoot up near the price number.
4. **Layout at 1440px:** `min-h-[85vh]` section, content `max-w-[1400px] mx-auto`, two-column grid (`lg:grid-cols-2`, gap 64px): left = copy, right = demo card capped `max-w-sm` (≈384px), leaving visible empty space to its right — reads as intentional breathing room. Ticker spans the section's full `max-w-[1400px]` as a bordered strip.
5. **Interactive elements & hover:**
   - "Start Free": hover darkens bg + `ArrowRight` icon nudges right 0.5 on hover.
   - "See Pricing": `btn-ghost` — hover fills light gray, text darkens.
   - "Accept at $X" (demo card): full-width, same hover darkening; non-functional demo, no real click destination.
6. **Animation/motion (auto-playing, no scroll needed):**
   - Staggered load sequence: badge (0ms) → headline words (150ms + 60ms/word) → subhead (450ms) → CTAs (600/750ms) → trust badges (850ms + 80ms each).
   - Demo visual enters via fade-in-right (500ms delay).
   - PriceDecayDemo runs a real interval: every 120ms, price decays, counting from $2,400 to $800 floor then stops; "Left" counts down from 64h in lockstep; every 3rd tick spawns 2 spark particles; price number flashes green-tinted then settles.
   - Ticker: CSS `animate-marquee` (28s linear, infinite) with soft fade-mask gradients and a center "glow" highlight; fades/slides into view once scrolled into view, then runs continuously.
   - Under `prefers-reduced-motion`, both freeze to a static representative frame.
7. **Desktop-specific issues:** None major. Demo card's `max-w-sm` constraint leaves noticeable empty right-column space at 1440px, reads as deliberate rather than a bug. Ticker text is very small (`text-[11px]`) for a 1440px viewport — legible but easy to skim past.

## PriceDecayShowcase (id="how-it-works")

1. **Purpose:** The page's centerpiece — dramatizes the mechanic with a live-ticking terminal, then explains it in 4 steps, plus two collapsed detail toggles.
2. **Copy (verbatim):** Same H2/subhead/button, MarketTerminal header/body/activity-log/disclaimer, HowItWorks 4-step copy, and both collapsed-toggle contents as documented under Mobile above.
3. **Creative/visual inventory:**
   - Section background: layered radial gradients over off-white base, top hairline gradient border.
   - Terminal card: white/80%-opacity + backdrop-blur, indigo hairline border; header strip pulsing live-dot; price rendered in large monospace rust-red with a `key`-remount flash animation each tick; decay bar is a two-tone indigo→rust gradient fill with a continuously-sweeping white shimmer highlight (`decay-bar-sweep`, 2.4s linear loop).
   - Step cards: white glass cards, numbered badge pill top-right, colored icon tile per step (green/indigo/amber/indigo). Icons "pop" in with scale+rotate entrance when scrolled into view.
   - Dashed connector rail between step cards (desktop only) with a small pulsing indigo dot riding the line.
   - Formula/case toggles render as a dashed horizontal rule with the toggle label centered on top in a small pill.
4. **Layout at 1440px:** Section content capped `max-w-[1400px]`. Top block 2-column grid `lg:grid-cols-[0.85fr_1.15fr]` (copy left, terminal right, terminal column slightly wider). Step cards use a 7-track grid on large screens: `lg:grid-cols-[1fr_40px_1fr_40px_1fr_40px_1fr]` — 4 equal card columns interleaved with 3 narrow 40px connector-rail columns, all in a single row at 1440px.
5. **Interactive elements & hover:**
   - "See how decay works": `btn-ghost`, arrow nudges right on hover.
   - Step cards: 3D tilt-on-hover (up to 8° rotateX/Y based on cursor position, fine-pointer only) + border-darken on hover, 300ms.
   - Formula/case toggles: native accordion, label hover turns indigo.
6. **Animation/motion:**
   - Top block fades/slides up on scroll-into-view, terminal delayed 150ms after copy.
   - Terminal price ticks every 900ms (resets to $4,200 at floor); activity log rotates a new line every 2.2s with a slide-down entrance, older lines fade via decreasing opacity.
   - Decay bar's shimmer sweep runs continuously, independent of tick rate.
   - Step cards stagger in (200ms + 80ms each) with icons popping in on the same stagger.
   - Under reduced motion: terminal shows a single static log line; interval-driven loops don't run.
7. **Desktop-specific issues:** None significant — the 1400px max-width is well-used by the 4-card + 3-connector grid; nothing looks cramped or excessively empty.

## LiveAuctions (id="live")

1. **Purpose:** "Right now on GeekBid" — grid of independently, continuously live-decaying auction cards, filterable by category chips.
2. **Copy (verbatim):** Same eyebrow/H2/link/category-chip/6-auction-card copy as documented under Mobile above, including per-category avgDrop%/timeToHire stat line and footer disclaimer.
3. **Creative/visual inventory:** Category chip icons (lucide, 12px) per category; active chip solid indigo fill/white text, inactive transparent/translucent border. Auction cards: warm off-white, indigo hairline border, thin indigo progress bar (animates width 1200ms linear per tick), price flashes rust-red + scales 1.05 briefly on each tick then settles.
4. **Layout at 1440px:** `max-w-[1320px]` container. Card grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` → **3 columns × 2 rows** at 1440px, gap 20px. Header row `flex items-end justify-between`. All 7 category chips fit on a single row.
5. **Interactive elements & hover:**
   - Category chips toggle `activeCategory` filter (click active chip again to clear); since each category has exactly 1 matching auction in the current dataset, filtering collapses the grid to a single card.
   - Auction cards: `hover:shadow-[...] hover:border-[...]`, 300ms — soft indigo drop-shadow lift + border-darken on hover, per-card `transitionDelay` staggered by index.
   - "Browse all auctions": text link, `hover:text-[#3d3373]`.
6. **Animation/motion:** Each auction decays on its own 1800ms interval (price steps ~4.5% of range per tick, bidder count occasionally increments), resetting to a fresh randomized cycle on reaching floor — cards loop indefinitely and asynchronously from each other. Header/chip row fade/slide up on scroll; cards stagger in with `i*0.08s` delay. Reduced motion: auctions freeze at the midpoint between start/floor.
7. **Desktop-specific issues:** None structural. Filtering to a single-result category leaves 2 empty grid slots at 1440px — functionally fine but visually a bit sparse, since the layout doesn't re-center the lone remaining card.

## EscrowPerimeter (id="trust")

1. **Purpose:** Builds trust around payment safety via a literal, state-gated diagram, plus a folded-in stat strip.
2. **Copy (verbatim):** Same stat strip ("140 bids this week"/"1 decision was yours"), station labels, and button copy as documented under Mobile above.
3. **Creative/visual inventory:** "140" is a genuine count-up animation (0→140 over 1100ms) once scrolled into view, not static. Tick-mark bar: 27 thin vertical bars, all 13px tall except the 14th (center, "survivor") at 26px, solid indigo. Diagram: thin connecting rail, small circular indigo token with white "$" traveling per phase, three white pill station labels, and — only around Escrow — a hand-drawn-style SVG perimeter that traces itself closed the instant the token arrives, fading out on release.
4. **Layout at 1440px:** Narrow centered column, `max-w-[820px]`, all content center-aligned — a deliberately tight, focused single-column layout distinct from wider grids elsewhere; leaves large flanking whitespace at 1440px, reads as intentional (matches the section's "quiet, deliberate" tone).
5. **Interactive elements & hover:**
   - "Approve & release": disabled (opacity-40) unless token is "held". **Verified live**: clicking while held moves the token to payout, flips label to "Released", fades the perimeter, button becomes disabled/grayed afterward (screenshot-confirmed end-to-end).
   - "Replay": resets `replayKey`, restarts the idle→held sequence.
6. **Animation/motion:** On scroll-into-view, token auto-travels from payment to escrow over 900ms and stops — automatic, no user input needed for this phase. Release (after clicking Approve) has an 800ms delay before the token continues to payout. Under reduced motion, diagram skips straight to "held" and clicking Approve jumps straight to "released" with no delay.
7. **Desktop-specific issues:** None found in this section itself.

## WhyGeekBidSection (Comparison + PricingSection)

### Comparison (id="compare" — note: not in the Nav's link list, only reachable by direct scroll)

1. **Purpose:** "Why us vs. the old way" — a trimmed 2-row comparison table (per code comment, deliberately cut from more rows to avoid repeating claims made elsewhere).
2. **Copy (verbatim):** Same H2/subhead/2-row table copy as documented under Mobile above.
3. **Creative/visual inventory:** Glass panel table, GeekBid column tinted indigo background wash, indigo divider borders both sides. Check (indigo) vs. X (gray) icons per cell. A large soft blue-tinted ambient blur blob sits behind the section (described in-code as "distinct from the gold used elsewhere," though visually still in the indigo family at very low opacity).
4. **Layout at 1440px:** `max-w-5xl` (narrower than most other sections), table `min-w-[500px]` with `overflow-x-auto` wrapper (a mobile safety net not needed at this width) inside a 3-column CSS grid per row.
5. **Interactive elements & hover:** Table rows: faint full-row highlight tint on hover, no duration override (Tailwind default).
6. **Animation/motion:** Header and table fade/slide up on scroll-into-view (table delayed 150ms); rows stagger in (300ms + 60ms × index).
7. **Desktop-specific issues:** With only 2 comparison rows, the table looks noticeably short/sparse relative to its wide `glass-panel` container and surrounding vertical padding — reads thin as a "comparison table" compared to the density of every other section.

### PricingSection (id="pricing")

1. **Purpose:** Plan/pricing cards, sourced live from `lib/plans.ts` so copy can't drift from enforced backend limits (per code comment).
2. **Copy (verbatim):** Same H2/subhead/3-tier copy (Free/Plus/Premium) and footnote as documented under Mobile above.
3. **Creative/visual inventory:**
   - Icons per tier (lucide, 16px): Zap (Free), Crown (Plus), Building2 (Premium).
   - "Ascending stairs" SVG connector above the cards (desktop only): a right-angle stepped path that draws itself via `stroke-dashoffset` once in view (1100ms), with three badge dots that light up (fill cream → solid indigo) at proportional points along the draw (0%, 45%, 100%).
   - Plus card: white bg with indigo-tinted border + outer glow shadow, plus the "MOST POPULAR" pill floating above its top edge. Free/Premium cards use a plain thin indigo-hairline border.
   - Large ambient blur blob behind the whole pricing block.
4. **Layout at 1440px:** `max-w-6xl` container, 3 equal columns (`md:grid-cols-3`, gap 24px) — Free/Plus/Premium side by side, Plus elevated via badge+glow rather than size (all three cards equal width/height via `flex-1` feature list vertically centering to equalize varying feature-list lengths).
5. **Interactive elements & hover:**
   - All 3 cards: `hover:-translate-y-1` (4px lift), 300ms.
   - Free/Premium CTAs: bordered pill, hover solidifies border + faint indigo fill wash.
   - Plus CTA: solid indigo pill, `hover:bg-[#7c3aed]` — **lightens/brightens on hover**, the one CTA in this section using a *lighten* hover instead of *darken*, inconsistent with `.btn-primary`'s darken-on-hover used elsewhere on the page (bespoke class here, not the shared `.btn-primary`).
6. **Animation/motion:** Stairs-connector draw-in + dot-lighting runs once on scroll-into-view (1100ms total, no repeat). Cards themselves have no separate scroll-reveal animation — only the stairs connector animates on entry.
7. **Desktop-specific issues:** None major. Good use of the 1440px width; three-column layout well-proportioned.

## Testimonials (id="testimonials")

1. **Purpose:** Social proof via an auto-scrolling testimonial carousel.
2. **Copy (verbatim):** Same 3-testimonial copy (Derek Olsen/Emma Johnson/Marcus Chen) as documented under Mobile above; array duplicated end-to-end for a seamless loop (6 DOM cards total).
3. **Creative/visual inventory:**
   - Giant decorative quotation marks: top-left and bottom-right (rotated 180°), huge serif glyphs at ~3% opacity, `hidden lg:block` — a very subtle background flourish, easy to miss.
   - Soft ambient blur blob centered behind the carousel.
   - Each card: white rounded card with a 1px solid violet border wrapper (simplified from an originally-planned rotating conic-gradient border per code comment — now a static solid-color frame), role tag pill, 5 filled indigo stars, decorative oversized quote-mark glyph top-right (brightens on hover), quote, colored "result" pill with check icon, gradient divider, avatar (colored initials circle — no real photos, `photo: ""` in all 3 entries) with a small green "online" dot badge, name, title/company in the testimonial's accent color.
4. **Layout at 1440px:** Cards `flex-shrink-0`, `min-width: 360px, max-width: 420px`, horizontally scrollable track inside a `max-w-[1400px]` container with bleed and left/right fade-mask gradients. At 1440px roughly 3+ cards visible at once with a 4th partially visible at the right fade edge.
5. **Interactive elements & hover:**
   - Cards: `hover:-translate-y-1` (4px lift) + inner content light lavender tint + quote glyph brightens 8%→14% opacity — all 300ms.
   - Hovering the carousel track pauses auto-scroll (`onMouseEnter`), resumes on `onMouseLeave` — a considerate UX touch for desktop.
   - Navigation dots: active dot wider (20px vs 6px) solid indigo, inactive small tan circles; clicking jumps to that testimonial.
6. **Animation/motion:** Continuous auto-scroll (~1px/30ms), loops seamlessly by resetting `scrollLeft` at the track midpoint. Active-dot indicator updates in sync with scroll position. Section fades/slides up on scroll-into-view.
7. **Desktop-specific issues:** None found — the auto-scroll pause-on-hover is a nice desktop-specific consideration (no equivalent exists for touch, but that's out of scope at this viewport).

## FAQ (id="faq")

1. **Purpose:** Objection-handling accordion.
2. **Copy (verbatim, all 6 Q&As):** Identical to the Mobile section above.
3. **Creative/visual inventory:** Plain white background, minimal styling — each item a native `<details>` with a bottom hairline border, `Plus` icon (indigo, 18px) rotating 45° into an "×" when open. No numbering, no icon badges, no card treatment — deliberately the plainest section on the page.
4. **Layout at 1440px:** Very narrow centered column, `max-w-[760px]` — by far the narrowest content column of any section, leaving large flanking whitespace on both sides (intentional for Q&A readability, but visually the most "unused-width" section on the page next to EscrowPerimeter).
5. **Interactive elements & hover:** Native accordion — **multiple items can be open simultaneously** (no exclusivity logic). **Verified live**: clicking the first question opens it, reveals the answer with a smooth height transition (`grid-template-rows: 0fr → 1fr`, 300ms cubic-bezier) rather than a jump-cut, Plus icon rotates into an X. Summary label turns indigo on hover.
6. **Animation/motion:** Items stagger-fade-in on scroll (60ms × index delay). Open/close uses the grid-rows collapse trick, explicitly `motion-reduce:transition-none` for reduced-motion users (snaps instantly).
7. **Desktop-specific issues:** None functionally, but the narrow 760px column leaves a lot of idle horizontal space at 1440px — a minor "why isn't this wider or two-column" question at this viewport specifically.

## CTA (final section, no explicit id)

1. **Purpose:** Closing conversion push — a quiet "log line" lead-in, then a bold headline + dual CTA.
2. **Copy (verbatim):** Same payoff lines, eyebrow, headline, subhead, dual CTA, and fine print as documented under Mobile above.
3. **Creative/visual inventory:**
   - Lead-in band: full-bleed near-black strip, each line prefixed with a tiny bullet dot, monospace timestamp on the first line only.
   - Main CTA area: subtle dot-grid background, large soft indigo glow blob pulsing behind the headline (`landing-cta-glow`, 3.2s "urgent" pulse — the most emphatic ambient animation on the page, matching its "final push" role), top/bottom hairline gradient borders framing the section.
4. **Layout at 1440px:** Lead-in band `max-w-[600px]` centered. Headline/CTA block `max-w-5xl` centered, all center-aligned — a tall, narrow, very vertically generous closing section.
5. **Interactive elements & hover:**
   - "Get Started Free": standard darken-hover, arrow nudges further right on hover (`translate-x-1`, slightly larger nudge than other arrow buttons on the page, which use `translate-x-0.5`).
   - "Apply as Freelancer": standard hover fill, chevron icon (no hover-specific animation on the icon itself, unlike the primary button's arrow).
6. **Animation/motion:** 3 lead-in lines reveal sequentially (0/400/800ms) as the band scrolls into view — each fades + slides up 8px. The glow blob behind the headline pulses continuously and indefinitely (not a one-shot).
7. **Desktop-specific issues:** None found.

## Footer

1. **Purpose:** Standard site footer — brand recap, link columns, legal.
2. **Copy (verbatim):** Same brand blurb, Platform/Company/Legal columns, and copyright line as documented under Mobile above.
3. **Creative/visual inventory:** "Constellation" background — 9 fixed-position small indigo dots, intended to twinkle but the keyframe is explicitly neutered in CSS (`animation: none; opacity: 0`) per a "Pastel Indigo doesn't want starfield twinkle" theme decision — so in practice **these 9 dots are invisible**, dead/inert decorative markup rendering nothing.
4. **Layout at 1440px:** `max-w-[1400px]` container, `grid-cols-4` — Brand/Platform/Company/Legal as 4 equal columns, left-aligned text at this width (only mobile is centered). Bottom bar is a simple flex row below a hairline divider.
5. **Interactive elements & hover:**
   - Real links (Platform only): darkens to near-black + nudges right 2px, 200ms ease-out — a nice subtle micro-interaction, but only 4 of 11 listed items get it.
   - Logo: hover scales the mark to 110% (300ms).
6. **Animation/motion:** None beyond the link/logo hover above; constellation dots static/invisible as noted.
7. **Desktop-specific issues (notable):** Company and Legal columns list 7 items styled identically to real Platform links but are inert plain text with no `href`, no click handler, no hover state — visually indistinguishable from real links until clicked. At a 1440px viewport where the footer is fully visible and inviting exploration, this reads as broken/placeholder navigation. The constellation dots are fully invisible — effectively dead code shipping to production with no visual payoff.

## Summary of Desktop-Specific Issues (§7 rollup, this pass)

1. **[Major/functional] Sticky nav is broken** — full technical detail above (§Nav and global note).
2. **[Content bug] Footer "Company" and "Legal" links are fake** — 7 of 11 items are plain text, not real links.
3. **[Dead code] Footer "constellation" dots are invisible** — explicitly neutered animation (`opacity: 0` always).
4. **[Minor/consistency] Pricing "Upgrade to Plus" button lightens on hover** while every other primary button darkens — a hover-direction inconsistency for the same "primary CTA" role.
5. **[Minor] Console error on every load:** `500 Internal Server Error` on `GET /api/jobs`, repeated 4× in one session.
6. **[Minor/whitespace] Comparison table (2 rows) and FAQ (760px column) are the two most "unused-width" sections at 1440px** — noticeably sparser/narrower than the rest of the page's generally full-width, content-dense sections.
7. **[Nav discoverability] The Comparison section's anchor (`#compare`) is not in the Nav's link list** — reachable only by scrolling past Trust, not by any nav shortcut, even though Pricing (which immediately follows in the same parent section) is linked.

All other interactive elements tested at this viewport (nav link hover, primary/ghost button hover, FAQ accordion open/close, EscrowPerimeter Approve & Release/Replay flow, auction-card and testimonial-card hover/lift, category-chip filtering) behaved as coded, with smooth, purposeful transitions and sensible disabled/enabled states.

---

# Viewport Detail: Large Desktop (1920×1080)

Audited live at `http://localhost:3000`, viewport forced to 1920×1080. **Environment note:** the dev server's `/api/jobs` endpoint returned repeated `500 Internal Server Error` in the console during this audit (4 occurrences) — doesn't visibly break the landing page since no section fetches live data.

## LandingGate

1. **Purpose:** Auth/mount gate wrapping the entire landing page — not a visual section.
2. **Copy:** None.
3. **Creative/visual inventory:** None — supplies page-wide background/text color and `overflow-x-hidden`; renders nothing (`return null`) until `mounted` is true or if a `currentUser` is present.
4. **Layout:** N/A.
5. **Interactive elements:** None directly, but owns the redirect behavior below.
6. **Animation/motion:** None.
7. **Large-desktop-specific issues:** None — purely functional. On mount, if `useApp()` reports a logged-in `currentUser`, calls `router.replace("/feed")` and renders `null` in the interim (brief blank flash possible for logged-in users hitting `/`). For a logged-out visitor, renders `children` immediately once `mounted` is true.

## Nav

1. **Purpose:** Sticky top navigation bar — brand, in-page anchor links, sign-in/sign-up CTAs, and a scroll-progress hairline.
2. **Verbatim copy:** Same brand wordmark, 5 nav links, "Sign In", "Get Started" as documented under Mobile above.
3. **Creative/visual inventory:** Same logo mark (`Logo.tsx`, shared everywhere the logo appears), white nav bar with thin bottom border, `ScrollProgress` component, solid purple "Get Started" pill, plain-text "Sign In".
4. **Layout at 1920px:** Nav inner row `max-w-[1400px] mx-auto px-8`, height `h-14` (56px). Confirmed via measurement: content spans x=258 to x=1658 (1400px wide), leaving **~258–263px empty margin on each side** of the full 1920px bar. The white bar itself is full-bleed (edge-to-edge), only the content row is capped. Doesn't feel stretched because the bar is short (56px) and simple.
5. **Interactive elements:** 5 anchor links smooth-scroll to section ids via a scoped `scrollIntoView` handler. "Sign In" → `/login`. "Get Started" → `/login?tab=register&role=client`.
6. **Animation/motion:** Nav link color transitions on hover (200ms). Active-section link gets active styling driven by `useActiveSection` (IntersectionObserver, rootMargin `-40% 0px -50% 0px`).
7. **Large-desktop-specific issues / BUG FOUND:** At page load, scrolled to the very top (y=0, within the Hero, nowhere near Pricing), the **"PRICING" nav link renders highlighted purple (active state) instead of no link being active**. Verified by pixel-cropping the nav screenshot — "PRICING" is unmistakably `#5b21b6` while all other links are gray. A real functional bug in `useActiveSection`'s IntersectionObserver initialization (likely fires against a pre-hydration/pre-layout DOM state), not a viewport-size artifact — but easy to catch on this wide viewport since the whole nav row is visible above the fold at once.

## Hero

1. **Purpose:** Primary above-the-fold pitch — headline, sub-copy, dual CTAs, trust badges, live-looking price-decay demo card; closes with a horizontal "recent activity" ticker.
2. **Verbatim copy:** Same eyebrow/headline/subhead/CTAs/trust-badges/ticker copy as documented under Mobile above. Demo card captured mid/at-floor: price **$800** (Floor: $800 / Start: $2,400), mini-stats "7 BIDS"/"23 WATCHING"/dynamic "Left" countdown, CTA "Accept at $800" (live-bound to displayed price).
3. **Creative/visual inventory:** Same mesh/grain/mouse-glow layers, 10 ember particles, dot-grid background, CRT scan-line, three breathing glow orbs (center 900×700px 6% opacity/160px blur, upper-right 500×500px, lower-left 400×400px violet), 1px top hairline, `landing-header-glow` treatment on the headline, demo card glassmorphic treatment with glow-orb + sparkle particles, ticker strip with fade-masks and center glow highlight.
4. **Layout at 1920px:** Section `min-h-[85vh]` (≈918px at 1080 viewport height). Content wrapped `max-w-[1400px] mx-auto` (measured x=258, width=1400, right margin=263px — symmetric ~260px margins on either side of 1920px). Two-column grid (`lg:grid-cols-2`, 1fr/1fr, 64–96px gap): left = copy, right = demo card capped `max-w-sm` (384px) and further centered in its column — the demo card looks noticeably narrow/small relative to the column width available, real unused whitespace to its right and below the copy block (headline/subhead/CTAs top out well above vertical-center of the 918px section). The ticker band is correctly capped to the same 1400px/258px-margin container (confirmed via `getBoundingClientRect`), despite fade-mask gradients visually reading as if it bleeds edge-to-edge — it does not.
5. **Interactive elements:** "Start Free" → `/login?tab=register&role=client`; "See Pricing" → smooth-scrolls to `#pricing`; demo card's "Accept at $X" has no evident click handler beyond styling (decorative).
6. **Animation/motion:** Staggered fade-in-up entrance for badge → headline words → subhead → CTAs → trust badges (0–1170ms). Right-column demo fades in from the right. Ticker scroll-reveals once 40% in view, then loops (frozen under `prefers-reduced-motion`). Demo card runs its own 120ms-tick interval independent of the ticker.
7. **Large-desktop-specific issues:**
   - The right-column demo card (384px) looks small and somewhat lost against the generous column width it's given in a 2-column `1fr/1fr` grid at this viewport — visibly more empty space around the card than content.
   - Overall hero content occupies only the upper-middle portion of the 918px-tall section; a band of ambient-background-only space sits below the CTA/trust-badge row and above the ticker, reading slightly sparse at full-HD height.
   - Confirmed NOT an issue: despite visual impression from fade masks, the ticker strip is properly width-capped to match the rest of the hero content (not full-bleed).

## PriceDecayShowcase (id="how-it-works")

1. **Purpose:** Dramatizes the core reverse-auction mechanic with a live-ticking "Market Terminal" card, then a 4-step "How it Works" explainer, plus two collapsed detail toggles.
2. **Verbatim copy:** Same headline/subhead/CTA, Market Terminal header/job label/price-and-decay-label/bar-labels/activity-feed copy, 4-step copy, and both collapsed-toggle contents (formula code + `CaseTimeline`) as documented under Mobile above. Captured price frame: "$3,200".
3. **Creative/visual inventory:** Layered radial gradients (top-left/bottom-right blooms) over base off-white, top hairline border. Market Terminal: white/80% card, purple border, rounded-2xl; header strip pulsing dot + "LIVE MARKET" + monospace tag. **Giant price number in monospace, terracotta, `text-[5.5rem]` at `2xl` breakpoint — genuinely huge and reads well at 1920px.** Thin decay progress bar. Activity log as a faux terminal/order-book list with `›` chevrons, opacity step-down per older line. 4 step cards: glassmorphic, colored icon tile per step, numbered pill badge, 3D tilt-on-hover (fine-pointer, desktop-only touch). Dashed connector line between step cards visible at `lg:` and above.
4. **Layout at 1920px:** Outer wrapper `max-w-[1400px] mx-auto px-5 sm:px-8`. Top grid uses asymmetric `lg:grid-cols-[0.85fr_1.15fr]` — copy narrower than terminal, appropriate since the terminal is the visual hero. 4-step grid uses `lg:grid-cols-[1fr_40px_1fr_40px_1fr_40px_1fr]` — at 1920px (1400px container) each step card is roughly ~320px wide, comfortably filled, connectors read as genuine flow arrows rather than stretched-thin. **No obvious excess whitespace within this section — one of the better-utilized sections at this width.**
5. **Interactive elements:** "See how decay works" (self-referential anchor scroll). Two native `<details>/<summary>` toggles (formula, case study) — uses a custom `landing-formula-toggle` diamond-bullet style, not the `+` icon FAQ uses.
6. **Animation/motion:** Section fades/slides in on scroll (`useInView` 0.15). Market Terminal runs two independent intervals (price every 900ms, activity log every 2200ms — both freeze under reduced motion). Step cards stagger in (200ms + idx×80ms) with an icon-pop micro-animation. 3D tilt on hover.
7. **Large-desktop-specific issues:** None significant — this section scales well to 1920px; the asymmetric grid split and 4-column step layout both use the extra width purposefully rather than just stretching. The giant `2xl:text-[5.5rem]` price number is a good example of a component explicitly designed with large-desktop breakpoints in mind.

## LiveAuctions (id="live")

1. **Purpose:** "Right now on GeekBid" — filterable grid of independently live-decaying auction cards.
2. **Verbatim copy:** Same eyebrow/headline/link/category-chip/6-auction-card copy as documented under Mobile above. Observed decaying-price frames: $1,190→$1,400, $2,434→$2,800, $762→$900, etc.
3. **Creative/visual inventory:** Section background is **plain white** (`bg-white`), contrasting against the off-white sections above/below — a clear visual "band" break as you scroll. Category chips: active = solid purple fill, inactive = outlined. Auction cards: `#fbfaf7`-tinted (slightly off-white against the section's pure-white bg), hover lift + shadow + border-brighten. Price flashes red and scales 1.05x briefly on each tick. 3-column grid, 2×3 layout for the 6 illustrative auctions.
4. **Layout at 1920px:** Container `max-w-[1320px] mx-auto px-5 sm:px-8` — **narrower than the 1400px used by Nav/Hero/PriceDecayShowcase**, measured at x=298, width=1320, right margin=303px, a real (if small, ~80px) inconsistency in the page's horizontal rhythm between adjacent sections. 3-column card grid fills this container comfortably, no stretching or awkward gaps within cards.
5. **Interactive elements:** Category chips filter live (click active chip again to clear). "Browse all auctions" → `/feed`. Cards themselves not clickable/linked despite hover styling suggesting interactivity.
6. **Animation/motion:** Section-level scroll reveal. Each auction independently decays every 1800ms, flashing red/scaling on each tick, reshuffling near floor. Cards stagger in on scroll.
7. **Large-desktop-specific issues:**
   - Container max-width (1320px) doesn't match the 1400px used immediately above (Hero/PriceDecayShowcase) and below in most other sections — at 1920px a ~40px asymmetric left-edge shift, subtle but measurable, contributing to the page's overall inconsistent column rhythm.
   - Card hover affordance (lift + shadow + border highlight) implies clickability but cards aren't links — could read as a broken/incomplete interaction on a large monitor where hover states are far more likely to be triggered during casual mouse movement than on touch devices.

## EscrowPerimeter (id="trust")

1. **Purpose:** Single-column, centered "trust" narrative — interactive payment→escrow→payout diagram plus a merged stat strip.
2. **Verbatim copy:** Same eyebrow/headline/stat-strip/station-labels/button copy as documented under Mobile above. Captured frame: token centered at "Escrow" station, perimeter fully drawn, "HELD" label showing in purple.
3. **Creative/visual inventory:** Plain `#fbfaf7` background, no gradients/glows (deliberately quieter/calmer than neighbors, fitting the "trust" theme). Stat strip: 27-tick bar-chart-like array, one taller solid-purple "survivor" tick at center. Diagram: thin horizontal rail connecting three pill station boxes; small circular purple token (white "$" glyph) travels per phase; center "Escrow" box draws a purple rounded-rect perimeter outline via animated SVG `stroke-dashoffset` reveal on arrival.
4. **Layout at 1920px:** Container `max-w-[820px] mx-auto px-5 sm:px-8`, text-centered — measured x=548, width=820, right margin=553px. **By far the narrowest primary content column on the page** relative to sections immediately before/after it (1320–1400px). At 1920px this produces **~550px of empty margin on each side**, over a quarter of the viewport width unused per flank. Because the background is flat and undecorated (no side glows/patterns), the emptiness reads plainly — this section visually "shrinks" in the middle of an otherwise wide page.
5. **Interactive elements:** "Approve & release" (disabled unless `phase === "held"`; triggers release animation, disables itself again). "Replay" (resets `replayKey`, restarts idle→held sequence).
6. **Animation/motion:** On scroll into view (20% threshold), token auto-travels payment→escrow over 900ms and stops. Clicking Approve triggers an 800ms delay then continues to payout, escrow perimeter fades out. Bids stat count-up via `useCountUp` (1100ms ease). Escrow perimeter stroke draws itself in ~600ms cubic-bezier easing on arrival.
7. **Large-desktop-specific issues: Primary finding for this section** — the 820px content cap is dramatically narrower than the page's dominant 1320–1400px column width used elsewhere, so at 1920px this section has the widest, emptiest side margins of the entire page (~550px per side vs. ~260–300px elsewhere). A deliberate design choice (centered narrow column for a focused "trust" statement), but combined with the plain, glow-free background, it's the single biggest visual gap/imbalance moment when scrolling the page at full-HD width.

## WhyGeekBidSection

Wraps two nested content blocks — `Comparison` and `PricingSection` — inside one `<section>`, no heading of its own.

### Comparison (nested)

1. **Purpose:** "Why us vs. the old way" comparison table.
2. **Verbatim copy:** Same H2/subhead/2-row table copy as documented under Mobile above. Only 2 rows — trimmed per an in-code comment noting Price Discovery/Payment Security rows were cut as duplicative of other sections.
3. **Creative/visual inventory:** Cool-blue-tinted ambient blur circle behind the table (only section on the page using a blue-leaning tint rather than purple/gold, per its own code comment). Table: `glass-panel`, 3-column grid, GeekBid column light purple tint, check/X icons.
4. **Layout at 1920px:** Container `max-w-5xl` (1024px) — measured x=446, width=1024, right margin=451px. Table has `min-w-[500px]` inside `overflow-x-auto` (irrelevant at this width). With only **2 data rows**, the table is visually short sitting inside a section that otherwise has generous vertical rhythm — reads as a fairly minor, quick "aside" rather than a substantial section, especially with ~450px of empty side margin at 1920px.
5. **Interactive elements:** None (static table), subtle row-hover background tint transition.
6. **Animation/motion:** Header and table fade/slide in on scroll; rows stagger in with increasing delay.
7. **Large-desktop-specific issues:** 1024px container is the second-narrowest on the page (after EscrowPerimeter's 820px) — another ~450px-per-side empty-margin moment. Combined with only 2 comparison rows, this reads as sparse/thin content for the horizontal (and to a lesser extent vertical) real estate it's given at 1920px.

### PricingSection (nested, id="pricing")

1. **Purpose:** 3-tier pricing cards (Free/Plus/Premium), sourced live from `PLANS` in `lib/plans.ts`.
2. **Verbatim copy:** Same H2/subhead/3-tier/footnote copy as documented under Mobile above.
3. **Creative/visual inventory:** "Ascending stairs" SVG connector drawn via `stroke-dashoffset` on scroll-into-view, 3 badge dots lighting up purple as the draw reaches each anchor. Hidden below `md:`, visible and functional at 1920px. Tier icons: Zap (Free), Crown (Plus, purple), Building2 (Premium). Plus card visually elevated: white bg + purple-tinted border + soft glow shadow + "MOST POPULAR" pill overlapping the top edge. Large price numerals (`text-[2.75rem]`, `landing-num`). Purple checkmark bullets.
4. **Layout at 1920px:** Container `max-w-6xl` (1152px) — a **third distinct container width** in this same `<section>` (Comparison directly above uses 1024px). 3-column card grid (`md:grid-cols-3`, gap-6) comfortably fills the 1152px column; cards well-proportioned, not stretched.
5. **Interactive elements:** "Start Free" → `/login`; "Upgrade to Plus"/"Go Premium" → `/pricing`; all cards `hover:-translate-y-1` lift.
6. **Animation/motion:** Stairs-connector path draws in (1100ms) and lights each anchor dot at 0%/45%/100% of that duration once 30% in view; frozen (fully drawn) under reduced motion.
7. **Large-desktop-specific issues:** This nested block uses yet another container width (1152px) distinct from its sibling Comparison block directly above (1024px) — meaning within a single `<section>`, the content column width visibly shifts partway down. Both remain comfortably centered/readable at 1920px, but the edge misalignment between the comparison table and the pricing cards is noticeable if you draw a vertical line down the page.

## Testimonials (id="testimonials")

1. **Purpose:** Auto-scrolling social-proof carousel.
2. **Verbatim copy:** Same 3-testimonial copy (Derek Olsen/Emma Johnson/Marcus Chen) as documented under Mobile above, duplicated once for the seamless-loop carousel (6 DOM cards total).
3. **Creative/visual inventory:** Two giant decorative serif quotation marks (200px font-size, 3% opacity) in the section's top-left and bottom-right corners, hidden below `lg:` — **visible at 1920px**. Central soft purple blur blob behind the heading. Each card: gradient/glow border treatment, large decorative "”" glyph top-right (brightens on hover), role tag pill, 5 filled purple stars, quote, colored checkmark result pill, divider, initials-only avatar (all three empty `photo` strings — solid purple-tinted circle, bold initials, no real photos) with small green "online" status dot. Left/right edge fade masks. 3 progress dots below.
4. **Layout at 1920px:** Section content wrapped `max-w-[1400px] px-5`, carousel track uses a negative-margin breakout (`-mx-5 sm:-mx-8`) so cards scroll edge-to-edge within that column. At 1920px, **4 full cards plus slivers of a 5th and 6th are visible simultaneously** — with only 3 unique testimonials, this means duplicate content is visibly on-screen at once during normal viewing (not just as a scroll-loop implementation detail), unlike on a 1440px or smaller screen where this wraparound duplication is far less exposed.
5. **Interactive elements:** Hovering pauses auto-scroll (`onMouseEnter`/`onMouseLeave`); clicking a progress dot jumps to that testimonial's start; cards lift slightly on hover.
6. **Animation/motion:** Continuous auto-scroll (`scrollLeft += 1` every 30ms), loops seamlessly at the halfway point of the doubled track; active dot updates as scroll passes each testimonial's boundary.
7. **Large-desktop-specific issues:** Because cards are fixed-width (360–420px) rather than scaling with viewport, the extra width at 1920px is spent showing **more simultaneous cards** rather than **larger cards** — generally the right call, but with only 3 source testimonials the visible repetition (testimonial #1 and a repeat of testimonial #1 in the same viewport) is more exposed here than at a narrower viewport or with more source content.

## FAQ (id="faq")

1. **Purpose:** Native accordion FAQ list.
2. **Verbatim copy:** Identical 6 Q&A pairs as documented under Mobile above, all rendered closed by default.
3. **Creative/visual inventory:** Extremely minimal — plain white background, thin purple-tinted bottom borders per row, `Plus` icon rotating 45° into "×" when expanded. No icons/illustrations beyond the purple "+" and "FAQ" eyebrow label.
4. **Layout at 1920px:** Container `max-w-[760px] mx-auto px-5 sm:px-8` — measured x=578, width=760, right margin=583px. **This is the narrowest content column on the entire page**, narrower even than EscrowPerimeter's 820px. At 1920px this leaves **~580px of dead margin on each side, over 60% of the viewport width unused**, on a section with an entirely flat white background and zero decorative fill — the most extreme container/viewport mismatch on the page.
5. **Interactive elements:** 6 native accordions — grid-rows CSS trick, `motion-reduce:transition-none` respected. Multiple can be open simultaneously (standard native `<details>` behavior).
6. **Animation/motion:** Section-level scroll reveal (rows stagger); each accordion's open/close uses a `grid-template-rows` 0fr→1fr transition (300ms, custom cubic-bezier) so it animates smoothly regardless of answer length.
7. **Large-desktop-specific issues: Most severe container/viewport mismatch on the page.** A 760px-wide, plain-white, undecorated content block centered in a 1920px viewport is visually jarring directly after Testimonials (1400px, richly decorated) and directly before CTA (which starts with a full-bleed dark band). No side illustration, pattern, or secondary content fills the ~1160px of combined dead space — worth reconsidering for large-desktop layouts (e.g. a two-column FAQ layout, a side illustration, or a wider max-width specifically at `2xl:` breakpoints).

## CTA

1. **Purpose:** Closing conversion section — a quiet "log-line" lead-in followed by the main headline + dual CTA buttons.
2. **Verbatim copy:** Same log-line trio, eyebrow, headline, subhead, dual CTA, and fine print as documented under Mobile above.
3. **Creative/visual inventory:** Lead-in band: full-bleed dark background `#1b1523` (the only dark/inverted band on the entire page), small purple/lavender dots prefixing each log line, text stepping from dim monospace (line 1) to bright (lines 2–3). Main CTA area: subtle background grid pattern, large soft purple "cta glow" blob centered behind the headline, top/bottom 1px gradient hairlines. Headline uses the same `landing-header-glow` + `landing-display` treatment as the Hero headline — visually bookending the page.
4. **Layout at 1920px:** Multiple nested widths within this one section: log-line lead-in text `max-w-[600px]` centered — extremely narrow, but forgivable since it sits inside a full-bleed dark band so the narrowness doesn't read as "wasted whitespace" the way it does in FAQ/Comparison/Trust. Headline/subhead/buttons block below uses `max-w-5xl` (1024px) centered on the plain background — same narrow-column-on-light-background pattern seen elsewhere, though less jarring here since it's the final section and reads as an intentional "closing statement" pose.
5. **Interactive elements:** "Get Started Free" and "Apply as Freelancer" — both real navigations, not decorative.
6. **Animation/motion:** Log lines fade/slide in individually with 400ms stagger once 30% in view. Ambient background glow blob present (`landing-cta-glow` class; no explicit `animate-` class visible in the reviewed source excerpt for continuous animation of this particular blob).
7. **Large-desktop-specific issues:** The dark lead-in band and the light CTA band immediately below it use two different narrow container widths (600px vs. ~1024px) stacked directly on top of each other — a minor internal inconsistency, though the dark full-bleed background of the top band means it's the least noticeable instance of the page's recurring "narrow column, wide viewport" pattern.

## Footer

1. **Purpose:** Standard closing footer — brand blurb, 3 link columns, copyright bar.
2. **Verbatim copy:** Same brand blurb, Platform/Company/Legal columns, and copyright line as documented under Mobile above.
3. **Creative/visual inventory:** "Constellation" background — 9 small fixed-position purple dots with staggered pulse/glow animation delays, very subtle against the white background. Logo reused (mark + wordmark) at a slightly larger size than the nav's.
4. **Layout at 1920px:** Container `max-w-[1400px] px-5` — `grid-cols-4` layout evenly dividing the 1400px width (each column ≈304px after gaps). Content spans roughly x=277–1497 (brand text flush-left, Legal column's short text doesn't fill its full column width) — leaving a visible **~420px gap of unused space on the right side of the 1920px viewport**, since there's no 5th column, no social icons, no newsletter signup, or any other content to balance the row. Feels sparse for a full-HD footer.
5. **Interactive elements:** 4 working links (Platform column only). "Company" and "Legal" columns are visually styled like link lists (same gray text color/size as working links) but are **not interactive** — hovering "Privacy Policy" or "About Us" produces no cursor change, no color change, and clicking does nothing.
6. **Animation/motion:** Constellation dots pulse continuously (staggered delays 0–1.8s). Working links get a color shift + 0.5px rightward nudge on hover.
7. **Large-desktop-specific issues:** The 4-column grid technically fills its 1400px container evenly, but because "Company"/"Legal" link text is short and left-aligned within generously-wide (~304px) columns, plus the container itself sits with ~260px margins on a 1920px screen, the overall footer row visually front-loads all content into the left ~65% of the viewport, leaving the right ~400px+ empty. A wider footer (5–6 columns, or a right-aligned social/newsletter block) would use full-HD width more deliberately. Separately (viewport-independent, but worth flagging since fully visible at this width): 7 of the footer's 11 nav-style items are dead/non-functional text masquerading as links.

## Cross-Section Summary — Large-Desktop-Specific Findings (this pass)

The single most consistent, page-wide issue at 1920×1080 is **inconsistent content-column max-width from section to section**, measured precisely via `getBoundingClientRect()`:

| Section | Max-width | Left/right margin at 1920px |
|---|---|---|
| Nav | 1400px | ~258–263px |
| Hero | 1400px | ~258–263px |
| PriceDecayShowcase | 1400px | ~258–263px |
| LiveAuctions | **1320px** | ~298–303px |
| EscrowPerimeter (Trust) | **820px** | ~548–553px |
| Comparison (in WhyGeekBidSection) | **1024px** | ~446–451px |
| PricingSection (in WhyGeekBidSection) | **1152px** | ~384px (approx.) |
| Testimonials | 1400px | ~260px |
| FAQ | **760px** | ~578–583px |
| CTA (log-line band) | 600px (on full-bleed dark bg) | n/a — band is full width |
| CTA (headline/buttons) | ~1024px | ~448px (approx.) |
| Footer | 1400px | ~260px |

No two adjacent sections reliably share the same column width, and the page swings between a ~1400px "wide" column (Hero, PriceDecayShowcase, Testimonials, Footer) and much narrower ~760–1024px columns (Trust, Comparison, FAQ, CTA-headline) with nothing in between to visually bridge the transition. At typical laptop widths (1440px and below) this variance mostly disappears behind `px-*` padding and is unnoticeable; at 1920px it becomes a real, measurable inconsistency in the page's vertical "spine" as you scroll — several sections (Trust, FAQ in particular) leave 45–60% of the viewport width empty on plain, undecorated backgrounds, while others (Hero, PriceDecayShowcase, LiveAuctions) make full, purposeful use of the extra width via multi-column grids and layered background decoration.

**Other notable large-desktop-specific observations:**
- The FAQ section (760px cap) is the most extreme single instance — plain white background, no side content, ~580px dead margin per side.
- The Trust/EscrowPerimeter section (820px cap) is the second most extreme, and unlike FAQ has genuine interactive content (the escrow diagram) that could have justified a wider stage.
- Footer's 4-column grid technically fills its 1400px container but the content itself (short link labels) front-loads left, leaving the rightmost ~400px of the 1920px viewport visually empty with no counterbalancing element.
- Testimonials' fixed-width carousel cards (360–420px) mean the extra 1920px width surfaces *more simultaneous cards* rather than larger ones — with only 3 unique testimonials, this exposes visible content duplication in a single unscrolled view.
- Hero's demo card (`max-w-sm`, 384px) sits inside a much wider `1fr` grid column at this viewport, leaving conspicuous empty space around it in the right half of the fold.
- Sections that scale well and feel intentionally designed for large desktop: PriceDecayShowcase (asymmetric grid + big monospace price number + 4-column step flow with visible connector lines), LiveAuctions (3-column card grid, well-filled), PricingSection (3-column cards + ascending-stairs SVG connector, well-filled at 1152px).

**Functional bugs noticed during this pass (not strictly viewport-specific, but caught because the whole page is visible/legible at once at this resolution):**
1. Nav's "PRICING" link renders as active (purple) on initial page load while scrolled to the very top of the Hero — `useActiveSection`'s IntersectionObserver appears to mis-fire on mount.
2. Footer's "Company" and "Legal" columns (7 items total) are static `<span>` text, not real links — styled identically to the working "Platform" links, so they read as broken/unfinished navigation.
3. Console logged 4× `500 Internal Server Error` for `GET /api/jobs` during the audit session — doesn't visibly break any landing-page section (all landing content is static/mocked) but indicates a backend issue worth separate investigation.
