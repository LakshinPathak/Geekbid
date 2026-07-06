# Product

## Register

product

## Users
Two primary roles on one platform: **clients** posting freelance jobs at a
starting price that decays over time, and **freelancers** bidding the price
down to win work. Both are technical/business professionals evaluating real
money and real hires, not casually browsing. A smaller **admin** role runs
back-office operations. As of v17, both roles also interact with a
Free/Plus/Premium subscription system that gates job/bid/AI/team quotas.

## Product Purpose
GeekBid is a reverse-auction freelance marketplace: job prices decay
automatically until a freelancer accepts or a client awards the lowest bid,
surfacing true market rate without negotiation. Monetized via a per-transaction
platform fee (10% Free / 7% Plus / 5% Premium) plus recurring subscription
tiers for higher quotas, API access, and team seats.

## Brand Personality
"Royal Dark" — premium, confident, technical-but-approachable. Near-black
background, gold accent, editorial serif headings paired with a clean sans
body. Three words: **Premium, Sharp, Trustworthy.** The interface should read
like a serious financial/trading terminal crossed with an editorial
marketplace — not a generic startup dashboard.

## Anti-references
Generic AI-generated SaaS template look: Inter-everywhere with no real
typographic hierarchy, cream/beige "safe" backgrounds, tiny uppercase
tracked eyebrows above every section, gradient-clip heading text, identical
icon+heading+text card grids repeated for their own sake. GeekBid already
avoids the light/cream default (dark, gold-on-near-black is deliberate), but
the current font pairing (Inter body + a bare `Georgia, Times New Roman,
serif` heading stack) reads as a generic default rather than a chosen
identity — this is the specific problem to fix.

## Design Principles
1. Every heading commits to the display serif voice — no silent fallback to
   a generic system sans for "just this one label."
2. One dark, gold-accented identity holds across both registers this app
   actually has — the marketing landing page and the product dashboards —
   rather than treating them as unrelated surfaces.
3. Typography communicates function: prices/numbers get tabular, deliberate
   emphasis; labels stay restrained; data-dense areas (feed dashboards)
   prioritize scanability over decoration.
4. No AI-tell scaffolding — no eyebrow-over-every-section, no gradient text,
   no identical repeated card grids where a grid isn't the best affordance.

## Accessibility & Inclusion
Body text on the near-black background (`#080b14`) must clear 4.5:1 contrast;
muted-gray labels (`#a8997e`) need spot-checking against darker panel
surfaces, not just the page background. No stated WCAG level target; treat
AA as the working baseline.
