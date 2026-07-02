# _stale — archived, unused code

Files here are **not imported or referenced by the running app**. Kept (not deleted)
for reference.

| File | Why it's here |
|------|---------------|
| `web-src-lib-data.ts` | Formerly `web/src/lib/data.ts` — mock/fixture data. Verified imported by **no** component or route (grep for `lib/data` returns nothing). The app reads live MongoDB, not this. |

## Deliberately NOT moved here
- **`backend/`** — the Express microservices are dead *relative to the running app*,
  but they're an intentional, documented scaffold (see `backend/README.md`, which calls
  the primary API the Next.js layer and these the "scaling layer"). Removing them is a
  separate decision, not a safe cleanup.
- **Root report `.md` files** (`geekbid_*.md`, `cicd_fix_report.md`) — the top-level
  `README.md` links to them, so moving them would break those links. They stay in place.
