#!/usr/bin/env bash
# Integration check: security headers are configured and applied by Next.js.
# Verifies unit tests, production build, and live response headers.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="${ROOT_DIR}/frontend"
PORT="${SECURITY_HEADERS_TEST_PORT:-3010}"
SERVER_PID=""

cleanup() {
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "==> Unit tests (security-headers.test.mjs)"
cd "${FRONTEND_DIR}"
node --test security-headers.test.mjs

# Prefer local binaries. Paths with ":" (e.g. some local worktrees) break
# package-manager PATH injection for `pnpm build` / `next`.
NEXT_BIN="${FRONTEND_DIR}/node_modules/.bin/next"
if [[ ! -x "${NEXT_BIN}" ]]; then
  echo "ERROR: Next.js binary not found at ${NEXT_BIN}"
  echo "Run: cd frontend && pnpm install"
  exit 1
fi

echo "==> Production build"
"${NEXT_BIN}" build

echo "==> Starting Next.js on port ${PORT}"
PORT="${PORT}" "${NEXT_BIN}" start --port "${PORT}" >/tmp/taskbounty-security-headers-server.log 2>&1 &
SERVER_PID=$!

echo "==> Waiting for server readiness"
READY=0
for _ in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
    READY=1
    break
  fi
  if ! kill -0 "${SERVER_PID}" 2>/dev/null; then
    echo "ERROR: Next.js server exited early. Log:"
    cat /tmp/taskbounty-security-headers-server.log || true
    exit 1
  fi
  sleep 1
done

if [[ "${READY}" -ne 1 ]]; then
  echo "ERROR: server did not become ready on port ${PORT}"
  cat /tmp/taskbounty-security-headers-server.log || true
  exit 1
fi

echo "==> Asserting response headers"
HEADERS_FILE="$(mktemp)"
curl -sI "http://127.0.0.1:${PORT}/" >"${HEADERS_FILE}"

assert_header() {
  local name="$1"
  local pattern="$2"
  if ! grep -iE "^${name}:.*${pattern}" "${HEADERS_FILE}" >/dev/null; then
    echo "ERROR: expected header ${name} matching /${pattern}/"
    echo "--- response headers ---"
    cat "${HEADERS_FILE}"
    exit 1
  fi
  echo "ok: ${name}"
}

assert_header "Content-Security-Policy" "default-src"
assert_header "Strict-Transport-Security" "max-age="
assert_header "X-Content-Type-Options" "nosniff"
assert_header "X-Frame-Options" "SAMEORIGIN"
assert_header "Referrer-Policy" "strict-origin-when-cross-origin"
assert_header "Permissions-Policy" "camera="

# Edge case: empty / missing header name must not match as present
if grep -iE "^: " "${HEADERS_FILE}" >/dev/null 2>&1; then
  echo "ERROR: empty header name unexpectedly present"
  exit 1
fi
echo "ok: empty-header-name edge case"

# Compatibility: CSP must still allow fonts + Horizon used by the app
CSP_LINE="$(grep -iE '^Content-Security-Policy:' "${HEADERS_FILE}" || true)"
if ! echo "${CSP_LINE}" | grep -Eq "fonts\.googleapis\.com"; then
  echo "ERROR: CSP missing fonts.googleapis.com (app uses Google Fonts)"
  exit 1
fi
if ! echo "${CSP_LINE}" | grep -Eq "horizon\.stellar\.org"; then
  echo "ERROR: CSP missing horizon.stellar.org (app fetches Horizon)"
  exit 1
fi
echo "ok: CSP compatibility origins"

rm -f "${HEADERS_FILE}"

echo ""
echo "All security-headers checks passed."
