#!/bin/bash
# Double-click (or run) on macOS to start Dopple locally with PostgreSQL from Homebrew.
# Starts: Postgres 17 (brew service), the API on :3000 and the website on :3100.
# Close this window or press Ctrl+C to stop the API and website (Postgres keeps running).
set -uo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
mkdir -p .run
LOG="$ROOT/.run/setup.log"
exec > >(tee "$LOG") 2>&1

step() { printf '\n==> %s\n' "$*"; }
fail() { printf '\n✗ %s\n' "$*"; echo "DOPPLE_STATUS=failed" >> "$LOG"; read -r -p "Press Enter to close…"; exit 1; }

step "Checking Homebrew"
if ! command -v brew >/dev/null 2>&1; then
  for b in /opt/homebrew/bin/brew /usr/local/bin/brew; do [ -x "$b" ] && eval "$("$b" shellenv)"; done
fi
command -v brew >/dev/null 2>&1 || fail "Homebrew is not installed. Install it from https://brew.sh, then double-click this file again."
brew --version | head -1

step "Checking Node.js (need 22.12 or newer)"
need_node=1
if command -v node >/dev/null 2>&1; then
  v=$(node -p 'process.versions.node')
  node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=12)?0:1)' && need_node=0
  echo "found node $v"
fi
if [ $need_node = 1 ]; then
  brew install node@22 || fail "Could not install Node 22"
  export PATH="$(brew --prefix node@22)/bin:$PATH"
fi
node --version

step "Checking PostgreSQL 17"
if ! brew list postgresql@17 >/dev/null 2>&1; then
  brew install postgresql@17 || fail "Could not install PostgreSQL 17"
fi
export PATH="$(brew --prefix postgresql@17)/bin:$PATH"
brew services start postgresql@17 >/dev/null 2>&1 || true
for i in $(seq 1 30); do pg_isready -q -h localhost && break; sleep 1; done
pg_isready -h localhost || fail "PostgreSQL did not start (try: brew services restart postgresql@17)"

step "Preparing the dopple database"
# Homebrew's superuser is your macOS user. The API must connect as a NON-superuser (dopple_app)
# so that row-level security applies; migrations run as the database owner (dopple).
psql -h localhost -d postgres -tAc "select 1 from pg_roles where rolname='dopple'" | grep -q 1 ||
  psql -h localhost -d postgres -c "create role dopple login password 'dopple'"
psql -h localhost -d postgres -tAc "select 1 from pg_database where datname='dopple'" | grep -q 1 ||
  psql -h localhost -d postgres -c "create database dopple owner dopple"
psql -h localhost -d postgres -tAc "select 1 from pg_roles where rolname='dopple_app'" | grep -q 1 ||
  psql -h localhost -d postgres -c "create role dopple_app login password 'dopple_app'"
psql -h localhost -U dopple -d dopple -q -c "grant usage on schema public to dopple_app; alter default privileges in schema public grant select, insert, update, delete on tables to dopple_app;" ||
  fail "Could not grant privileges to dopple_app"

step "Installing packages (pnpm via corepack)"
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# Project scripts call `pnpm` by name, so put a small pnpm shim (backed by corepack) on PATH.
# This avoids `corepack enable`, which can need admin rights.
if ! command -v pnpm >/dev/null 2>&1; then
  mkdir -p "$ROOT/.run/bin"
  printf '#!/bin/sh\nexec corepack pnpm "$@"\n' > "$ROOT/.run/bin/pnpm"
  chmod +x "$ROOT/.run/bin/pnpm"
  export PATH="$ROOT/.run/bin:$PATH"
fi
PNPM="pnpm"
$PNPM --version || fail "pnpm (via corepack) is not available"
$PNPM install || fail "pnpm install failed"

step "Environment files"
[ -f apps/api/.env ] || cp apps/api/.env.example apps/api/.env
[ -f apps/site/.env.local ] || printf 'DOPPLE_API_URL=http://localhost:3000\n# Show the partner wall with the two demo schools while developing.\nSHOWCASE_MIN_SCHOOLS=1\n' > apps/site/.env.local

step "Migrating and seeding"
$PNPM db:migrate || fail "Migrations failed"
$PNPM db:seed || fail "Seeding failed"

step "Starting the API (:3000) and website (:3100)"
lsof -ti tcp:3000 -ti tcp:3100 2>/dev/null | xargs kill 2>/dev/null; sleep 1
# No local Grafana here, so don't try to export telemetry.
export OTEL_TRACES_EXPORTER=none OTEL_METRICS_EXPORTER=none
$PNPM --filter @dopple/api start > .run/api.log 2>&1 &
API_PID=$!
$PNPM --filter @dopple/site dev > .run/site.log 2>&1 &
SITE_PID=$!
stop() {
  echo; echo "Stopping…"
  kill $API_PID $SITE_PID 2>/dev/null
  # pnpm starts child processes; free the ports so nothing is left running.
  lsof -ti tcp:3000 -ti tcp:3100 2>/dev/null | xargs kill 2>/dev/null
  exit 0
}
trap stop INT TERM HUP

for i in $(seq 1 90); do curl -sf localhost:3000/health/live >/dev/null && break; sleep 1; done
curl -sf localhost:3000/health/live >/dev/null || fail "API did not start. See .run/api.log"
for i in $(seq 1 90); do curl -sf -o /dev/null localhost:3100/ && break; sleep 1; done
curl -sf -o /dev/null localhost:3100/ || fail "Website did not start. See .run/site.log"

echo "DOPPLE_STATUS=running" >> "$LOG"
cat <<MSG

✓ Dopple is running
  Website:      http://localhost:3100
  API health:   http://localhost:3000/health/ready
  Demo school:  curl -H "Host: greenfield.dopple.localhost" localhost:3000/students

  Logs: .run/api.log and .run/site.log
  Close this window or press Ctrl+C to stop.
MSG
open "http://localhost:3100"
wait
