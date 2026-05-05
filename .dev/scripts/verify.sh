#!/usr/bin/env bash
# Single entry-point for the AGENTS.md "Full check" verification.
# Supports: --backend-only, --frontend-only, --help
# Prints "VERIFY: OK" on full success so agents can grep it.

set -u

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT" || exit 2

MODE="all"
for arg in "$@"; do
  case "$arg" in
    --backend-only)  MODE="backend"  ;;
    --frontend-only) MODE="frontend" ;;
    -h|--help)
      cat <<EOF
Usage: bash .dev/scripts/verify.sh [--backend-only|--frontend-only]

Steps run (mode=all):
  1. ESLint            (npm run lint)
  2. TypeScript check  (npm run typecheck)
  3. Vitest            (npm run test)
  4. Next.js build     (npm run build)

--backend-only  -> steps 1, 2, 3 (server logic, API, schemas)
--frontend-only -> steps 1, 2, 4 (component types + production build)
EOF
      exit 0
      ;;
  esac
done

FAILED=0
run_step() {
  local label="$1"; shift
  echo "==> ${label}"
  if "$@"; then
    echo "    ${label}: ok"
  else
    echo "    ${label}: FAIL"
    FAILED=1
  fi
}

case "$MODE" in
  all)
    run_step "lint"       npm run -s lint
    run_step "typecheck"  npm run -s typecheck
    run_step "test"       npm run -s test
    run_step "build"      npm run -s build
    ;;
  backend)
    run_step "lint"       npm run -s lint
    run_step "typecheck"  npm run -s typecheck
    run_step "test"       npm run -s test
    ;;
  frontend)
    run_step "lint"       npm run -s lint
    run_step "typecheck"  npm run -s typecheck
    run_step "build"      npm run -s build
    ;;
  *)
    echo "unknown mode: $MODE" >&2
    exit 2
    ;;
esac

if [ "$FAILED" -eq 0 ]; then
  echo "VERIFY: OK"
  exit 0
fi
echo "VERIFY: FAIL"
exit 1
