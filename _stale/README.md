# _stale — archived / unused files

Nothing here is imported by the running app. Kept (not deleted) for reference.

| File | Why it's here |
|------|---------------|
| `web-src-lib-data.ts` | Formerly `web/src/lib/data.ts` — mock/seed fixture data. Verified imported by **no** component or route (grep for `lib/data` returns nothing). The app reads live MongoDB, not this. |
| `reports/geekbid_audit_report.md` | Superseded historical audit. |
| `reports/geekbid_bid_acceptance_and_system_audit.md` | Superseded historical audit. |
| `reports/geekbid_review_2026-07-02.md` | Superseded historical review. |
| `reports/cicd_fix_report.md` | Historical CI/CD fix notes. |

**Current, active docs live at repo root:**
- `AUDIT_REPORT_v12.md` — latest full audit
- `MIGRATION_PLAN_backend_microservices.md` — the backend-migration plan + decisions
- `HANDOFF_ANTIGRAVITY.md` — end-to-end test + run guide

> Note: the `backend/` Express services are **NOT** stale anymore — as of this branch they are being wired into the live request path via the BFF. Do not archive them.
