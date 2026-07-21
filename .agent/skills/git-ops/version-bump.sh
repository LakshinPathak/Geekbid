#!/usr/bin/env bash
# ============================================================
# version-bump.sh — version increment for the {TYPE} dev cycle
# ============================================================
# Usage: bash version-bump.sh <epic|issue>
# Output: epic_0.0.1 or issue_0.0.1  (printed to stdout)
#
# Reads/writes .agent/versions.json (relative to {PROJECT_ROOT}/.agent/ —
# run this from {PROJECT_ROOT}, or set AGENT_DIR).
#
# versions.json shape (major/minor/patch tracked separately, with full history):
#   {
#     "epic":  {"major": 0, "minor": 0, "patch": 3, "history": [...]},
#     "issue": {"major": 0, "minor": 0, "patch": 7, "history": [...]}
#   }
#
# DELIBERATE NON-STANDARD RULE: patch rolls to minor at >10, minor rolls to
# major at >10. This is NOT a bug and does NOT follow standard semver.
# Do NOT "fix" this to standard semver — it's an intentional versioning
# scheme for this workflow.
# ============================================================

set -euo pipefail

TRACK="${1:?Usage: bash version-bump.sh <epic|issue> [--set X.Y.Z]}"
AGENT_DIR="${AGENT_DIR:-.agent}"
VERSION_FILE="${AGENT_DIR}/versions.json"
PROGRESS_FILE="${AGENT_DIR}/progress.md"

command -v jq >/dev/null 2>&1 || { echo "error: jq is required but not installed" >&2; exit 1; }

case "$TRACK" in
  epic|issue) ;;
  *) echo "error: type must be 'epic' or 'issue', got '$TRACK'" >&2; exit 1 ;;
esac

mkdir -p "$AGENT_DIR"

# Initialize versions.json if missing
if [ ! -f "$VERSION_FILE" ]; then
  jq -n '{epic: {major:0, minor:0, patch:0, history:[]}, issue: {major:0, minor:0, patch:0, history:[]}}' > "$VERSION_FILE"
  echo "info: created $VERSION_FILE with defaults" >&2
fi

# --set X.Y.Z : force-align local tracking to a version already on GitHub
# (used by Step 2's GitHub-sync check when local versions.json is behind what's
# already on GitHub — e.g. versions.json was reset/lost, or someone bumped
# manually). This does NOT run the overwrite guard below, since it's a sync
# operation, not starting new work.
if [ "${2:-}" = "--set" ]; then
  SET_VERSION="${3:?error: --set requires a version argument, e.g. --set 0.0.5}"
  if ! [[ "$SET_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "error: --set value must look like X.Y.Z, got '$SET_VERSION'" >&2
    exit 1
  fi
  IFS='.' read -r SMAJOR SMINOR SPATCH <<< "$SET_VERSION"
  TMP="$(mktemp)"
  jq ".${TRACK}.major = ${SMAJOR} | .${TRACK}.minor = ${SMINOR} | .${TRACK}.patch = ${SPATCH}" \
    "$VERSION_FILE" > "$TMP" && mv "$TMP" "$VERSION_FILE"
  echo "info: force-set $TRACK version to $SET_VERSION (synced with GitHub)" >&2
  echo "${TRACK}_${SET_VERSION}"
  exit 0
fi

# --- Overwrite Guard ---
# Check for an incomplete cycle before allowing a new version bump.
# If progress.md exists with pending/in_progress steps, stop and ask the developer
# rather than silently starting a second version on top of unfinished work.
if [ -f "$PROGRESS_FILE" ]; then
  if grep -qiE '(pending|in_progress|in progress)' "$PROGRESS_FILE"; then
    echo "error: incomplete cycle detected in $PROGRESS_FILE" >&2
    echo "Current progress:" >&2
    head -20 "$PROGRESS_FILE" >&2
    echo "" >&2
    echo "Resolve with the developer before starting a new cycle." >&2
    echo "To force past this: archive or delete $PROGRESS_FILE and re-run." >&2
    exit 1
  fi
fi

MAJOR=$(jq -r ".${TRACK}.major" "$VERSION_FILE")
MINOR=$(jq -r ".${TRACK}.minor" "$VERSION_FILE")
PATCH=$(jq -r ".${TRACK}.patch" "$VERSION_FILE")

PATCH=$((PATCH + 1))
if [ "$PATCH" -gt 10 ]; then
  MINOR=$((MINOR + 1))
  PATCH=0
fi
if [ "$MINOR" -gt 10 ]; then
  MAJOR=$((MAJOR + 1))
  MINOR=0
fi

VERSION="${MAJOR}.${MINOR}.${PATCH}"
TAG="${TRACK}_${VERSION}"
TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

TMP="$(mktemp)"
jq ".${TRACK}.major = ${MAJOR} | .${TRACK}.minor = ${MINOR} | .${TRACK}.patch = ${PATCH} | .${TRACK}.history += [{\"version\": \"${VERSION}\", \"tag\": \"${TAG}\", \"date\": \"${TIMESTAMP}\"}]" \
  "$VERSION_FILE" > "$TMP" && mv "$TMP" "$VERSION_FILE"

echo "info: bumped $TRACK to $VERSION" >&2
echo "$TAG"
