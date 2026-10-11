#!/usr/bin/env bash
# Fails a PR that changes UI code without Before and After screenshots of the
# running UI (built from this branch), not AI-generated or mock placeholders.
set -euo pipefail

UI_PATHS='^(apps/site|apps/web|apps/desktop|packages/ui)/'
BASE="${BASE_SHA:?}"; HEAD="${HEAD_SHA:?}"

if ! git diff --name-only "$BASE" "$HEAD" | grep -qE "$UI_PATHS"; then
  echo "No UI files changed; skipping Before/After check."
  exit 0
fi

body=$(jq -r '.pull_request.body // ""' "$GITHUB_EVENT_PATH")

section() {
  # Text between "### <name>" and the next heading.
  printf '%s\n' "$body" | awk -v h="### $1" '
    $0 ~ "^"h { on=1; next }
    on && /^#{1,3} / { exit }
    on { print }'
}

# Real media only: markdown images, HTML media, or GitHub user-attachment URLs.
# "New screen" is allowed only for Before (brand-new surface with no prior UI).
has_media() {
  grep -qiE '!\[[^]]*\]\([^)]+\)|<img |<video |https://github\.com/user-attachments/(assets|files)/'
}

missing=()
before_body=$(section "Before")
after_body=$(section "After")

if ! printf '%s\n' "$before_body" | has_media \
  && ! printf '%s\n' "$before_body" | grep -qiE 'New screen'; then
  missing+=("Before")
fi
printf '%s\n' "$after_body" | has_media || missing+=("After")

if [ ${#missing[@]} -gt 0 ]; then
  echo "::error::This PR changes UI files but the description has no screenshot under: ${missing[*]}. Capture Before and After from the running UI on this branch (browser or Playwright), not AI-generated images. See the PR template."
  exit 1
fi
echo "Before and After screenshots found."
