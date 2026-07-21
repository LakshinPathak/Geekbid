#!/usr/bin/env bash
# ============================================================
# create-release.sh — Step 13: release + push artifacts + close issue
# ============================================================
# Usage: bash create-release.sh <version> <title> <notes_body> <target_branch> <issue_number>
#   e.g. bash create-release.sh epic_0.0.3 "epic_0.0.3 — Dark mode toggle" \
#          "Adds a dark mode toggle to settings." main 42
#
# Only used when the active GitHub access method (Step 0e) is a classic
# git_token — if an MCP server is connected and covers releases/push_files,
# prefer that over this script (see the MCP-vs-Script matrix in Step 0e;
# note releases have NO MCP support regardless, so this script's release
# step always runs either way — only the "push artifacts" and "close issue"
# steps have an MCP alternative).
#
# What it does, in order:
#   1. Calls release-ops.sh create — creates the GitHub Release
#   2. Pushes releases/{version}/*.md to the repo's releases/ folder,
#      ONE FILE PER API CALL (not a single multi-file commit — the GitHub
#      Contents API doesn't reliably support multi-file commits in one
#      call; looping per-file is slower but correct)
#   3. Appends a one-line entry for this cycle to releases/CHANGELOG_INDEX.md
#      (the running "what already shipped" index — dev-cycle-gap-analysis §5,
#      Khilav's idea; consumed by Step 0b for TYPE classification) and pushes it
#   4. Closes the GitHub issue for {version}
#
# Reads from .agent/.env (relative to {PROJECT_ROOT}), lowercase keys:
#   git_token, github_org, github_repo
#
# Requires: releases/{version}/planning.md, qa.md, release.md all exist
#           (qa.md/release.md from generate-docs.sh, planning.md from Step 3)
# ============================================================

set -euo pipefail

VERSION="${1:?Usage: create-release.sh <version> <title> <notes_body> <target_branch> <issue_number>}"
TITLE="${2:?}"
NOTES="${3:?}"
TARGET="${4:?}"
ISSUE_NUMBER="${5:?}"

PROJECT_ROOT="${PROJECT_ROOT:-.}"
AGENT_DIR="${PROJECT_ROOT}/.agent"
ENV_FILE="${AGENT_DIR}/.env"
RELEASE_DIR="${PROJECT_ROOT}/releases/${VERSION}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GIT_OPS_DIR="${AGENT_DIR}/skills/git-ops"

command -v curl >/dev/null 2>&1 || { echo "error: curl is required" >&2; exit 1; }
command -v jq   >/dev/null 2>&1 || { echo "error: jq is required" >&2; exit 1; }

if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
fi
: "${git_token:?error: git_token not set in $ENV_FILE (or environment)}"
: "${github_org:?error: github_org not set in $ENV_FILE (or environment)}"
: "${github_repo:?error: github_repo not set in $ENV_FILE (or environment)}"

for f in planning.md qa.md release.md; do
  if [ ! -f "${RELEASE_DIR}/${f}" ]; then
    echo "error: ${RELEASE_DIR}/${f} not found — required before create-release.sh runs" >&2
    exit 1
  fi
done

GITHUB_API="https://api.github.com"

echo "== Step 1/3: creating GitHub release ==" >&2
if [ -x "${GIT_OPS_DIR}/release-ops.sh" ]; then
  bash "${GIT_OPS_DIR}/release-ops.sh" create "$VERSION" "$TITLE" "$NOTES" "$TARGET"
else
  echo "error: ${GIT_OPS_DIR}/release-ops.sh not found or not executable" >&2
  exit 1
fi

# push_file <local_path> <path_in_repo> <commit_message>
# PUTs one file via the Contents API, creating or updating (sha) as needed.
push_file() {
  local local_path="$1" path_in_repo="$2" msg="$3"
  local content_b64 existing_sha body response commit_sha
  content_b64="$(base64 -w0 "$local_path" 2>/dev/null || base64 "$local_path" | tr -d '\n')"

  existing_sha="$(curl -sS \
    -H "Authorization: token ${git_token}" \
    -H "Accept: application/vnd.github.v3+json" \
    "${GITHUB_API}/repos/${github_org}/${github_repo}/contents/${path_in_repo}?ref=${TARGET}" \
    | jq -r '.sha // empty')"

  body="$(jq -n \
    --arg msg "$msg" \
    --arg content "$content_b64" \
    --arg branch "$TARGET" \
    --arg sha "$existing_sha" \
    '{message: $msg, content: $content, branch: $branch} + (if $sha != "" then {sha: $sha} else {} end)')"

  response="$(curl -sS -X PUT \
    -H "Authorization: token ${git_token}" \
    -H "Accept: application/vnd.github.v3+json" \
    -d "$body" \
    "${GITHUB_API}/repos/${github_org}/${github_repo}/contents/${path_in_repo}")"

  commit_sha="$(echo "$response" | jq -r '.commit.sha // empty')"
  if [ -z "$commit_sha" ]; then
    echo "error: failed to push ${path_in_repo}:" >&2
    echo "$response" | jq -r '.message // .' >&2
    exit 1
  fi
  echo "info: pushed ${path_in_repo}" >&2
}

echo "== Step 2/4: pushing release artifacts (one file per commit) ==" >&2
for f in "${RELEASE_DIR}"/*.md; do
  [ -f "$f" ] || continue
  fname="$(basename "$f")"
  push_file "$f" "releases/${VERSION}/${fname}" "chore(release): ${VERSION} — ${fname}"
done

echo "== Step 3/4: updating releases/CHANGELOG_INDEX.md ==" >&2
CHANGELOG="${PROJECT_ROOT}/releases/CHANGELOG_INDEX.md"
TODAY="$(date -u +"%Y-%m-%d")"
# one-line summary = first non-empty line of the release notes body
SUMMARY="$(printf '%s\n' "$NOTES" | grep -m1 -v '^[[:space:]]*$' || true)"
[ -n "$SUMMARY" ] || SUMMARY="(no summary)"
if [ ! -f "$CHANGELOG" ]; then
  {
    echo "# Released Features / Fixes — Index"
    echo ""
    echo "> Running, one-line-per-cycle index of everything shipped through the"
    echo "> dev-cycle. Auto-appended by create-release.sh at Step 13. Read at"
    echo "> Step 0b to classify epic vs. issue vs. enhancement-of-existing."
    echo ""
  } > "$CHANGELOG"
fi
# Idempotent: don't double-append the same version if this reruns.
if ! grep -q "^- \`${VERSION}\`" "$CHANGELOG" 2>/dev/null; then
  echo "- \`${VERSION}\` — ${TITLE} — ${SUMMARY} (${TODAY})" >> "$CHANGELOG"
  echo "info: appended ${VERSION} to $CHANGELOG" >&2
else
  echo "info: ${VERSION} already indexed in $CHANGELOG — not duplicating" >&2
fi
push_file "$CHANGELOG" "releases/CHANGELOG_INDEX.md" "chore(release): index ${VERSION}"

echo "== Step 4/4: closing issue #${ISSUE_NUMBER} ==" >&2
close_response="$(curl -sS -X PATCH \
  -H "Authorization: token ${git_token}" \
  -H "Accept: application/vnd.github.v3+json" \
  -d '{"state":"closed"}' \
  "${GITHUB_API}/repos/${github_org}/${github_repo}/issues/${ISSUE_NUMBER}")"
closed_state="$(echo "$close_response" | jq -r '.state // empty')"
if [ "$closed_state" != "closed" ]; then
  echo "error: failed to close issue #${ISSUE_NUMBER}:" >&2
  echo "$close_response" | jq -r '.message // .' >&2
  exit 1
fi

echo "done: release created, artifacts pushed, issue #${ISSUE_NUMBER} closed" >&2
