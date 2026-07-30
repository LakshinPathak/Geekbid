# Subagents & Delegation Enforcement — Reference

Reference for how `/dev-cycle` uses subagents and how that delegation is now enforced and made verifiable. Records what exists, why, and how to check it.

---

## 1. The two subagents

`/dev-cycle` delegates specific steps to two custom agents (defined in `.cursor/agents/` and shipped in the plugin at `plugins/dev-cycle-workflow/agents/`):

| `subagent_type` | Steps | Model | Purpose |
|---|---|---|---|
| `dev-cycle-planner` | 0d, 3, 4 | `claude-sonnet-5-thinking-high` | PRD/`issue.md` drafting, `planning.md`, complexity rubric, decomposition (reasoning-heavy) |
| `dev-cycle-implementer` | 6, 7 | `composer-2.5-fast` | Apply approved plan, run tests (mechanical, high-frequency) |

The parent agent keeps ownership of the blocking gates (5, 8, 10), GitHub/versioning (2, 9, 11–13), and `.agent/progress.md` updates.

**Wiring verified:** each agent file's `name:` frontmatter matches the `subagent_type` the skill calls, both `.cursor/agents/` and plugin copies are identical, and both subagent types are registered/available in the environment.

---

## 2. Why enforcement was added

A `SKILL.md` is an instruction, not a hard control — nothing forces the parent agent to actually spawn the Task. Enforcement adds two things a skill alone can't:

1. **Context reinforcement** — the routing rule is in context on every turn, not only when the skill file happens to be read.
2. **Verifiability** — a durable, inspectable trail proving whether the planner/implementer actually ran, plus an automatic flag when a delegated step completed without them.

Both are **detection + nudge**, not a hard gate. A skipped delegation now produces a visible `WARN` and a follow-up rather than passing silently.

---

## 3. Enforcement layers

### 3.1 Always-applied routing rule

`.cursor/rules/dev-cycle-routing.mdc` (`alwaysApply: true`) — restates routing (`/dev-cycle`, `/resume-dev-cycle`, graphify, repomix) and the mandatory delegation table, so it is injected into every agent turn in the repo. Mirrored into `product-scaffold/.cursor/rules/` so adopting product repos get it too. (The plugin also ships an equivalent at `plugins/dev-cycle-workflow/rules/dev-cycle-routing.mdc`.)

### 3.2 Audit hook (observability)

`.cursor/hooks/dev-cycle-subagent-audit.sh`, registered in `.cursor/hooks.json` on `subagentStart` and `subagentStop`, matched to `dev-cycle-planner|dev-cycle-implementer`.

- Appends one tab-separated line per event to `.agent/subagent-audit.log`.
- Extracts the subagent name defensively (multiple JSON field names + raw-payload fallback).
- Tags each line with the current `{version}` (parsed from `# Progress — {version}` in `.agent/progress.md`).

**Log format:**

```
<timestamp>	<event>	<subagent>	<version>
2026-07-14T18:29:01Z	subagentStart	dev-cycle-planner	issue_0.0.7
```

### 3.3 Delegation check (verification / nudge)

`.cursor/hooks/dev-cycle-delegation-check.sh`, registered on `stop` with `loop_limit: 1`.

On each turn end it compares `.agent/progress.md` against the audit log:

| Step marked ✅ in progress.md | Expected spawn | If missing |
|---|---|---|
| 3 or 4 | `dev-cycle-planner` | flag |
| 6 or 7 | `dev-cycle-implementer` | flag |

On a fresh violation it writes a `WARN` line to the audit log and returns a one-time `followup_message`. De-duped per `(version, role)` via `.agent/.subagent-audit.warned`; bounded by `loop_limit: 1` so it can never loop.

- Status parsing is sliced to the `## Status` … `## Current Step` region so sub-issue numbers can't false-trigger.
- Version-scoped: a spawn logged for a previous version won't satisfy the current cycle's check.
- Escape hatch: the message states that if subagents were genuinely unavailable and the parent ran the step (the skill's sanctioned fallback), the flag can be disregarded.

---

## 4. How to verify delegation after a cycle

```bash
grep dev-cycle-planner .agent/subagent-audit.log      # Steps 0d/3/4 were delegated
grep dev-cycle-implementer .agent/subagent-audit.log  # Steps 6/7 were delegated
grep WARN .agent/subagent-audit.log                   # any step completed without delegation
```

---

## 5. SKILL.md gate edits (related change)

Two edits to `dev-cycle` `SKILL.md` (both `.cursor/skills/dev-cycle/` and the plugin copy) hardened the plan-approval gate so a developer-provided PRD is never mistaken for approval of a specific plan:

- **Step 3** — a warning after the `planning.md` save line: deriving `planning.md` from a provided `prd.md`/`issue.md` does not substitute for human review; go to Step 5 regardless.
- **Step 5** — the blocking-gate line now states the hard stop applies unconditionally, including when `planning.md` was built from a PRD/`issue.md` the developer wrote in Step 0d; there is no path from Step 3/4 to Step 6 that bypasses this gate.

---

## 6. File inventory

| Path | Role |
|---|---|
| `.cursor/agents/dev-cycle-planner.md` | Planner agent (model + scope) |
| `.cursor/agents/dev-cycle-implementer.md` | Implementer agent (model + scope) |
| `.cursor/rules/dev-cycle-routing.mdc` | Always-applied routing + delegation rule |
| `.cursor/hooks.json` | Registers the two hooks (`subagentStart`/`subagentStop`, `stop`) |
| `.cursor/hooks/dev-cycle-subagent-audit.sh` | Logs planner/implementer spawns |
| `.cursor/hooks/dev-cycle-delegation-check.sh` | Flags delegated steps done without a spawn |
| `.agent/subagent-audit.log` | Runtime trail (gitignored) |
| `.agent/.subagent-audit.warned` | De-dupe marker for the stop check (gitignored) |
| `product-scaffold/.cursor/**` | Same rule + hooks for adopting product repos |
| `plugins/dev-cycle-workflow/agents/**`, `.../rules/**` | Marketplace copies of agents + routing rule |
| `.cursor/skills/dev-cycle/SKILL.md` | Steps 3 & 5 gate edits + subagent routing table |

---

## 7. Behavior and limits

- **Fail-open:** both hooks return valid JSON and exit 0 on any error — they never block real work.
- **Not a hard gate:** a `stop` hook cannot retroactively force a Task call; it detects and nudges. The always-applied rule reduces the chance of a skip; the audit log + `WARN` make any skip visible.
- **Payload field names** for `subagentStart`/`stop` are handled defensively (field-name variants + raw-text fallback), but a real in-Cursor run is the definitive confirmation that the events fire as expected in your version.
- **Team-wide reinforcement:** the enforced dashboard Team Rule (see the team setup docs) is the companion lever, since hooks live per-repo.
