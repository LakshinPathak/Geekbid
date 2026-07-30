# One-Time Developer Setup

Finish once per machine + once per product repo. Then run `/dev-cycle`.

| | |
|---|---|
| **Plugin** | `dev-cycle-workflow` (Required Team Marketplace) |
| **Marketplace** | `get-viti-dev-cycle-cursor-setup` |
| **Source** | https://github.com/get-viti/dev-cycle-cursor-setup |

Product app secrets (DB, auth, payments, etc.) → product README. This file = Cursor + `/dev-cycle` tooling only.

---

## 1. Cursor plugin (`dev-cycle-workflow`)

1. Sign in with your **team** account (same org as admin).  
2. Customize → Plugins (or Settings → Rules / Skills / Subagents).  
3. Confirm **`dev-cycle-workflow`** is installed and **Required**.  
4. If missing: reload window → wait → ask admin for seat / marketplace access.  
5. Keep plugin current (admin pushes `main`; Auto Refresh / reload).

Do **not** clone the plugin repo into every product app. Skills come from the plugin.

**Private marketplace (must know):** the plugin is published from the **private** repo `get-viti/dev-cycle-cursor-setup`. Cursor must **`git clone`/`fetch` that repo non-interactively**. That needs:

1. **`git` installed and on PATH** (Cursor’s PATH — after install, **fully quit Cursor**, not only Reload Window)  
2. **Git credentials** for `github.com` (PAT that can **read** `get-viti/dev-cycle-cursor-setup`) — see §8 Issue B  

GitHub MCP auth (§4) and plugin install auth are **different**. Fixing MCP does **not** fix a failed plugin clone.

### Skills & subagents

| Type | Items |
|---|---|
| **Skills** | `dev-cycle`, `resume-dev-cycle`, `repomix`, `graphify`, `code-review`, `autofix` (optional legacy) |
| **Subagents** | `dev-cycle-planner`, `dev-cycle-implementer`, `dev-cycle-tester` |
| **Rule** | `dev-cycle-routing` (always on) |

| Command | Use |
|---|---|
| `/dev-cycle` | New epic or issue |
| `/resume-dev-cycle` | Resume from `.agent/progress.md` |
| `/repomix` | Pack → `repomix-output.xml` |
| `/graphify` | Code knowledge graph |

**Step 7b** = local `code-review` skill (no paid CLI). **`autofix`** = optional legacy only if your org still uses CodeRabbit on PRs.

---

## 2. Install tools (once per machine)

Also need: `curl` and `jq` (for GitHub milestone / release scripts).

```bash
command -v curl jq
# Ubuntu/Debian if missing:
# sudo apt-get update && sudo apt-get install -y curl jq
```

### Repomix (required)

Docs: https://repomix.com/guide/installation · Needs **Node.js ≥ 18** (official docs say ≥ 22 preferred).

**Option A — global install (recommended):**

```bash
npm install -g repomix
```

Other package managers:

```bash
yarn global add repomix
# or
pnpm add -g repomix
# or
bun add -g repomix
# or (macOS/Linux)
brew install repomix
```

**Option B — no install (run latest via npx):**

```bash
npx repomix@latest
```

**Verify + first run** (from a product repo):

```bash
repomix --version
repomix --help
repomix
# → creates repomix-output.xml
```

Update later: `npm update -g repomix`

---

### Graphify (required for `/dev-cycle`)

Package name on PyPI: **`graphifyy`** → CLI command: **`graphify`**.  
**First-time setup: install the CLI** (do not skip this).

Needs [uv](https://github.com/astral-sh/uv) (recommended):

```bash
# Install uv if you don't have it: https://docs.astral.sh/uv/getting-started/installation/
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install graphify CLI
uv tool install graphifyy

# Verify
command -v graphify
graphify --version
graphify --help
```

Fallback without uv:

```bash
pip install graphifyy
# or, if pip blocks system install:
pip install graphifyy --break-system-packages
```

**Code-only (no API key)** — team default:

```bash
# Prefer --code-only when your version supports it (check: graphify --help)
graphify . --code-only
# In Cursor you can also use /graphify after the CLI is installed
```

Do **not** install `graphifyy[gemini]` unless you intentionally want doc/PDF/image semantic indexing (needs a Gemini key). Skip API keys for normal code graphs.

| Tool | Install | Verify |
|---|---|---|
| **repomix** | `npm install -g repomix` | `repomix --version` |
| **graphify** | `uv tool install graphifyy` | `graphify --version` |
| **curl / jq** | OS package manager | `command -v curl jq` |

---

## 3. Graphify — code only, no API key

- Index **source code** (AST). **No** OpenAI / Gemini / other API key.  
- Leave `openai_api_key` **blank**.  
- If anything asks for a key → **skip** and continue code-only.  
- Do not require semantic indexing of markdown / docs / PDFs unless someone explicitly asks.  
- CLI (if used): `graphify . --code-only` (check `graphify --help` for the flag).

**`/dev-cycle` Step 0c order (fixed):**

1. `/repomix` → `{WORKSPACE}/repomix-output.xml`  
2. `/graphify {WORKSPACE}` → `graphify-out/`  

Do not paste full XML into chat. Use graphify + scoped reads.

---

## 4. GitHub MCP in Cursor (**must**)

`/dev-cycle` needs GitHub for issues, branches, and PRs. Configure this once.

### 4.1 Create a Personal Access Token (must)

1. GitHub → **Settings → Developer settings → Personal access tokens**  
   - https://github.com/settings/tokens  
2. Scopes (minimum): **`repo`** (classic) or equivalent repo read/write on your product repos.  
   Add more if your org requires it for releases / org APIs.  
3. Copy the token once. Use the **same PAT** in two places:
   - MCP: env `GITHUB_PERSONAL_ACCESS_TOKEN` (below)
   - Product repo: `.agent/.env` → `git_token=` (§5)

Never commit the token. Never use someone else’s token.

### 4.2 Where to set MCP config in Cursor

| Location | Use |
|---|---|
| **`~/.cursor/mcp.json`** | Global for all projects (**recommended**) |
| **`.cursor/mcp.json`** in a repo | Project-only (never commit a raw token) |

UI: **Customize → MCP** (or **Settings → Tools & MCP**) → add/edit **GitHub**.

After editing: **save → fully restart Cursor** (so it reloads MCP + env).

### 4.3 What to put in `mcp.json` (must — team standard)

This matches the plugin’s `mcp.json` (hosted GitHub MCP). Create/edit **`~/.cursor/mcp.json`**:

```json
{
  "mcpServers": {
    "github": {
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "Bearer ${env:GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    }
  }
}
```

| Config field | Set to | Meaning |
|---|---|---|
| `mcpServers.github` | object | Server name shown as **github** |
| `url` | `https://api.githubcopilot.com/mcp/` | Official hosted GitHub MCP endpoint |
| `headers.Authorization` | `Bearer ${env:GITHUB_PERSONAL_ACCESS_TOKEN}` | Auth header; token comes from env |

Do **not** paste `ghp_...` into the JSON file.

**Important:** `git_token` in `.agent/.env` does **not** authenticate the MCP. Don’t rely on `mcp_auth` — this GitHub MCP is **static-token HTTP**, not OAuth (`mcp_auth` will time out).

### 4.4 Env var Cursor must see (must)

```bash
# add to ~/.bashrc or ~/.zshrc
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_YOUR_PAT_HERE"
```

```bash
source ~/.bashrc   # or: source ~/.zshrc
# quit Cursor completely and reopen
```

In **Customize → MCP**, **github** should show connected (not red/error).

### 4.5 Alternative: Docker local MCP

Use only if the remote URL does not work. Docker must be running:

```json
{
  "mcpServers": {
    "github": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "GITHUB_PERSONAL_ACCESS_TOKEN",
        "ghcr.io/github/github-mcp-server"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${env:GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    }
  }
}
```

Same env var as §4.4.

### 4.6 Verify (must)

In Cursor chat:

> Call GitHub `get_me`

Must return **your** GitHub username.

### 4.7 MCP vs `.agent/.env` (both must for full cycle)

| Need | Config |
|---|---|
| Issues, PRs, branches, search in IDE | **GitHub MCP** (§4) |
| Milestones, releases, version-bump scripts | **`.agent/.env` → `git_token=`** (§5) |

Official guide: https://github.com/github/github-mcp-server/blob/main/docs/installation-guides/install-cursor.md

---

## 5. Each product repo

Create a folder **`.agent`** at the **repo root**, then put **`.env` inside it** (path = `.agent/.env`).

```
your-product-repo/
├── AGENTS.md
└── .agent/          ← create this folder
    ├── .env.example ← template (can commit)
    └── .env         ← your secrets (never commit)
```

```bash
cd /path/to/your-product-repo

# 1) Create the folder
mkdir -p .agent

# 2) AGENTS.md at repo root
curl -fsSL \
  https://raw.githubusercontent.com/get-viti/dev-cycle-cursor-setup/main/product-scaffold/AGENTS.md \
  -o AGENTS.md

# 3) Template inside .agent/
curl -fsSL \
  https://raw.githubusercontent.com/get-viti/dev-cycle-cursor-setup/main/product-scaffold/.agent/.env.example \
  -o .agent/.env.example

# 4) Real env file inside .agent/ (copy from template)
cp .agent/.env.example .agent/.env

# 5) Never commit secrets
grep -q '.agent/.env' .gitignore 2>/dev/null || echo '.agent/.env' >> .gitignore
```

Do **not** put `.env` at the repo root. Do **not** copy `plugins/` or `.cursor/skills/` into product repos.

### Keys inside `.agent/.env` (lowercase)

| Key | Required? | What |
|---|---|---|
| `git_token` | Yes (full cycle) | Your GitHub PAT (same as MCP) |
| `github_org` | Yes | Product repo owner |
| `github_repo` | Yes | Product repo name |
| `reviewer_handle` | Step 9 PR | Reviewer GitHub username |
| `reviewer_name` | Step 9 PR | Reviewer display name |
| `gcp_project` | If used | Cloud project id |
| `openai_api_key` | **No** | Leave blank (code-only graphify) |

Edit **`.agent/.env`** (the file inside the folder):

```env
git_token=ghp_YOUR_PAT
github_org=your-org
github_repo=your-repo
gcp_project=
openai_api_key=
reviewer_handle=
reviewer_name=
```

```bash
test -d .agent && test -f .agent/.env && echo "OK: .agent/.env" || echo "MISSING: create .agent/ then .agent/.env"
```

At `/dev-cycle` Step 0b (legacy), the agent reads `github_org` / `github_repo` from **`.agent/.env`** and asks you to confirm.

---

## 6. Ready check

| Check | How |
|---|---|
| Plugin Required + skills visible | Customize → Plugins; `/dev-cycle` works (not empty/errored) |
| Skills + subagents | §1 list |
| Slash commands work | `/dev-cycle` `/repomix` `/graphify` |
| repomix | `repomix --version` |
| graphify | `graphify --version` — **no API key** |
| GitHub MCP config | `~/.cursor/mcp.json` has `github` + env var set |
| GitHub MCP works | `get_me` = you |
| `.agent/.env` | org / repo / `git_token` set, gitignored |
| curl + jq | `command -v curl jq` |

```bash
repomix --version 2>/dev/null || npx --yes repomix --version || echo REPMIX_MISSING
command -v graphify >/dev/null && graphify --version && echo GRAPHIFY_OK || echo GRAPHIFY_MISSING_INSTALL_CLI
test -f .agent/.env && echo AGENT_ENV_OK || echo AGENT_ENV_MISSING
test -n "$GITHUB_PERSONAL_ACCESS_TOKEN" && echo MCP_ENV_OK || echo MCP_ENV_MISSING
command -v curl jq >/dev/null && echo CURL_JQ_OK || echo CURL_JQ_MISSING
```

`/dev-cycle` Step **0-pre** also checks tooling + workspace. Missing `openai_api_key` is **not** a blocker.

---

## 7. Day to day

| Intent | Command |
|---|---|
| New work | `/dev-cycle` |
| Resume | `/resume-dev-cycle` |
| Pack only | `/repomix` |
| Structure | `/graphify` |

**Cycle highlights:**

1. **0c** — repomix → graphify code-only  
2. **2** — issue + branch `epic_*` / `issue_*`; **legacy** asks which **base branch**  
3. **3** — plan + `qa.md` (LLM picks test kinds; no need to choose unit/e2e yourself)  
4. **6 → 7 → 7b** — implementer → tester → local code-review  
5. **9–13** — PR → merge → release  

More detail: plugin skill + https://github.com/get-viti/dev-cycle-cursor-setup/blob/main/docs/TEAM_MARKETPLACE_SETUP.md

---

## 8. Troubleshooting (plugin + MCP + tools)

> **Two failures look similar but are different.** Fixing one does **not** fix the other.  
> 1. **GitHub MCP** red / no tools → token missing in MCP HTTP header (§8A).  
> 2. **`dev-cycle-workflow` plugin** errored / empty / no skills → git can’t clone the **private** marketplace (§8B–D).

### Quick cheat-sheet

| Symptom | Layer | Fix |
|---|---|---|
| `github` MCP red / “failed during live tool discovery” | MCP token | Set `GITHUB_PERSONAL_ACCESS_TOKEN` + restart, **or** project `.cursor/mcp.json` with Bearer PAT |
| `mcp_auth` times out | MCP | Don’t use `mcp_auth` — this server is **static-token HTTP**, not OAuth |
| `.agent/.env` `git_token` set but MCP still red | MCP vs scripts | `git_token` is for scripts only — MCP needs `GITHUB_PERSONAL_ACCESS_TOKEN` or `.cursor/mcp.json` |
| Plugin errored, **no** `/dev-cycle` / skills / agents | Plugin clone | Empty cache → git can’t read private marketplace — §8B |
| `fatal: could not read Username for 'https://github.com'` | git creds | `credential.helper store` + `~/.git-credentials` — §8B |
| `spawn git ENOENT` | git binary | Install git; **fully quit Cursor** (Reload Window is not enough) — §8C |
| Windows: creds file exists but still “could not read Username” | encoding | Rewrite `.git-credentials` as UTF-8 **no BOM**, **LF** endings — §8B |
| Plugin still empty after fix | cache | Reload / restart; or pre-populate cache — §8D |
| `/repomix` fails | CLI | `npm install -g repomix` |
| Graphify asks for API key | graphify | Skip — code-only |
| Graphify missing | CLI | `uv tool install graphifyy` |
| Milestone / release fails | scripts | Need `.agent/.env` `git_token` + `curl`/`jq` |

---

### 8A — GitHub MCP errored / cannot fetch

**Symptoms:** Settings → Tools & MCP → `github` red; agent can’t use GitHub tools.

**Cause:** empty `Authorization` bearer (env var not set in the environment Cursor was launched with). `git_token` in `.agent/.env` does **not** feed the MCP.

**Fix A (recommended):** set env + restart Cursor

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_YOUR_PAT"
# put in ~/.bashrc or ~/.zshrc; fully quit Cursor and reopen
```

**Fix B (quick, project-scoped):** `<repo>/.cursor/mcp.json` (gitignored):

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "Bearer ghp_YOUR_PAT"
      }
    }
  }
}
```

Cursor often picks this up without restart. **Never commit** this file with a real token.

**Verify:** MCP shows ready (~45 tools); chat → `get_me` returns **you**.

---

### 8B — Plugin fails: no skills / empty cache (git credentials)

**Symptoms:** `dev-cycle-workflow` installed but errored/empty; no `/dev-cycle`, `/repomix`, etc.  
Cache empty: `~/.cursor/plugins/cache/get-viti-dev-cycle-cursor-setup/dev-cycle-workflow/`

**Log error** (`Cursor Plugins*.log`):

```
fatal: could not read Username for 'https://github.com': terminal prompts disabled
```

**Cause:** marketplace repo is **private**. Cursor runs `git fetch` with prompts disabled. No SSH key + no HTTPS credentials → clone fails → empty plugin.

**Linux / macOS fix:**

```bash
git config --global credential.helper store
umask 077
printf 'https://GITHUB_USERNAME:YOUR_GITHUB_PAT@github.com\n' >> ~/.git-credentials
chmod 600 ~/.git-credentials
```

PAT must be able to **read** `get-viti/dev-cycle-cursor-setup`.

**Windows (PowerShell) fix:**

```powershell
$git = "C:\Program Files\Git\cmd\git.exe"
& $git config --global --replace-all credential.helper ""
& $git config --global --add credential.helper store

# Write UTF-8 **no BOM**, LF line ending (BOM/CRLF breaks the store helper silently)
$user = "YOUR_GITHUB_USERNAME"
$tok  = "YOUR_GITHUB_PAT"
$line = "https://${user}:${tok}@github.com"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText("$env:USERPROFILE\.git-credentials", $line + "`n", $utf8NoBom)
```

**Verify non-interactive clone (same as Cursor):**

```bash
GIT_TERMINAL_PROMPT=0 git ls-remote https://github.com/get-viti/dev-cycle-cursor-setup HEAD
# → prints a commit SHA
```

Then: **Developer: Reload Window** or fully restart Cursor.

Or use SSH: `ssh-keygen -t ed25519`, add public key to GitHub (SSH clone path succeeds).

---

### 8C — Plugin fails: `spawn git ENOENT`

**Cause:** `git` not installed, or not on the PATH of the **running** Cursor process.

**Fix:**

1. Install git (`winget install --id Git.Git` on Windows; `apt`/`brew` on Linux/macOS).  
2. Confirm `git --version` in a **new** terminal.  
3. **Fully quit and reopen Cursor** — Reload Window alone keeps the old PATH.  
4. If still ENOENT on Windows → reboot once so Explorer inherits the new PATH.

---

### 8D — Fallback: pre-populate plugin cache

If clone still fails or you need the plugin immediately, copy the plugin into the paths Cursor expects (use the `<sha>` from the plugin log):

**Linux / macOS:**

```
~/.cursor/plugins/cache/get-viti-dev-cycle-cursor-setup/dev-cycle-workflow/<sha>/
~/.cursor/plugins/marketplaces/github.com/get-viti/dev-cycle-cursor-setup/<sha>/
```

**Windows:**

```
%USERPROFILE%\.cursor\plugins\cache\get-viti-dev-cycle-cursor-setup\dev-cycle-workflow\<sha>\
%USERPROFILE%\.cursor\plugins\marketplaces\github.com\get-viti\dev-cycle-cursor-setup\<sha>\
```

1. Clone `get-viti/dev-cycle-cursor-setup` at that `<sha>`.  
2. Copy `plugins/dev-cycle-workflow/*` → cache `<sha>/`.  
3. Copy full repo → marketplace `<sha>/`.  
4. Cache root must contain `.cursor-plugin/plugin.json` plus `skills/`, `agents/`, `rules/`, `mcp.json`, etc.  
5. Reload Window.

---

### 8E — Useful paths & logs

| What | Linux / macOS | Windows |
|---|---|---|
| Global MCP | `~/.cursor/mcp.json` | `%USERPROFILE%\.cursor\mcp.json` |
| Project MCP | `<repo>/.cursor/mcp.json` | `<repo>\.cursor\mcp.json` |
| Plugin cache | `~/.cursor/plugins/cache/...` | `%USERPROFILE%\.cursor\plugins\cache\...` |
| Marketplace clone | `~/.cursor/plugins/marketplaces/github.com/...` | `%USERPROFILE%\.cursor\plugins\marketplaces\...` |
| Plugin logs | `~/.config/Cursor/logs/.../Cursor Plugins*.log` | `%APPDATA%\Cursor\logs\...\Cursor Plugins*.log` |
| Git credentials | `~/.git-credentials` | `%USERPROFILE%\.git-credentials` |

---

### 8F — Other tool issues

| Problem | Fix |
|---|---|
| `/repomix` fails | `npm install -g repomix` |
| Graphify asks for API key | Skip — code-only |
| Graphify missing | `uv tool install graphifyy` |
| Cycle asks for repo/token | Fix `.agent/.env` |
| Milestone / release fails | `git_token` + `curl`/`jq` |
| Duplicate skills | Normal if you open the **plugin** repo locally |

### Security

- PAT may live in `.agent/.env`, `.cursor/mcp.json`, and `~/.git-credentials` — keep them **gitignored**.  
- Prefer a fine-grained PAT limited to needed repos; rotate if leaked.  
- Never commit real tokens.

Field guides (more detail):  
`cursor-dev-cycle-plugin-and-github-mcp-troubleshooting.md` · `dev-cycle-plugin-and-mcp-setup-windows.md`

---

## 9. Done when

- [ ] Plugin installed **and** skills appear (`/dev-cycle`, etc.) — not empty/errored  
- [ ] `git` on PATH; private marketplace clone works (`git ls-remote` …)  
- [ ] `repomix` works  
- [ ] `graphify` CLI installed — no API key  
- [ ] GitHub MCP config set (`GITHUB_PERSONAL_ACCESS_TOKEN` and/or `.cursor/mcp.json`)  
- [ ] GitHub MCP `get_me` = you  
- [ ] Product repo has `AGENTS.md` + `.agent/.env` (gitignored) with `git_token`  
- [ ] Ready for `/dev-cycle`

Never commit `.agent/.env`, `mcp.json` with a raw PAT, or tokens.
