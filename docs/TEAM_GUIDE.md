# Development Cycle — Team Guide

This document describes how the organization runs AI-assisted product development with Cursor: the shared methodology, how tooling is distributed to every engineer, administrative ownership, and day-to-day responsibilities on product repositories. It is complete on its own for leadership and for engineering.

| Reference | Value |
|---|---|
| Plugin repository | https://github.com/get-viti/dev-cycle-cursor-setup |
| Plugin | `dev-cycle-workflow` |
| Team Marketplace | `get-viti-dev-cycle-cursor-setup` |
| Distribution | **Required** for all Cursor Teams members |
| Platform administration | Lakshin |

---

## 1. Objectives

Unstructured AI coding produces uneven outcomes: divergent prompting habits, skipped planning and review, and fragmented tracking across GitHub issues, branches, and releases.

This program establishes a single standard so that:

1. Features (**epics**) and defects (**issues**) follow the same path from intake to release  
2. Every engineer uses the same Cursor skills, subagents, and review gates  
3. Tooling is delivered centrally through the Team Marketplace—not by copying skill folders into each product repository  

Engineers work exclusively in **product** repositories. Shared capabilities arrive automatically via the Required plugin. Each person maintains only a private local configuration (`.agent/.env`) and enters work through `/dev-cycle` or `/resume-dev-cycle`.

---

## 2. Capabilities delivered to the team

With the Required plugin installed, each member receives:

| Component | Identifier | Function |
|---|---|---|
| Skill | `/dev-cycle` | Full cycle for **new** epics and issues |
| Skill | `/resume-dev-cycle` | Continuation from recorded progress (`.agent/progress.md`) |
| Skill | `/repomix` | Full-repository context pack (`repomix-output.xml`) |
| Skill | `/graphify` | Structural knowledge graph for navigation and impact analysis |
| Skill | `code-review` | CodeRabbit CLI review (dev-cycle Step 7b) |
| Skill | `autofix` | Apply CodeRabbit PR review threads (Steps 9–10) |
| Subagent | `dev-cycle-planner` | Planning-intensive steps (specification, plan, decomposition) |
| Subagent | `dev-cycle-implementer` | Implementation and test execution |
| Rule | `dev-cycle-routing` | Routes new versus resumed work to the appropriate skill |

Product repositories remain intentionally lean. The marketplace plugin is the sole distribution channel for skills and agents.

---

## 3. End-to-end workflow

```
Engineer opens a product repository in Cursor
                 │
                 ▼
        Unfinished progress recorded?
           │                │
          Yes              No
           │                │
           ▼                ▼
 /resume-dev-cycle     /dev-cycle
           │                │
           └────────┬───────┘
                    ▼
     Understand the codebase
     (graphify; repomix when required)
                    │
                    ▼
     Plan → human approval
                    │
                    ▼
     Implement and test
                    │
                    ▼
     Human approval of results
                    │
                    ▼
     Pull request → designated reviewer → merge
                    │
                    ▼
     Release documentation → close GitHub issue
```

A single version identifier links the GitHub issue, git branch, and release artifacts (for example `issue_0.0.8` or `epic_0.0.4`).

### Cycle steps (summary)

1. Start with `/dev-cycle` or `/resume-dev-cycle`  
2. Intake (new) or restore from `.agent/progress.md` (resume)  
3. Version + detailed GitHub issue + matching branch  
4. Plan with graphify (and repomix when needed)  
5. Human plan approval  
6. Implement and test  
7. Human code/test approval  
8. Pull request to staging with named reviewer  
9. Reviewer merge; promote to main when agreed  
10. Release notes, QA artifacts, close issue  

---

## 4. Platform administration

Lakshin owns the shared plugin, the Team Marketplace configuration, and related Cursor Teams settings.

### 4.1 Completed

| # | Action | Status |
|---|---|---|
| 1 | Packaged `plugins/dev-cycle-workflow/` (skills, agents, routing rule, MCP metadata) | Complete |
| 2 | Published marketplace manifest (`.cursor-plugin/marketplace.json`) | Complete |
| 3 | Published private repository `get-viti/dev-cycle-cursor-setup` on `main` | Complete |
| 4 | Imported the Team Marketplace from that repository in Cursor Dashboard | Complete |
| 5 | Granted marketplace access to all members | Complete |
| 6 | Enabled Auto Refresh | Complete |
| 7 | Set plugin install mode to **Required** | Complete |

### 4.2 Recommended administrative follow-through

**Enforced Team Rule**

1. Open [Team Rules](https://cursor.com/dashboard?tab=team-content)  
2. Create and enable a rule; enable **Enforce this rule**  
3. Title: `Development Cycle routing`  
4. Body:

```
New epic/feature or issue/bug → invoke /dev-cycle. Do not freehand a full feature/fix outside that cycle.

Resume unfinished work (.agent/progress.md exists, or developer says resume/continue/pick up where we left off) → invoke /resume-dev-cycle. Do not re-run Step 0 intake.

Structure / blast radius → use graphify (/graphify {WORKSPACE}, query/explain/path, reflect on resume) as in the //dev-cycle skill.

Full-repo LLM pack (MANDATORY) → /repomix FIRST at Step 0c → {WORKSPACE}/repomix-output.xml, then graphify index. Order: new vs legacy (0b) → (legacy: confirm github_org/github_repo from .agent/.env + scan issues) → pack → index → PRD/TYPE (0d). Use graphify + scoped XML for token-optimized classification and Step 3 planning (do not dump huge XML into chat).

Parent agent must Task-spawn //dev-cycle-planner (Steps 0d, 3, 4) and //dev-cycle-implementer (Steps 6, 7).

Product repos stay thin: .agent/.env from .env.example + short AGENTS pointer; skills come from the team plugin, not copy-paste.
```

**Team GitHub MCP**

1. Cursor Dashboard → Integrations & MCP → Team MCP Servers  
2. Ensure GitHub is available for Cloud Agents  
3. Publish GitHub MCP to the Team Marketplace for IDE users where applicable  
4. Require each engineer to authenticate with individual credentials—never a shared personal access token  

**Ongoing maintenance**

- Ship plugin updates by committing and pushing to `main` on the plugin repository  
- Rely on Auto Refresh; use marketplace **Refresh** if indexing lags  
- Install the Cursor GitHub App on the plugin repository if Auto Refresh does not observe pushes  
- Keep secrets and `.agent/.env` out of version control  

---

## 5. Engineer onboarding

Complete once per workstation, then once per product repository. Engineers do not need to modify the plugin repository for ordinary product work.

### 5.1 Prerequisites

1. Cursor Teams membership in the same organization  
2. GitHub access to the relevant product repositories  
3. Ability to create a personal GitHub access token  
4. Current Cursor desktop client  

Recommended local utilities:

```bash
command -v curl
command -v jq
command -v repomix || echo "Install repomix: https://github.com/yamadashy/repomix"
command -v graphify || echo "graphify CLI optional when the Cursor Skill is available"
```

Install repomix when required:

```bash
npm install -g repomix
```

Install CodeRabbit CLI when using Step 7b review (skills ship via plugin; CLI is per-machine):

```bash
brew install coderabbit   # or https://www.coderabbit.ai/cli
coderabbit auth login
```

### 5.2 Confirm Required plugin availability

1. Sign in to Cursor with the team account  
2. Open Customize (or Settings → Rules / Skills / Subagents / Plugins)  
3. Confirm plugin `dev-cycle-workflow` is present under Required  
4. Confirm skills: `dev-cycle`, `resume-dev-cycle`, `repomix`, `graphify`, `code-review`, `autofix`  
5. Confirm subagents: `dev-cycle-planner`, `dev-cycle-implementer`  
6. If anything is missing: reload the window, allow time for sync, then escalate to platform administration—do not copy skill folders from another machine  
7. Confirm slash commands in chat: `/dev-cycle`, `/resume-dev-cycle`, `/repomix`

Required install mode should deliver the plugin without a manual install; first-day verification remains mandatory.

### 5.3 Authenticate GitHub under the individual’s identity

**IDE MCP**

1. Open Customize → MCP (or Integrations)  
2. Enable or install GitHub MCP from the team or official marketplace  
3. Authenticate as the individual engineer (OAuth or personal access token)  
4. In chat, request GitHub `get_me` and confirm the returned login  

**Token for `.agent/.env`**

1. Create a personal access token with scopes required by the product organization (typically including `repo`)  
2. Store it only in the local `.agent/.env` file as `git_token=`  
3. Do not share tokens, commit them, or place them in tickets or shared channels  

### 5.4 Prepare each product repository

Work occurs in the product codebase. Add only the thin scaffold:

```text
your-product-repo/
├── AGENTS.md
└── .agent/
    └── .env.example
```

Source: `product-scaffold/` in https://github.com/get-viti/dev-cycle-cursor-setup  

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

Populate `.agent/.env` (lowercase keys):

| Key | Required | Purpose |
|---|---|---|
| `git_token` | Yes for a complete cycle | Individual GitHub personal access token |
| `github_org` | Yes | Owner of the product repository |
| `github_repo` | Yes | Product repository name |
| `gcp_project` | When applicable | GCP project identifier; otherwise leave blank |
| `reviewer_handle` | Before pull request | Reviewer’s GitHub username |
| `reviewer_name` | Recommended | Reviewer display name |

```bash
git_token=<your_github_pat>
github_org=<product_org_or_user>
github_repo=<product_repo_name>
gcp_project=
reviewer_handle=<github_username>
reviewer_name=<display_name>
```

Protect secrets:

```bash
grep -q '.agent/.env' .gitignore 2>/dev/null || echo '.agent/.env' >> .gitignore
git status   # .agent/.env must not be staged
```

Do not copy `plugins/dev-cycle-workflow/` into product repositories. When `/dev-cycle` requests optional scaffolding for milestones or releases under `.agent/`, follow those prompts in the product repository.

### 5.5 Daily usage

| Intent | Command |
|---|---|
| Begin a new epic or issue | `/dev-cycle` |
| Continue unfinished work | `/resume-dev-cycle` (requires `.agent/progress.md`) |
| Produce a repository pack | `/repomix` |
| Inspect structure or impact | `/graphify` (or allow `/dev-cycle` to invoke it) |

For new work, select new when prompted; distinguish epic versus issue; provide the codebase path and PRD or reproduction material as requested.

For resume, confirm `.agent/progress.md` exists, invoke `/resume-dev-cycle`, and expect restoration of version, step, and workspace without re-entering credentials. If the agent reports nothing to resume, begin with `/dev-cycle`.

### 5.6 Human review gates

| Gate | Expectation |
|---|---|
| Plan review | Explicit approval before implementation begins |
| Code and test review | Explicit approval before advancing the pull request |
| Pull request merge | Approval by the designated reviewer |
| Issue closure / promote to main | Confirmation when requested by the agent |

Skipping gates undermines the quality and auditability of the process.

### 5.7 First-day verification

- [ ] Signed in with the correct Cursor Teams account  
- [ ] Plugin `dev-cycle-workflow` visible as Required  
- [ ] Skills present: `dev-cycle`, `resume-dev-cycle`, `repomix`, `graphify`, `code-review`, `autofix`  
- [ ] Subagents present: `dev-cycle-planner`, `dev-cycle-implementer`  
- [ ] GitHub `get_me` returns the individual’s username  
- [ ] Product repository includes `AGENTS.md` and a local `.agent/.env`  
- [ ] `.agent/.env` is ignored by git and not staged  
- [ ] `/dev-cycle` is recognized in chat  
- [ ] `repomix` CLI or `/repomix` skill operates correctly  

Unresolved gaps should be raised with platform administration (Lakshin), including relevant Settings screenshots where helpful.

---

## 6. Roles and ownership

| Role | Owner | Responsibilities |
|---|---|---|
| Platform administration | Lakshin | Plugin repository, Required marketplace, Auto Refresh, Team Rule, Team MCP, onboarding support |
| Product engineer | Each teammate | Individual credentials and `.agent/.env`; execution of `/dev-cycle` and `/resume-dev-cycle`; adherence to review gates |
| Pull request reviewer | Named in `reviewer_handle` | Review and approval before merge |

---

## 7. Troubleshooting

| Symptom | Resolution |
|---|---|
| Skills or `/dev-cycle` unavailable | Confirm Teams membership and Required plugin; reload; escalate to platform administration |
| Resume reports nothing to resume | No `.agent/progress.md` yet—start with `/dev-cycle` |
| GitHub MCP authentication failure | Re-authenticate; verify token scopes; confirm individual credentials |
| `get_me` returns another user | Replace credentials with the individual’s own |
| Agent cannot locate credentials | Confirm the opened folder contains `.agent/.env` |
| `.env` committed inadvertently | Revoke the token immediately; remove from git with platform administration |
| Branch or version already exists | Expected on active repositories—the cycle synchronizes with GitHub; do not invent colliding names |

---

## 8. Security standards

1. Each engineer uses an individual GitHub credential  
2. `.agent/.env` is never committed  
3. Tokens are never stored in the shared plugin repository  
4. Token scopes are limited to what product access requires  
5. Exposed credentials are revoked and replaced the same day  

---

## 9. Repository assets

| Path | Contents |
|---|---|
| https://github.com/get-viti/dev-cycle-cursor-setup | Plugin source |
| `plugins/dev-cycle-workflow/` | Plugin payload |
| `product-scaffold/` | Thin files for product repositories |
| `.cursor-plugin/marketplace.json` | Marketplace index |

---

## 10. Executive summary

| Topic | Summary |
|---|---|
| Shared plugin | `dev-cycle-workflow`, Required via Team Marketplace |
| Source repository | https://github.com/get-viti/dev-cycle-cursor-setup |
| Administration | Lakshin |
| New work | `/dev-cycle` |
| Resume | `/resume-dev-cycle` |
| Supporting tools | `/repomix` (context pack), `/graphify` (structure), `code-review` + `autofix` (CodeRabbit) |
| Per engineer | Individual `.agent/.env` and GitHub credentials |
| Product repositories | Thin scaffold only (`AGENTS.md` + `.env.example`) |
| Quality control | Human approval at plan, tests, and pull request |

Lakshin keeps the Required marketplace plugin current. Engineers run the same cycle end to end in product repositories, with shared version names and human gates.
