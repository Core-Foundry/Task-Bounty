#!/usr/bin/env bash
# Integration check for dependency vulnerability scanning.
# Ensures the local scan script produces the same report artifacts CI uploads.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT_DIR="${ROOT_DIR}/reports/dependency-scan"

echo "==> Running dependency scan"
"${ROOT_DIR}/scripts/run-dependency-scan.sh"

echo "==> Asserting report contents"
assert_file_contains() {
  local file="$1"
  local pattern="$2"
  if ! grep -Eq "${pattern}" "${file}"; then
    echo "ERROR: expected pattern /${pattern}/ in ${file}"
    exit 1
  fi
}

# Frontend text report should mention vulnerabilities or a clean result.
assert_file_contains "${REPORT_DIR}/frontend-pnpm-audit.txt" "vulnerabilit|No known vulnerabilities"

# Frontend JSON must be non-empty JSON object/array
python3 - <<PY
import json, pathlib, sys
path = pathlib.Path("${REPORT_DIR}/frontend-pnpm-audit.json")
data = json.loads(path.read_text() or "null")
if data is None:
    sys.exit("frontend JSON report is empty/null")
print("frontend JSON ok:", type(data).__name__)
PY

# Contract text report should come from cargo-audit
assert_file_contains "${REPORT_DIR}/contract-cargo-audit.txt" "Scanning Cargo.lock|vulnerability|warning|Success"

# Contract JSON must parse
python3 - <<PY
import json, pathlib, sys
path = pathlib.Path("${REPORT_DIR}/contract-cargo-audit.json")
raw = path.read_text().strip()
if not raw:
    sys.exit("contract JSON report is empty")
# cargo audit --json may emit NDJSON or a single object
try:
    json.loads(raw)
except json.JSONDecodeError:
    # NDJSON: validate each non-empty line
    for i, line in enumerate(raw.splitlines(), 1):
        line = line.strip()
        if not line:
            continue
        json.loads(line)
print("contract JSON ok")
PY

# Edge case: empty report directory should fail validation helper
TMP_EMPTY="$(mktemp -d)"
cleanup() { rm -rf "${TMP_EMPTY}"; }
trap cleanup EXIT
if REPORT_DIR="${TMP_EMPTY}" bash -c '
  required=("frontend-pnpm-audit.txt")
  for r in "${required[@]}"; do
    test -s "$REPORT_DIR/$r"
  done
' 2>/dev/null; then
  echo "ERROR: empty-report edge case unexpectedly passed"
  exit 1
fi
echo "empty-report edge case ok"

echo ""
echo "All dependency-scan integration checks passed."
