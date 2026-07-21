# Talent Pool & Freelancer Profile — Client Action Flow Audit

**Scope:** Every client-facing button on the Talent Pool section of the Client Feed
(`web/src/components/feed/TalentPool.tsx`) and the freelancer public profile page
(`web/src/app/profile/[id]/page.tsx`). For each button: frontend handler → API route
→ DB effect → success UX → error UX → verdict.

**Method:** Full read of `TalentPool.tsx`, `DirectHireModal.tsx`, `InviteToBidModal.tsx`,
`MessageFreelancerModal.tsx`, `ClientFeed.tsx`, `profile/[id]/page.tsx`, and every backend
route they call (`api/jobs/direct-offer`, `api/invites`, `api/jobs/offer-response`,
`api/chat/rooms`, `api/chat/messages`). All line numbers below refer to the current
state of the repo on branch `v16`.

---

## Verdict Table

| Location | Button | Frontend handler | API route | DB effect | Success UX | Error UX | Verdict |
|---|---|---|---|---|---|---|---|
| TalentPool card | Whole-card click | `router.push('/profile/${fid}')` (`TalentPool.tsx:109`) | none (navigation) | none | Navigates to profile page | n/a | **PASS** |
| TalentPool | **Message** | `setShowMessageModal(true)` (`TalentPool.tsx:241`) → `MessageFreelancerModal` → store `createChatRoom` + `sendMessage` | `POST /api/chat/rooms` then `POST /api/chat/messages` | Real, participant-gated: `insertOne` into `chat_rooms` (dedup via `findOne`) then `insertOne` into `chat_messages`, room `updatedAt` bumped | `toast.success("Message sent!")`, then `router.push('/inbox?room=...')` | `catch` → `toast.error("Failed to send message", { description })` | **PASS** |
| TalentPool | **Invite** | `setShowInviteModal(true)` (`TalentPool.tsx:247`) → `InviteToBidModal` → direct `fetch` | `POST /api/invites` | Real: `insertOne` into `invites` `{clientId, freelancerId, jobId, status:"pending"}` + notification doc. Dup-check is read-then-write (`findOne` then `insertOne`, no unique index) — small race window on concurrent identical requests | `toast.success("Invite sent!")` | `catch` → `toast.error("Failed to send invite")` **with no description/detail passed** (unlike the other two modals) | **PASS** (minor: race window + terser error message — not user-visible bugs, just weaker guarantees) |
| TalentPool | **Hire** | gated by `canHire = isClient && geekScore>=500` (`TalentPool.tsx:101-102`); `setShowHireModal(true)` (254) → `DirectHireModal` → store `createDirectOffer` | `POST /api/jobs/direct-offer` | Real: `insertOne` into `jobs` (`type:"direct_offer"`, `offerStatus:"pending"`) + notification doc; backend independently re-checks `role==="freelancer"` and `geekScore>=500` (route.ts:31-34) | `toast.success("Direct offer sent!")` | `toast.error("Failed to send offer", { description: result.message })` | **PASS** |
| TalentPool | "View Profile" hint | Not a button — plain `<span>` shown to non-clients (`TalentPool.tsx:264-270`); click falls through to the card's own `onClick` | none | none | Navigates to profile (via card handler) | n/a | **PASS** (not a dead button, just non-interactive decoration) |
| TalentPool | Skill filter chips ("All" + per-skill) | `setActiveSkill(...)` (`TalentPool.tsx:379,394`) | none — local filtering via `useMemo` (330-341) | none | List re-filters instantly | n/a | **PASS** |
| TalentPool | Search / Sort controls | **Do not exist in this component.** Sorting is fixed (by matched-skill count, then GeekScore desc, `TalentPool.tsx:335-340`) | — | — | — | — | **N/A** — not a missing feature per se, just no user-facing search/sort in the Talent Pool widget specifically |
| profile/`[id]` | **Message** | `onClick={() => router.push("/inbox")}` (`profile/[id]/page.tsx:154`) | **none** | **none — no chat room or message is created** | Silently lands on generic `/inbox` with nothing pre-selected, no freelancer id passed | none (no failure path — it just does nothing meaningful) | **FAIL** — see finding below |
| profile/`[id]` | **Invite** | `setShowInvite(true)` (159-164) → `InviteToBidModal` | `POST /api/invites` | Same as TalentPool Invite (real, persisted) | Same as above | Same as above | **PASS** |
| profile/`[id]` | **Direct Hire** | gated by `(user.geekScore ?? 0) >= 500` (165); `setShowHire(true)` → `DirectHireModal` | `POST /api/jobs/direct-offer` | Same as TalentPool Hire (real, persisted, backend-reverified) | Same as above | Same as above | **PASS** |

---

## Finding: `/profile/[id]` "Message" button is a non-functional stub

**File:** `web/src/app/profile/[id]/page.tsx:153-157`

```tsx
<button
  onClick={() => router.push("/inbox")}
  className="btn-ghost text-sm px-4 py-2 flex items-center gap-1.5"
>
  <MessageSquare className="h-4 w-4" /> Message
</button>
```

This is a different code path from the identically-labeled "Message" button in
`TalentPool.tsx`, which correctly calls `createChatRoom` + `sendMessage` against the real,
persisted, participant-gated chat backend (`api/chat/rooms`, `api/chat/messages` —
both fully implemented and used elsewhere, e.g. auto-invoked on direct-offer acceptance
in `api/jobs/offer-response/route.ts:104-126`).

On the profile page, clicking "Message":
- Calls no API
- Creates no `chat_rooms` or `chat_messages` document
- Doesn't pass the freelancer's id as a query param or otherwise
- Just drops the client on their generic `/inbox` page with no context

A client viewing a freelancer's profile and clicking "Message" gets no chat started and
no indication anything went wrong — it looks like it should open a conversation with that
specific freelancer (matching the Talent Pool button's behavior) but doesn't.

**Fix (not yet applied — this is a report only):** wire this button to the same
`createChatRoom`/`sendMessage` flow used by `MessageFreelancerModal`, or at minimum open
`MessageFreelancerModal` directly (it's already a reusable component), consistent with
how Invite and Direct Hire are handled two lines below it on the same page.

---

## Minor notes (not bugs, working-but-worth-knowing)

1. **`POST /api/invites` duplicate-check race window** — the check for an existing
   invite (`findOne` then `insertOne`, `route.ts:76-102`) is not atomic. Two rapid
   duplicate requests could both pass the check and create two invite docs for the
   same client/freelancer/job. No unique index enforces this at the DB level.
2. **`PATCH /api/invites` accept/decline race** — uses a plain `updateOne` rather than
   `findOneAndUpdate` with a status guard (`route.ts:150-184`), unlike the equivalent
   direct-offer response flow (`api/jobs/offer-response/route.ts:48-54`), which *does*
   atomically claim via `findOneAndUpdate({_id, offerStatus:"pending"})`. Two concurrent
   accept/decline calls on the same invite could both succeed.
3. **`InviteToBidModal`'s catch block swallows error detail** — `toast.error("Failed to
   send invite")` with no `description`, unlike `DirectHireModal` and
   `MessageFreelancerModal` which both surface the specific failure reason. Not a bug,
   just a less informative error message for the user.

## Confirmed correct / not a bug

- GeekScore ≥ 500 gating for Hire is enforced **both** client-side (button visibility)
  and server-side (independent re-check in `api/jobs/direct-offer/route.ts:32-34`) —
  no bypass possible by calling the API directly.
- `ClientFeed.tsx` passes the full unfiltered `jobs`/`bids` arrays into `TalentPool`
  (not pre-filtered like `MyJobsSection` gets) — this is intentional, since `TalentPool`
  needs the client's own job skills for match-highlighting, not for filtering which
  freelancers are shown.
- No TODO/stub/console.log-only handlers exist anywhere in `TalentPool.tsx` or its three
  modals — the one real stub found is isolated to the profile page's Message button.
