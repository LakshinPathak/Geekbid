#!/usr/bin/env bash
# ============================================================
# generate-docs.sh — Step 12: finalize qa.md + skeleton release.md
# ============================================================
# Usage: bash generate-docs.sh <version> <epic|issue>
#   e.g. bash generate-docs.sh epic_0.0.3 epic
#
# This script only handles what's mechanically knowable (version, date,
# type substitution). It does NOT fill in test results, user stories, or
# change descriptions — that content comes from the agent's actual work
# in Steps 3/4, 6, and 7, and must be filled in, not guessed here.
#
# IMPORTANT — qa.md sequencing changed (see dev-cycle-gap-analysis §6a):
#   qa.md is now the SINGLE SOURCE OF TRUTH for user stories + test cases
#   and is authored at Step 3/4 (stories/cases filled, Status blank),
#   updated in place at Step 7 (Status → PASS/FAIL). It is NOT regenerated
#   here. This script will therefore:
#     - NEVER overwrite an existing qa.md (the Step-3/4 → Step-7 living doc)
#     - only scaffold qa.md as a LAST-RESORT fallback (with a loud warning)
#       if it's somehow missing, meaning Step 3/4 skipped authoring it
#     - always (re-)scaffold release.md if absent (Step 12 is its home)
#
# Requires:
#   releases/{version}/planning.md must already exist (from Step 3)
#   .agent/templates/qa.md.template and release.md.template must exist
#
# Produces / touches:
#   releases/{version}/qa.md       (left untouched if present; fallback skeleton if not)
#   releases/{version}/release.md  (skeleton, from release.md.template)
# ============================================================

set -euo pipefail

VERSION="${1:?Usage: bash generate-docs.sh <version> <epic|issue>}"
TYPE="${2:?Usage: bash generate-docs.sh <version> <epic|issue>}"
PROJECT_ROOT="${PROJECT_ROOT:-.}"
AGENT_DIR="${PROJECT_ROOT}/.agent"
RELEASE_DIR="${PROJECT_ROOT}/releases/${VERSION}"
TEMPLATES_DIR="${AGENT_DIR}/templates"

case "$TYPE" in
  epic|issue) ;;
  *) echo "error: type must be 'epic' or 'issue', got '$TYPE'" >&2; exit 1 ;;
esac

if [ ! -f "${RELEASE_DIR}/planning.md" ]; then
  echo "error: ${RELEASE_DIR}/planning.md not found — Step 3 must complete before Step 12 runs" >&2
  exit 1
fi

for tpl in qa.md.template release.md.template; do
  if [ ! -f "${TEMPLATES_DIR}/${tpl}" ]; then
    echo "error: ${TEMPLATES_DIR}/${tpl} not found — see Document Templates section, copy it in first" >&2
    exit 1
  fi
done

mkdir -p "$RELEASE_DIR"
TODAY="$(date -u +"%Y-%m-%d")"
TITLE="$VERSION"
TYPE_LABEL="Epic — New Feature"
[ "$TYPE" = "issue" ] && TYPE_LABEL="Issue — Bug Fix"

scaffold() {
  local target="$1"
  sed \
    -e "s/{version}/${VERSION}/g" \
    -e "s/{TAG}/${VERSION}/g" \
    -e "s/{TITLE}/${TITLE}/g" \
    -e "s/{DATE}/${TODAY}/g" \
    -e "s/{date}/${TODAY}/g" \
    -e "s/{TYPE}/${TYPE_LABEL}/g" \
    "${TEMPLATES_DIR}/${target}.template" > "${RELEASE_DIR}/${target}"
}

# qa.md — expected to already exist from Step 3/4 (authored there, filled at
# Step 7). Never overwrite it; only scaffold as a last resort if missing.
if [ -f "${RELEASE_DIR}/qa.md" ]; then
  echo "ok: ${RELEASE_DIR}/qa.md already exists (from Step 3/4 → Step 7) — left untouched; only finalize its Summary/verdict manually" >&2
else
  scaffold "qa.md"
  echo "WARNING: ${RELEASE_DIR}/qa.md was missing — Step 3/4 should have authored it (single source of truth for user stories + test cases, see §6a)." >&2
  echo "WARNING: created a bare skeleton now — you must author the User Stories + Test Cases and their PASS/FAIL results by hand before Step 13." >&2
fi

# release.md — Step 12 is its home; scaffold if absent, never overwrite.
if [ -f "${RELEASE_DIR}/release.md" ]; then
  echo "info: ${RELEASE_DIR}/release.md already exists, not overwriting — edit it directly" >&2
else
  scaffold "release.md"
  echo "info: created skeleton ${RELEASE_DIR}/release.md — fill in overview / changes / test summary from this session's actual work" >&2
fi

echo "done: ${RELEASE_DIR} ready — qa.md is the living stories/cases doc from Step 3/4; this script does not know test results or code changes, complete those sections manually" >&2
