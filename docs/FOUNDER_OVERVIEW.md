# How We Build with Cursor

This note explains the full development process we will use with Cursor: what problem it solves, how work flows from idea to release, how the team receives the same tools, and what engineers and administrators do in practice. **Lakshin** owns platform administration and the shared plugin; every engineer follows the same cycle in product repositories.

| Reference | Value |
|---|---|
| Plugin repository | https://github.com/get-viti/dev-cycle-cursor-setup |
| Plugin | `dev-cycle-workflow` |
| Team Marketplace | `get-viti-dev-cycle-cursor-setup` |
| Install mode | **Required** for all Cursor Teams members |
| Platform administration | Lakshin |

---

## The problem we are solving

AI coding is powerful, but without a shared process it becomes ad hoc: different people prompt differently, plans are skipped, reviews are inconsistent, and GitHub issues, branches, and releases drift apart.

We want one standard:

- Every new feature or bug goes through the same gates  
- Humans approve the plan and the tests before we ship  
- GitHub issue, branch, and release share one version name  
- The whole team uses the same Cursor skills automatically  

That standard is the **Development Cycle**, distributed as a Cursor **Team Marketplace** plugin so nobody has to manually copy skill folders into every product repository.

---

## The big picture (flow)

```
Idea / bug report
       │
       ▼
 Lakshin (admin) keeps the shared Cursor plugin
 up to date for the whole team (Required install)
       │
       ▼
 Engineer opens product repo in Cursor
       │
       ├── New work ──────────►  /dev-cycle
       │                              │
       └── Unfinished work ───►  /resume-dev-cycle
                                      │
                                      ▼
                         Understand the codebase
                    (graphify for structure; repomix
                     when a full pack is needed)
                                      │
                                      ▼
                         Plan → human approval
                                      │
                                      ▼
                         Implement + test
                         (implementer subagent)
                                      │
                                      ▼
                         Dev approves results
                                      │
                                      ▼
                         PR → named reviewer → merge
                                      │
                                      ▼
                         Release + docs + close issue
                         + append CHANGELOG_INDEX.md
                                      │
                                      ▼
                         Refresh graphify against the
                         shipped code (Step 13b) so the
                         next cycle inherits real memory
```

In short: **same entry commands, same steps, same review gates, same GitHub trail.**

---

## What “Development Cycle” means

We use **one workflow** with two flavors:

| If the work is… | We call it… | We start from… |
|---|---|---|
| A new capability / feature | **Epic** | A PRD (existing or written with the AI) |
| A bug or fix | **Issue** | Reproduction steps / issue write-up |

Everything for that piece of work uses **one version tag**, for example `epic_0.0.4` or `issue_0.0.8`. That same string names:

- The inbox and release folders  
- The git branch  
- The GitHub issue title prefix  

So you can always answer: “Which issue, branch, and release belong together?”

### How a cycle runs (end to end)

1. **Start** — Team member types `/dev-cycle` (new) or `/resume-dev-cycle` (continue).
2. **Intake** — For new work: epic vs. issue, where the code lives, docs, credentials — written into **`planning.md`** (the one intake+plan document). The epic-vs-issue-vs-enhancement call is grounded in the actual code, not guessed: the graphify graph (structure), a mandatory `repomix-output.xml` (whole-file certainty), and `CHANGELOG_INDEX.md` (what already shipped) together decide whether the ask is genuinely new, an enhancement of an existing feature, or a regression. Resume skips re-asking what we already know.
3. **Gate — minimum information** — Before anything is created, both halves must be in place:
   - **Codebase context** — both are required: the graphify graph and a current `repomix-output.xml`. This is hard-required, not skippable as "trivial." For any existing/legacy codebase, indexing is mandatory (whether it was moved under `legacy_codebase/` or left in place) — the only no-index case is a brand-new empty `codebase/`.
   - **Instruction context** — `planning.md`'s intake section, validated for required fields — not just "the file exists."
4. **Version + GitHub** — Create the next version, save `planning.md`, open a detailed GitHub issue, cut a branch with the same name (after syncing with existing GitHub tags so we don't collide).
5. **Plan** — Append the plan into the same `planning.md`, using the codebase graph and the repomix pack for full-file context. Decide Simple vs. Complex; complex work can split into **GitHub sub-issues for tracking**, but all code stays on the **single parent branch** (one PR — no per-sub-task branches). Also scaffold **`qa.md`** here with the user stories and test cases that will prove the work — the single place those live (never duplicated into `planning.md`).
6. **Gate — plan approval** — A human must explicitly approve `planning.md` and the `qa.md` skeleton before coding.
7. **Build & test** — Apply the change; run the test cases and record PASS/FAIL directly in `qa.md`.
8. **CodeRabbit review (Step 7b)** — After tests pass, the parent agent runs an independent CodeRabbit CLI review on the workspace diff (`code-review` skill), then **pauses and asks the developer to check the results**. Fixes are applied **only if the developer says yes** (or names specific findings); if they say skip / go ahead, findings are logged and the cycle continues without auto-fixing. Soft-skips if the CLI isn't installed or authenticated. This is the automated second opinion between self-tested code and the human approval gate.
9. **Gate — code/test approval** — A human must explicitly approve before the PR — seeing the CodeRabbit summary, and re-running critical-path tests rather than only reading results. If a requirement itself changes at this gate (not just an implementation detail), it's edited into `planning.md`'s intake section first, and the affected `qa.md` rows are regenerated to match — never approved out of sync.
10. **Pull request** — Open PR to `staging`, assign the named reviewer from config. Optional: if CodeRabbit leaves PR review threads, address them via the `autofix` skill (per-finding approval).
11. **Gate — merge** — Reviewer approves; merge (and promote to `main` when agreed).
12. **Release & close** — GitHub release, QA/release notes, close the issue (and milestone if done); append this cycle to `releases/CHANGELOG_INDEX.md`.
13. **Refresh & remember** — Update the graphify graph and re-pack `repomix-output.xml` against the merged code, and record any durable lesson — so the next cycle starts from what actually shipped, not a mid-development snapshot.

Progress is written to `.agent/progress.md` so a later session can resume without starting over.

### How AI work is split

| Role | When | Job |
|---|---|---|
| **Main chat agent** | Whole cycle | Runs the process, asks humans at gates, talks to GitHub, runs **CodeRabbit Step 7b** |
| **Planner subagent** (`dev-cycle-planner`) | Planning-heavy steps | `planning.md` Part A (intake) + Part B (plan), `qa.md` skeleton, complexity, sub-tasks |
| **Implementer subagent** (`dev-cycle-implementer`) | Coding & testing | Apply the approved plan and run tests (fills `qa.md` results) |
| **CodeRabbit** (CLI + `code-review` / `autofix` skills) | After build & test; optionally on the open PR | Independent AI review of the diff before human code approval; optional PR-thread fixes |

The main agent is expected to **delegate** planner/implementer steps to the right subagent, not silently skip model routing. CodeRabbit is run by the **parent** (not the implementer) so review stays independent of the code author.

> **No independent tester today.** The implementer subagent tests the code it just wrote — there is no separate tester role. The compensating control is the human code/test gate, where the developer **re-runs the critical-path test cases** (not just reads the report) before approving. Whether to add a dedicated `dev-cycle-tester` subagent for genuine separation of duties is an open product decision (see the dev-cycle skill's "Roles & Swimlanes").

### Supporting tools inside the cycle

| Tool | What it is for |
|---|---|
| **graphify** (`/graphify`) | Map the codebase (symbols, call paths, impact). Prefer this over reading hundreds of files. |
| **repomix** (`/repomix`) | Pack the workspace into `repomix-output.xml` when a broad snapshot is needed. |
| **CodeRabbit** (`code-review` / `autofix` skills + CLI) | Independent AI review of the diff at Step 7b (before human code approval); optional PR-thread autofix after the PR opens. |
| **GitHub (MCP + token)** | Issues, branches, PRs. Each person uses **their own** credentials. |

### Capabilities delivered by the Required plugin

| Component | Identifier |
|---|---|
| Skills | `/dev-cycle`, `/resume-dev-cycle`, `/repomix`, `/graphify` |
| Subagents | `dev-cycle-planner`, `dev-cycle-implementer` |
| Rule | `dev-cycle-routing` |

---

## Platform administration (Lakshin)

Lakshin maintains the shared package and Cursor team settings so every engineer sees the same skills without installing folders by hand.

### Already in place

1. Built the plugin package (`dev-cycle-workflow`: skills, agents, routing rule, MCP metadata).  
2. Published it from https://github.com/get-viti/dev-cycle-cursor-setup  
3. Imported it as a **Team Marketplace** in the Cursor Dashboard.  
4. Set marketplace access for **all members**.  
5. Turned **Auto Refresh** on (updates follow pushes to the plugin repo).  
6. Set install mode to **Required** — auto-installs for everyone; cannot be removed casually.  

### Recommended follow-through

**Enforce a Team Rule** at [Team Rules](https://cursor.com/dashboard?tab=team-content): enable the rule, turn on **Enforce this rule**, title `Development Cycle routing`, body:

```
New epic/feature or issue/bug → invoke /dev-cycle. Do not freehand a full feature/fix outside that cycle.

Resume unfinished work (.agent/progress.md exists, or developer says resume/continue/pick up where we left off) → invoke /resume-dev-cycle. Do not re-run Step 0 intake.

Structure / blast radius → use graphify (/graphify {WORKSPACE}, query/explain/path, reflect on resume) as in the //dev-cycle skill.

Full-repo LLM pack (MANDATORY context, not just a fallback) → /repomix → {WORKSPACE}/repomix-output.xml, generated at Step 0c alongside the graphify graph and refreshed on meaningful change. Both the graph and repomix-output.xml are read to classify new-epic vs enhancement vs new-issue (Step 0b/0c) and for Step 3 planning (do not dump huge XML into chat).

Parent agent must Task-spawn //dev-cycle-planner (Steps 0d, 3, 4) and //dev-cycle-implementer (Steps 6, 7).

Product repos stay thin: .agent/.env from .env.example + short AGENTS pointer; skills come from the team plugin, not copy-paste.
```

**Team GitHub MCP:** Dashboard → Integrations & MCP → Team MCP Servers — make GitHub available for Cloud Agents and IDE users; each engineer authenticates with their own credentials.

**Maintenance:** push skill updates to `main`; rely on Auto Refresh (or Refresh in the marketplace); never commit secrets or `.agent/.env`.

---

## What every engineer does

### Prerequisites

1. Cursor Teams seat on the same organization  
2. GitHub access to the product repositories  
3. A personal GitHub access token  
4. Current Cursor desktop client  

Optional local tools: `curl`, `jq`, `repomix` (`npm install -g repomix`), `graphify` when not provided as a Skill.

### Confirm the plugin

1. Sign in with the team account.  
2. Customize → confirm plugin **`dev-cycle-workflow`** (Required).  
3. Confirm skills: `dev-cycle`, `resume-dev-cycle`, `repomix`, `graphify`.  
4. Confirm subagents: `dev-cycle-planner`, `dev-cycle-implementer`.  
5. Confirm slash commands: `/dev-cycle`, `/resume-dev-cycle`, `/repomix`.  

### Connect GitHub

Authenticate GitHub MCP as yourself; verify with `get_me`. Store a personal token in local `.agent/.env` as `git_token=` — never share or commit it.

### Thin product repository setup

Work in the **product** codebase. Add only `product-scaffold/` from the plugin repository:

```text
your-product-repo/
├── AGENTS.md
└── .agent/
    └── .env.example
```

```bash
cd /path/to/your-product-repo
mkdir -p .agent
curl -fsSL \
  https://raw.githubusercontent.com/get-viti/dev-cycle-cursor-setup/main/product-scaffold/AGENTS.md \
  -o AGENTS.md
curl -fsSL \
  https://raw.githubusercontent.com/get-viti/dev-cycle-cursor-setup/main/product-scaffold/.agent/.env.example \
  -o .agent/.env.example
cp .agent/.env.example .agent/.env
```

Fill `.agent/.env` (lowercase keys):

| Key | Purpose |
|---|---|
| `git_token` | Individual GitHub personal access token |
| `github_org` | Owner of the product repository |
| `github_repo` | Product repository name |
| `gcp_project` | Only if GCP is used; otherwise blank |
| `openai_api_key` | Required for graphify indexing (Step 3 / Step 13b hard gate); blank only if graphify is a native Skill with its own key |
| `reviewer_handle` | Reviewer’s GitHub username |
| `reviewer_name` | Reviewer display name |

Ignore `.agent/.env` in git. Do not copy `plugins/dev-cycle-workflow/` into product apps.

### Day-to-day commands

| Intent | Command |
|---|---|
| Start a feature or bug | `/dev-cycle` |
| Continue mid-cycle work | `/resume-dev-cycle` |
| Pack the codebase | `/repomix` |
| Explore structure / impact | `/graphify` |

```
Open product repo
       │
       ▼
Is there unfinished work in .agent/progress.md?
       │
       ├── Yes → /resume-dev-cycle
       └── No  → /dev-cycle
       │
       ▼
Approve plan and tests when asked → reviewer approves PR → merge → release
```

### Human gates (required)

| Gate | Expectation |
|---|---|
| Plan review | Explicit approval before coding |
| Code and test review | Explicit approval before the PR |
| Pull request merge | Named reviewer approval |
| Issue closure / promote to main | Confirm when asked |

### First-day verification

- [ ] Team account signed in; plugin Required  
- [ ] Skills and subagents present  
- [ ] GitHub `get_me` returns your username  
- [ ] Product repo has `AGENTS.md` and local `.agent/.env` (gitignored)  
- [ ] `/dev-cycle` works in chat  

---

## What “done” looks like

A completed cycle leaves behind:

- A GitHub issue that describes the epic or bug properly  
- A branch and PR tied to the same version tag  
- Human-approved plan and tests  
- A merge path through staging (and main when approved)  
- Release notes / QA artifacts under that version (`planning.md`, `qa.md`, `release.md`)  
- A closed issue (and milestone if that was the last item)  
- A one-line entry in `releases/CHANGELOG_INDEX.md`  
- A graphify graph re-indexed to the shipped code, ready for the next cycle  

---

## Guardrails and security

1. Multi-file features and real bugs go through the cycle — not freehand chat-only changes.  
2. Humans approve **plans** and **code/tests** before shipping.  
3. PRs have a named reviewer.  
4. Version tags sync with GitHub so names are not reused.  
5. Secrets stay on the machine (`.agent/.env`); the shared plugin never carries a team-wide personal token.  
6. Prefer graphify for precision; use repomix when a full dump helps — do not paste huge packs into every chat.  
7. Each engineer uses individual credentials; revoke exposed tokens the same day.  

---

## Roles

| Role | Owner | Responsibilities |
|---|---|---|
| Platform administration | Lakshin | Plugin repository, Required marketplace, Auto Refresh, Team Rule, Team MCP |
| Product engineer | Each teammate | Individual credentials and `.agent/.env`; `/dev-cycle` / `/resume-dev-cycle`; review gates |
| Pull request reviewer | Named in `reviewer_handle` | Approve before merge |

---

## Repository assets

| Path | Contents |
|---|---|
| https://github.com/get-viti/dev-cycle-cursor-setup | Plugin source |
| `plugins/dev-cycle-workflow/` | Plugin payload (skills, agents, rules) |
| `product-scaffold/` | Thin files for product repositories |
| `.cursor-plugin/marketplace.json` | Marketplace index |

---

## Bottom line

We are standardizing Cursor around one cycle:

**Lakshin** keeps the Team Marketplace plugin (**Required**) current for the whole organization.  
**Engineers** start with `/dev-cycle`, resume with `/resume-dev-cycle`, use graphify and repomix as prescribed, and ship through GitHub with shared version names and human gates.

That is the methodology we will use in Cursor.
