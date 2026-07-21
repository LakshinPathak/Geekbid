#!/usr/bin/env bash
# milestone-ops.sh — create, list, assign, and close GitHub milestones.
#
# Only used when the active GitHub access method (Step 0e) is a classic
# git_token, not an MCP server — if an MCP server is connected, use its
# milestone tools directly instead of shelling out to this script.
#
# Usage:
#   milestone-ops.sh create "<title>" ["<due_on ISO8601>"] ["<description>"]
#   milestone-ops.sh list
#   milestone-ops.sh close <milestone_number>
#   milestone-ops.sh assign <issue_number> <milestone_number>
#
# Reads from .agent/.env (relative to {PROJECT_ROOT}) — lowercase keys, matching
# this project's .env convention:
#   git_token      - classic GitHub PAT with repo scope   (required)
#   github_org     - org or user that owns the repo        (required)
#   github_repo    - repo name                              (required)
#
# Prints the created/found milestone's number to stdout on success.
# All other output goes to stderr.

set -euo pipefail

AGENT_DIR="${AGENT_DIR:-.agent}"
ENV_FILE="${AGENT_DIR}/.env"

usage() {
  cat >&2 <<'EOF'
Usage:
  milestone-ops.sh create "<title>" ["<due_on ISO8601>"] ["<description>"]
  milestone-ops.sh list
  milestone-ops.sh close <milestone_number>
  milestone-ops.sh assign <issue_number> <milestone_number>
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
  # gh_curl <method> <path> [json_body]
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
    [ $# -ge 1 ] || { echo "error: create requires a title" >&2; usage; }
    TITLE="$1"
    DUE_ON="${2:-}"
    DESCRIPTION="${3:-}"

    BODY="$(jq -n --arg title "$TITLE" --arg due "$DUE_ON" --arg desc "$DESCRIPTION" \
      '{title: $title} + (if $desc != "" then {description: $desc} else {} end) + (if $due != "" then {due_on: $due} else {} end)')"

    RESPONSE="$(gh_curl POST "/milestones" "$BODY")"
    NUMBER="$(echo "$RESPONSE" | jq -r '.number // empty')"
    if [ -z "$NUMBER" ]; then
      echo "error: milestone creation failed:" >&2
      echo "$RESPONSE" >&2
      exit 1
    fi
    echo "info: created milestone #$NUMBER — $TITLE" >&2
    echo "$NUMBER"
    ;;

  list)
    gh_curl GET "/milestones?state=open" | jq -r '.[] | "#\(.number)\t\(.title)\topen:\(.open_issues)\tclosed:\(.closed_issues)"'
    ;;

  close)
    [ $# -ge 1 ] || { echo "error: close requires a milestone number" >&2; usage; }
    NUM="$1"
    RESPONSE="$(gh_curl PATCH "/milestones/${NUM}" '{"state":"closed"}')"
    TITLE="$(echo "$RESPONSE" | jq -r '.title // empty')"
    if [ -z "$TITLE" ]; then
      echo "error: closing milestone #$NUM failed:" >&2
      echo "$RESPONSE" >&2
      exit 1
    fi
    echo "info: closed milestone #$NUM — $TITLE" >&2
    ;;

  assign)
    [ $# -ge 2 ] || { echo "error: assign requires <issue_number> <milestone_number>" >&2; usage; }
    ISSUE_NUM="$1"
    MILESTONE_NUM="$2"
    RESPONSE="$(gh_curl PATCH "/issues/${ISSUE_NUM}" "$(jq -n --argjson m "$MILESTONE_NUM" '{milestone: $m}')")"
    ASSIGNED="$(echo "$RESPONSE" | jq -r '.milestone.number // empty')"
    if [ "$ASSIGNED" != "$MILESTONE_NUM" ]; then
      echo "error: assigning issue #$ISSUE_NUM to milestone #$MILESTONE_NUM failed:" >&2
      echo "$RESPONSE" >&2
      exit 1
    fi
    echo "info: assigned issue #$ISSUE_NUM to milestone #$MILESTONE_NUM" >&2
    ;;

  *)
    usage
    ;;
esac
