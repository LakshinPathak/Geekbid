# Team Marketplace Setup & Teammate Onboarding

This document describes the Cursor Development Cycle end to end: why it exists, how Team Marketplace delivers it, what Lakshin configures as admin, and what every engineer completes on their workstation and product repositories. It is complete on its own.

| | |
|---|---|
| **Plugin repo** | https://github.com/get-viti/dev-cycle-cursor-setup |
| **Plugin name** | `dev-cycle-workflow` |
| **Team Marketplace** | `get-viti-dev-cycle-cursor-setup` |
| **Admin** | Lakshin |
| **Install mode** | **Required** (auto-install for all team members) |

---

# Part 0 — Why this exists

Without a shared process, AI-assisted development becomes inconsistent: divergent prompts, skipped plans and reviews, and mismatched GitHub issues, branches, and releases.

The **Development Cycle** standardizes:

1. Features (**epics**) and bugs (**issues**) on one path from intake to release  
2. Human approval at plan and code/test gates  
3. One version name shared by issue, branch, and release artifacts  
4. The same Cursor skills for everyone via **Required** Team Marketplace install  

Engineers work in **product** repositories. Skills arrive from the plugin. Each person keeps a private `.agent/.env` and uses `/dev-cycle` or `/resume-dev-cycle`.

```
Idea / bug report
       │
       ▼
 Lakshin keeps Required plugin current
       │
       ▼
 Engineer opens product repo
       ├── New work → /dev-cycle
       └── Resume → /resume-dev-cycle
       │
       ▼
 Understand code (graphify; repomix if needed)
       │
       ▼
 Plan → human approval → implement + test → human approval
       │
       ▼
 PR → named reviewer → merge → release → close issue
```

| Intent | Command |
|---|---|
| New epic or issue | `/dev-cycle` |
| Continue unfinished work | `/resume-dev-cycle` |
| Repository pack | `/repomix` |
| Structure / impact | `/graphify` |

---

# Part 1 — Admin (Lakshin)

## 1.1 What this marketplace contains

The GitHub repo is structured as a Team Marketplace source:

| Path | What it is |
|---|---|
| `.cursor-plugin/marketplace.json` | Marketplace index |
| `plugins/dev-cycle-workflow/` | The plugin teammates receive |
| `plugins/.../skills/` | `/dev-cycle`, `/resume-dev-cycle`, `/repomix`, `/graphify`, `code-review`, `autofix` |
| `plugins/.../agents/` | `dev-cycle-planner`, `dev-cycle-implementer` |
| `plugins/.../rules/` | Routing rule (always apply inside plugin) |
| `plugins/.../mcp.json` | GitHub MCP metadata (`GITHUB_PERSONAL_ACCESS_TOKEN`) |
| `product-scaffold/` | Thin files for **product** repos only |

Teammates should **not** clone this plugin repo into every product app. They get skills via **Required** plugin install.

## 1.2 Admin checklist — already done

| Step | Detail | Status |
|---|---|---|
| Publish plugin package | Pushed to `get-viti/dev-cycle-cursor-setup` on `main` | Done |
| Import marketplace | Dashboard → Plugins → Import from Repo | Done |
| Access | All Members | Done |
| Auto Refresh | ON | Done |
| Install mode | **Required** for `dev-cycle-workflow` | Done |

## 1.3 Admin checklist — still recommended

### A. Enforce Team Rule

1. Open [Cursor Dashboard → Team content / Team Rules](https://cursor.com/dashboard?tab=team-content)  
2. Create a new Team Rule  
3. Enable it  
4. Turn on **Enforce this rule** (members cannot turn it off)  
5. Title: `Development Cycle routing`  
6. Body — paste exactly:

```
New epic/feature or issue/bug → invoke /dev-cycle. Do not freehand a full feature/fix outside that cycle.

Resume unfinished work (.agent/progress.md exists, or developer says resume/continue/pick up where we left off) → invoke /resume-dev-cycle. Do not re-run Step 0 intake.

Structure / blast radius → use graphify (/graphify {WORKSPACE}, query/explain/path, reflect on resume) as in the //dev-cycle skill.

Full-repo LLM pack (MANDATORY) → /repomix FIRST at Step 0c → {WORKSPACE}/repomix-output.xml, then graphify index. Order: new vs legacy (0b) → (legacy: confirm github_org/github_repo from .agent/.env + scan issues) → pack → index → PRD/TYPE (0d). Use graphify + scoped XML for token-optimized classification and Step 3 planning (do not dump huge XML into chat).

Parent agent must Task-spawn //dev-cycle-planner (Steps 0d, 3, 4) and //dev-cycle-implementer (Steps 6, 7).

Product repos stay thin: .agent/.env from .env.example + short AGENTS pointer; skills come from the team plugin, not copy-paste.
```

### B. Team GitHub MCP

1. Dashboard → **Integrations & MCP** → Team MCP Servers  
2. Ensure GitHub is available for **Cloud Agents**  
3. Use **Add to Team Marketplace** so IDE users can install from Customize  
4. Tell teammates: authenticate with **their own** PAT/OAuth — never a shared personal token in git  

### C. Keep plugin fresh

- After changing skills/agents: commit + `git push` to `main`  
- With Auto Refresh ON, marketplace re-indexes (allow a few minutes; or click **Refresh**)  
- Install Cursor GitHub App on `get-viti/dev-cycle-cursor-setup` if Auto Refresh does not pick up pushes  
- Never commit `.agent/.env` or real tokens  

### D. What admin does **not** need teammates to do

- Copy `.cursor/skills` by hand  
- Clone the plugin repo as their daily app  
- Share Lakshin’s `git_token`  

---

# Part 2 — What every teammate needs to do (detailed)

Part 2 is the engineer onboarding section. Direct questions about team access or missing plugins to **Lakshin**.

---

## 2.1 Before you start (prerequisites)

You need:

1. An invite / seat on the same **Cursor Teams** organization as Lakshin  
2. Access to the **product GitHub repo(s)** you will work on (not only the plugin repo)  
3. Ability to create a **GitHub Personal Access Token** for yourself  
4. Cursor desktop installed and updated  

Optional but recommended on your machine (Ubuntu/macOS):

```bash
# Check tools
command -v curl && curl --version | head -1
command -v jq && jq --version
command -v repomix || echo "repomix missing"
command -v graphify || echo "graphify missing — Skill may still work in Cursor"
```

Install **repomix** if missing ([docs](https://github.com/yamadashy/repomix)):

```bash
npm install -g repomix
# or: yarn global add repomix
# or: bun add -g repomix
# or: brew install repomix
```

Install **CodeRabbit CLI** if missing (skills `code-review` and `autofix` ship via the Required plugin; the CLI is still per-machine):

```bash
# macOS/Linux — prefer a package manager
brew install coderabbit
# or see https://www.coderabbit.ai/cli

coderabbit auth login
```

Then from any project folder:

```bash
repomix
# creates repomix-output.xml
```

---

## 2.2 First login — confirm the team plugin is on you

Because install mode is **Required**, you should **not** need to search-and-install the plugin manually. Still verify:

### Step-by-step

1. Open **Cursor**.  
2. Sign in with your **team** account (same org as Lakshin).  
3. Open **Customize** (sidebar) **or** Settings → **Rules, Skills, Subagents / Plugins**.  
4. Look for plugin: **`dev-cycle-workflow`**.  
   - It should show as installed / Required.  
   - If missing: reload window (`Developer: Reload Window`), wait a few minutes for sync, then ask Lakshin to confirm your seat is on the same team and marketplace access is All Members.  
5. Open **Skills** list and confirm you see at least:
   - `dev-cycle`  
   - `resume-dev-cycle`  
   - `repomix`  
   - `graphify`  
   - `code-review`  
   - `autofix`  
6. Open **Subagents** and confirm you see:
   - `dev-cycle-planner`  
   - `dev-cycle-implementer`  
7. If anything is missing after reload, contact Lakshin. Do **not** copy skill folders from another machine as a workaround unless he instructs you to.

### What success looks like

You can type in chat:

- `/dev-cycle`  
- `/resume-dev-cycle`  
- `/repomix`  

…and Cursor recognizes them as skills.

---

## 2.3 Connect GitHub (your own credentials)

You need GitHub access so the agent can create issues/branches/PRs, and so scripts can run for milestones/releases.

### A. GitHub MCP in Cursor (IDE)

1. Open **Customize** → **MCP** (or Integrations, depending on your Cursor version).  
2. Install or enable the **GitHub** server from the **team marketplace** or **official GitHub** plugin if your team linked it.  
3. Authenticate with **your** GitHub account (OAuth or PAT when prompted).  
4. In chat, ask:  
   > Call GitHub `get_me`  
   You should see **your** login, not someone else’s.

### B. Create your own Personal Access Token (for `.agent/.env`)

1. GitHub → Settings → Developer settings → Personal access tokens.  
2. Create a token with scopes sufficient for the product repos (typically `repo` and whatever your org requires for issues/PRs/releases).  
3. Copy it **once** into your local `.agent/.env` as `git_token=` (next section).  
4. **Never**:
   - commit the token  
   - paste it into chat tools or tickets  
   - reuse Lakshin’s or a teammate’s token  

### C. Optional environment variable for MCP

If your GitHub MCP config expects an env var:

```bash
# example — put in ~/.bashrc only if your team uses this pattern
export GITHUB_PERSONAL_ACCESS_TOKEN="your_token_here"
```

Prefer Cursor’s secure prompt / per-user MCP auth when available.

---

## 2.4 Prepare each **product** repository (thin setup)

This is for the **app you will change** (e.g. a product codebase), **not** the plugin repo.

### What you copy (only this)

From https://github.com/get-viti/dev-cycle-cursor-setup → folder **`product-scaffold/`**:

```text
your-product-repo/
├── AGENTS.md
└── .agent/
    └── .env.example
```

How:

```bash
cd /path/to/your-product-repo

# if scaffold not already present — copy from the plugin repo
mkdir -p .agent
curl -fsSL \
  https://raw.githubusercontent.com/get-viti/dev-cycle-cursor-setup/main/product-scaffold/AGENTS.md \
  -o AGENTS.md
curl -fsSL \
  https://raw.githubusercontent.com/get-viti/dev-cycle-cursor-setup/main/product-scaffold/.agent/.env.example \
  -o .agent/.env.example
```

Or clone the plugin repo once and copy the folder:

```bash
cp -r /path/to/dev-cycle-cursor-setup/product-scaffold/AGENTS.md ./AGENTS.md
mkdir -p .agent
cp /path/to/dev-cycle-cursor-setup/product-scaffold/.agent/.env.example .agent/.env.example
```

### Create your private env file

```bash
cp .agent/.env.example .agent/.env
```

Edit `.agent/.env` (keys are **lowercase**):

| Key | Required? | What to put |
|---|---|---|
| `git_token` | **Yes** for full cycle | Your GitHub PAT |
| `github_org` | **Yes** | Owner org/user of the **product** repo (e.g. `get-viti`) |
| `github_repo` | **Yes** | Product repo name (not the plugin repo name) |
| `gcp_project` | Only if GCP is used | Cloud project id, or leave blank |
| `reviewer_handle` | **Yes** for PR step | Reviewer’s GitHub username (e.g. `lakshin-tatvic`) |
| `reviewer_name` | Recommended | Display name (e.g. `Lakshin`) |

Example structure (replace with your real values):

```bash
git_token=<your_github_pat>
github_org=<product_org_or_user>
github_repo=<product_repo_name>
gcp_project=
reviewer_handle=<github_username>
reviewer_name=<display_name>
```

### Gitignore (critical)

Ensure `.agent/.env` is ignored:

```bash
grep -q '.agent/.env' .gitignore 2>/dev/null || echo '.agent/.env' >> .gitignore
```

Confirm it is **not** staged:

```bash
git status
# .agent/.env must NOT appear as a new file to commit
```

### What you must NOT do

- Do **not** copy `plugins/dev-cycle-workflow/` into the product repo  
- Do **not** copy the whole `.cursor/skills` tree from the plugin (Required plugin already gives you skills)  
- Do **not** commit `.agent/.env`  

### Optional: local scripts for milestones/releases

If `/dev-cycle` or Lakshin asks you to scaffold `.agent/skills` / `.agent/templates` for git-ops scripts, follow the agent’s instructions (they ship with the skill). First-time product setup may create those automatically when you run the cycle.

---

## 2.5 Day-to-day workflow (what to type)

Open the **product** repo in Cursor (File → Open Folder).

### New work

1. In chat, type: **`/dev-cycle`**  
2. Answer questions clearly:
   - Continuing or **new**? → **new**  
   - Epic or **issue**?  
   - Where is the codebase? (path on disk / folder name)  
   - Any existing docs or GitHub issue #?  
   - Reproduce steps / expected vs actual (for bugs)  
3. When the agent presents a plan → read it → say **go ahead** only if you agree.  
4. When tests are presented → review → say **go ahead** / **ship it** only if you agree.  
5. When a PR is opened → ask the named reviewer to review on GitHub.  
6. Do **not** tell the agent to merge until the reviewer approved.

### Resume unfinished work

1. Confirm `.agent/progress.md` exists under the product project.  
2. Type: **`/resume-dev-cycle`**  
3. Agent should say something like: *Resuming issue_x.y.z at Step N…*  
4. Continue from that step — it should **not** re-ask tech stack / type / credentials.  
5. If it says there is nothing to resume → use `/dev-cycle` as new work.

### Helpful related commands

| Goal | Command |
|---|---|
| Pack whole repo for context | `/repomix` |
| Structure / “what calls what” | `/graphify` (or let //dev-cycle call it) |

---

## 2.6 Gates you must respect (do not skip)

The cycle will pause and wait for you (or the reviewer). Typical pauses:

| Gate | You must… |
|---|---|
| Plan review (Step 5) | Explicitly approve (“go ahead” / “approved”) |
| Code + test review (Step 8) | Explicitly approve before PR |
| PR merge (Step 10) | Named reviewer approves on GitHub / in chat |
| Close issue / promote main | Confirm when asked |

Approving without reviewing the plan or test results bypasses the quality gates defined for this process.

---

## 2.7 Smoke test (do this once after setup)

Work through this checklist and tick it off:

- [ ] Cursor signed in with team account  
- [ ] Plugin `dev-cycle-workflow` visible / Required  
- [ ] Skills: `dev-cycle`, `resume-dev-cycle`, `repomix`, `graphify`, `code-review`, `autofix`  
- [ ] Subagents: `dev-cycle-planner`, `dev-cycle-implementer`  
- [ ] GitHub `get_me` returns **your** username  
- [ ] Product repo has `AGENTS.md` + `.agent/.env` (local only)  
- [ ] `.agent/.env` is gitignored  
- [ ] Chat `/dev-cycle` starts intake (does not error on unknown command)  
- [ ] `repomix --version` works **or** `/repomix` skill runs  

If any check fails, stop and contact Lakshin with a screenshot of Customize → Skills / MCP.

---

## 2.8 Common teammate problems

| Symptom | What to do |
|---|---|
| `/dev-cycle` not found | Reload window; confirm Required plugin; confirm team seat |
| Skills list empty | Customize → wait for sync; ask Lakshin if marketplace access is All Members |
| GitHub tools missing / auth error | Re-auth GitHub MCP; check your PAT scopes |
| `get_me` shows wrong user | You’re using someone else’s token — replace with yours |
| Resume says nothing to resume | No `.agent/progress.md` yet — that’s normal; start with `/dev-cycle` |
| Agent asks for credentials you already set | Confirm you’re in the product folder that contains `.agent/.env` |
| Accidentally committed `.env` | Rotate the PAT immediately; remove from git history with Lakshin’s help |
| Version / branch already exists | Normal on busy repos — cycle should sync/bump; don’t invent version names by hand |
| Want to “just fix a typo” | Still prefer `/dev-cycle` as **issue** unless Lakshin agreed a tiny exception |

---

## 2.9 Security rules for teammates

1. Your PAT is yours alone.  
2. Never commit `.agent/.env`.  
3. Never paste tokens into public issues or untrusted chats.  
4. Prefer least-privilege tokens for the product org.  
5. If a token leaked, revoke it in GitHub and create a new one the same day.

---

## 2.10 What success looks like after a cycle

For a finished epic/issue you should see:

- GitHub issue with a real description (not a one-liner)  
- Branch named like `issue_0.0.x` / `epic_0.0.x`  
- PR reviewed by the named reviewer  
- Release / QA notes under that version (when the cycle completes)  
- Issue closed  
- `.agent/progress.md` showing Step 13 complete (or archived before the next item)

---

# Part 3 — Roles (who does what)

| Role | Who | Responsibilities |
|---|---|---|
| **Admin** | Lakshin | Plugin repo, marketplace Required mode, Auto Refresh, Team Rule, Team MCP, answering setup questions |
| **Engineer** | Every teammate | Own `.env` + own GitHub auth; run `/dev-cycle` / `/resume-dev-cycle`; respect gates |
| **PR reviewer** | Named in `reviewer_handle` | Approve/request changes on PRs before merge |

---

# Part 4 — Distribution summaries

### Engineer setup summary

```
Cursor Development Cycle — engineer setup
1) Cursor Teams seat → Customize → confirm plugin "dev-cycle-workflow" (Required)
2) Skills: /dev-cycle, /resume-dev-cycle, /repomix, /graphify, code-review, autofix  |  Subagents: planner + implementer
3) Connect GitHub MCP with your own token; verify with get_me
4) In the product repo: add product-scaffold (AGENTS.md + .agent/.env.example)
5) cp .agent/.env.example .agent/.env → fill git_token, github_org, github_repo, reviewer_*
6) Do not commit .agent/.env
7) New work: /dev-cycle   |   Resume: /resume-dev-cycle
Plugin repository: https://github.com/get-viti/dev-cycle-cursor-setup
Admin contact: Lakshin
```

### Admin follow-up summary

```
Admin (Lakshin): Required marketplace is live.
Recommended: Enforce Team Rule + Team GitHub MCP if not already completed.
Plugin repository: https://github.com/get-viti/dev-cycle-cursor-setup
```

---

# Part 5 — Actions that require the Cursor Dashboard

| Action | Owner |
|---|---|
| Set Required / Default On | Admin (Lakshin) — already set to Required |
| Enforce Team Rule | Admin (Lakshin) |
| Register Team MCP / Add to Marketplace | Admin (Lakshin) |
| Accept GitHub App / OAuth in browser | Admin or each user, as prompted |
| Fill personal `.agent/.env` | Each engineer |

---

# Part 6 — Bottom line

Lakshin keeps the Team Marketplace plugin (**Required**) current. Engineers start with `/dev-cycle`, resume with `/resume-dev-cycle`, use graphify and repomix as prescribed, and ship through GitHub with shared version names and human gates.
