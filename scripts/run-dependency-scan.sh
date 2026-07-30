#!/usr/bin/env bash
# Local mirror of .github/workflows/dependency-scan.yml
# Generates frontend (pnpm audit) and contract (cargo audit) vulnerability reports.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT_DIR="${ROOT_DIR}/reports/dependency-scan"
mkdir -p "${REPORT_DIR}"

echo "==> Frontend dependency scan (pnpm audit)"
(
  cd "${ROOT_DIR}/frontend"
  set +e
  pnpm audit --json > "${REPORT_DIR}/frontend-pnpm-audit.json" 2> "${REPORT_DIR}/frontend-pnpm-audit.stderr.txt"
  pnpm audit > "${REPORT_DIR}/frontend-pnpm-audit.txt" 2>&1
  FRONTEND_EXIT=$?
  set -e
  echo "frontend audit exit: ${FRONTEND_EXIT}"
)

echo "==> Contract dependency scan (cargo audit)"
if ! command -v cargo-audit >/dev/null 2>&1 && ! cargo audit --version >/dev/null 2>&1; then
  echo "cargo-audit not found. Install with: cargo install cargo-audit --locked"
  echo "or: cargo binstall cargo-audit"
  exit 1
fi

(
  cd "${ROOT_DIR}/contract"
  set +e
  cargo audit --json > "${REPORT_DIR}/contract-cargo-audit.json" 2> "${REPORT_DIR}/contract-cargo-audit.stderr.txt"
  cargo audit > "${REPORT_DIR}/contract-cargo-audit.txt" 2>&1
  CONTRACT_EXIT=$?
  set -e
  echo "contract audit exit: ${CONTRACT_EXIT}"
)

echo "==> Validating reports were generated"
required_reports=(
  "${REPORT_DIR}/frontend-pnpm-audit.json"
  "${REPORT_DIR}/frontend-pnpm-audit.txt"
  "${REPORT_DIR}/contract-cargo-audit.json"
  "${REPORT_DIR}/contract-cargo-audit.txt"
)

for report in "${required_reports[@]}"; do
  if [[ ! -s "${report}" ]]; then
    echo "ERROR: missing or empty report: ${report}"
    exit 1
  fi
  echo "ok: ${report} ($(wc -c < "${report}" | tr -d ' ') bytes)"
done

echo ""
echo "Dependency scan reports written to: ${REPORT_DIR}"
echo "Note: non-zero audit exit codes indicate findings; reports are still generated."
