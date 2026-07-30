#!/usr/bin/env bash
# release-ops.sh — create (and optionally list/delete) GitHub releases.
#
# Only used when the active GitHub access method (Step 0e) is a classic
# git_token, not an MCP server — if an MCP server is connected, use its
# release tools directly instead of shelling out to this script.
#
# Usage:
#   release-ops.sh create <tag> <title> <notes_body> <target_branch>
#   release-ops.sh list
#   release-ops.sh delete <tag>
#
# Reads from .agent/.env (relative to {PROJECT_ROOT}) — lowercase keys, matching
# this project's .env convention:
#   git_token      - classic GitHub PAT with repo scope   (required)
#   github_org     - org or user that owns the repo        (required)
#   github_repo    - repo name                              (required)
#
# Example (as referenced in Step 11 of the dev-cycle skill):
#   bash .agent/skills/git-ops/release-ops.sh create "epic_0.0.3" \
#     "epic_0.0.3 — Dark mode toggle" \
#     "Adds a dark mode toggle to settings. See releases/epic_0.0.3/release.md" \
#     main
#
# Prints the created release's HTML URL to stdout on success.
# All other output goes to stderr.

set -euo pipefail

AGENT_DIR="${AGENT_DIR:-.agent}"
ENV_FILE="${AGENT_DIR}/.env"

usage() {
  cat >&2 <<'EOF'
Usage:
  release-ops.sh create <tag> <title> <notes_body> <target_branch>
  release-ops.sh list
  release-ops.sh delete <tag>
EOF
  exit 1
}

[ $# -ge 1 ] || usage
ACTION="$1"
shift || true

command -v curl >/dev/null 2>&1 || { echo "error: curl is required" >&2; exit 1; }
command -v jq   >/dev/null 2>&1 || { echo "error: jq is required" >&2; exit 1; }

if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
fi

: "${git_token:?error: git_token not set in $ENV_FILE (or environment)}"
: "${github_org:?error: github_org not set in $ENV_FILE (or environment)}"
: "${github_repo:?error: github_repo not set in $ENV_FILE (or environment)}"
GIT_TOKEN="$git_token"
GITHUB_ORG="$github_org"
GITHUB_REPO="$github_repo"

API="https://api.github.com/repos/${GITHUB_ORG}/${GITHUB_REPO}"
AUTH_HEADER="Authorization: Bearer ${GIT_TOKEN}"
ACCEPT_HEADER="Accept: application/vnd.github+json"
API_VERSION_HEADER="X-GitHub-Api-Version: 2022-11-28"

gh_curl() {
  local method="$1" path="$2" body="${3:-}"
  if [ -n "$body" ]; then
    curl -sSf -X "$method" \
      -H "$AUTH_HEADER" -H "$ACCEPT_HEADER" -H "$API_VERSION_HEADER" \
      -H "Content-Type: application/json" \
      -d "$body" \
      "${API}${path}"
  else
    curl -sSf -X "$method" \
      -H "$AUTH_HEADER" -H "$ACCEPT_HEADER" -H "$API_VERSION_HEADER" \
      "${API}${path}"
  fi
}

case "$ACTION" in
  create)
    [ $# -ge 4 ] || { echo "error: create requires <tag> <title> <notes_body> <target_branch>" >&2; usage; }
    TAG="$1"; TITLE="$2"; NOTES="$3"; TARGET="$4"

    BODY="$(jq -n \
      --arg tag "$TAG" \
      --arg name "$TITLE" \
      --arg body "$NOTES" \
      --arg target "$TARGET" \
      '{tag_name: $tag, name: $name, body: $body, target_commitish: $target, draft: false, prerelease: false}')"

    RESPONSE="$(gh_curl POST "/releases" "$BODY")"
    URL="$(echo "$RESPONSE" | jq -r '.html_url // empty')"
    if [ -z "$URL" ]; then
      echo "error: release creation failed:" >&2
      echo "$RESPONSE" >&2
      exit 1
    fi
    echo "info: created release $TAG on $TARGET" >&2
    echo "$URL"
    ;;

  list)
    gh_curl GET "/releases" | jq -r '.[] | "\(.tag_name)\t\(.name)\t\(.html_url)"'
    ;;

  delete)
    [ $# -ge 1 ] || { echo "error: delete requires a tag" >&2; usage; }
    TAG="$1"
    RELEASE_ID="$(gh_curl GET "/releases/tags/${TAG}" | jq -r '.id // empty')"
    if [ -z "$RELEASE_ID" ]; then
      echo "error: no release found for tag $TAG" >&2
      exit 1
    fi
    gh_curl DELETE "/releases/${RELEASE_ID}" >/dev/null
    echo "info: deleted release $TAG (id $RELEASE_ID)" >&2
    ;;

  *)
    usage
    ;;
esac
