#!/usr/bin/env bash
# ============================================================
# validate-input.sh — Step 2 gate: confirm the INSTRUCTION half of the
# "minimum information" floor is satisfied before GitHub issue creation.
# ============================================================
# Upgraded from a presence check into a CONTENT/structural check
# (see dev-cycle-gap-analysis §1 and §6): there is now ONE intake+plan
# file, planning.md. Part A of it is the intake (what prd.md/issue.md
# used to be). This validates that Part A's required sections for the
# given TYPE actually EXIST and are FILLED IN with real content — not
# just that a file is present and non-empty. A one-sentence PRD, or a
# template left full of {placeholders}, now fails here.
#
# Usage: bash validate-input.sh <version> <epic|issue>
#   e.g. bash validate-input.sh epic_0.0.3 epic
#        bash validate-input.sh issue_0.0.7 issue
#
# Exit codes:
#   0 — validation passed (Part A complete)
#   1 — missing/unfilled required section(s), listed on stderr
#
# Where it looks (one file, two possible locations — inbox pre-Step-2,
# releases from Step 2 onward):
#   inbox/{version}/planning.md      (preferred if present)
#   releases/{version}/planning.md   (fallback)
#
# Tunable: VALIDATE_MIN_WORDS (default 8) — minimum words of real,
# non-placeholder content a required section body must contain.
# ============================================================

set -euo pipefail

VERSION="${1:?Usage: bash validate-input.sh <version> <epic|issue>}"
TYPE="${2:?Usage: bash validate-input.sh <version> <epic|issue>}"
PROJECT_ROOT="${PROJECT_ROOT:-.}"
MIN_WORDS="${VALIDATE_MIN_WORDS:-8}"

case "$TYPE" in
  epic|issue) ;;
  *) echo "error: type must be 'epic' or 'issue', got '$TYPE'" >&2; exit 1 ;;
esac

INBOX_FILE="${PROJECT_ROOT}/inbox/${VERSION}/planning.md"
RELEASE_FILE="${PROJECT_ROOT}/releases/${VERSION}/planning.md"
if [ -f "$INBOX_FILE" ]; then
  PLAN="$INBOX_FILE"
elif [ -f "$RELEASE_FILE" ]; then
  PLAN="$RELEASE_FILE"
else
  echo "error: planning.md not found in inbox/${VERSION}/ or releases/${VERSION}/" >&2
  echo "Part A (intake) must exist before Step 2 — something upstream (Step 0d/Step 1) did not produce it." >&2
  exit 1
fi

if [ ! -s "$PLAN" ]; then
  echo "error: $PLAN exists but is empty" >&2
  exit 1
fi

# Required Part A sections per TYPE, as "heading-keyword|human label".
# The keyword is matched case-insensitively as a substring of a
# "## ..." heading, so it tolerates the template's "[epic only]" /
# "[issue only]" tags being kept or stripped.
if [ "$TYPE" = "epic" ]; then
  REQUIRED=(
    "Problem|Problem Statement"
    "Goals|Goals / Success Criteria"
    "In-Scope|In-Scope"
    "Out-of-Scope|Out-of-Scope"
    "Functional Requirements|Functional Requirements"
  )
else
  REQUIRED=(
    "Problem|Problem Statement"
    "Reproduce|Steps to Reproduce"
    "Expected vs|Expected vs. Actual Behavior"
    "Affected Area|Affected Area / Environment / Severity"
    "Goals|Goals / Success Criteria (expected behavior)"
  )
fi

# section_words <keyword> → prints filled (non-placeholder) word count of
# the matching section's body, or "MISSING" if no such heading exists.
section_words() {
  local kw
  kw="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')"
  awk -v kw="$kw" '
    BEGIN { found=0; capturing=0; words=0 }
    /^##[[:space:]]/ {
      capturing=0
      if (index(tolower($0), kw) > 0) { found=1; capturing=1 }
      next
    }
    capturing {
      line=$0
      tmp=line; gsub(/[[:space:]]/,"",tmp)
      if (tmp ~ /^\{.*\}$/) next            # pure {placeholder} line
      if (line ~ /^[[:space:]]*<!--/) next  # html comment
      if (line ~ /^[[:space:]]*>/) next     # blockquote note
      if (line ~ /^[[:space:]]*\|?[[:space:]]*[-|:[:space:]]+\|?[[:space:]]*$/) next  # table rule
      gsub(/\{[^}]*\}/,"",line)             # drop inline {placeholder} tokens
      n=split(line, a, /[[:space:]]+/)
      for (i=1;i<=n;i++) if (a[i] != "") words++
    }
    END { if (!found) print "MISSING"; else print words }
  ' "$PLAN"
}

FAIL=0
for entry in "${REQUIRED[@]}"; do
  kw="${entry%%|*}"
  label="${entry##*|}"
  result="$(section_words "$kw")"
  if [ "$result" = "MISSING" ]; then
    echo "FAIL: required section missing — '${label}' (no '## …${kw}…' heading in $PLAN)" >&2
    FAIL=1
  elif [ "$result" -lt "$MIN_WORDS" ]; then
    echo "FAIL: section '${label}' looks unfilled — only ${result} words of real content (need ≥ ${MIN_WORDS}); {…} placeholders don't count" >&2
    FAIL=1
  else
    echo "ok: '${label}' — ${result} words" >&2
  fi
done

if [ "$FAIL" -ne 0 ]; then
  echo "" >&2
  echo "error: planning.md Part A is incomplete for $VERSION ($TYPE) — do NOT create the GitHub issue/branch yet." >&2
  echo "Fill the flagged sections in $PLAN with real content, then re-run. See dev-cycle-gap-analysis §1/§6." >&2
  exit 1
fi

if [ "$TYPE" = "epic" ]; then
  TS="${PROJECT_ROOT}/inbox/${VERSION}/test_scenarios.md"
  if [ -f "$TS" ] && [ -s "$TS" ]; then
    echo "ok (optional, present): $TS" >&2
  else
    echo "note (optional): no test_scenarios.md — user stories/test cases are authored in qa.md at Step 3/4 (see §6a)" >&2
  fi
fi

echo "validation passed: planning.md Part A complete for $VERSION ($TYPE)" >&2
exit 0
