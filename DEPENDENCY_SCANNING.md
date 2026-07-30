# Dependency Vulnerability Scanning

TaskBounty runs automated dependency vulnerability scanning in CI so maintainers are notified when vulnerable packages appear in the frontend (npm/pnpm) or contract (Cargo) dependency trees.

## Acceptance overview

| Criterion | How it is met |
|-----------|----------------|
| Scanner configured | `pnpm audit` (frontend) and `cargo audit` (contract) in CI; Dependabot for ongoing updates |
| Runs in CI | [`.github/workflows/dependency-scan.yml`](./.github/workflows/dependency-scan.yml) |
| Reports generated | JSON + text artifacts uploaded on every run; job summaries on the Actions page |
| Documentation updated | This guide + links from [`FRONTEND_CI_GUIDE.md`](./FRONTEND_CI_GUIDE.md) and [`CONTRIBUTING.md`](./CONTRIBUTING.md) |

## Workflow

**File:** [`.github/workflows/dependency-scan.yml`](./.github/workflows/dependency-scan.yml)

### Triggers

- Pull requests targeting `main`
- Pushes to `main`
- Weekly schedule (Monday 08:00 UTC)
- Manual `workflow_dispatch`

### Jobs

1. **Frontend Dependency Scan**
   - Installs frontend deps with `pnpm install --frozen-lockfile`
   - Runs `pnpm audit` (human-readable) and `pnpm audit --json`
   - Uploads artifact: `frontend-dependency-scan-reports`
   - Writes a GitHub Actions job summary for maintainers

2. **Contract Dependency Scan**
   - Installs `cargo-audit`
   - Runs `cargo audit` and `cargo audit --json` against `contract/Cargo.lock`
   - Uploads artifact: `contract-dependency-scan-reports`
   - Writes a GitHub Actions job summary for maintainers

### Report policy

Advisory findings are **reported**, not used as a hard merge blocker by default. Existing transitive advisories must not fail unrelated PRs. The workflow **does** fail if the scanner cannot produce report files (scanner/tooling breakage).

Maintainers should review:

1. The Actions job summary on each run
2. Downloaded artifacts under **Actions → run → Artifacts**
3. Dependabot PRs labeled `dependencies` / `security`

## Dependabot

**File:** [`.github/dependabot.yml`](./.github/dependabot.yml)

Weekly update PRs for:

- `npm` ecosystem in `/frontend`
- `cargo` ecosystem in `/contract`
- `github-actions` at the repository root

This is the primary ongoing notification channel for maintainers when vulnerable or outdated packages need upgrades.

## Local usage

```bash
# Requires: pnpm (frontend), cargo-audit (contract)
#   cargo install cargo-audit --locked
#   # or: cargo binstall cargo-audit

chmod +x scripts/run-dependency-scan.sh
./scripts/run-dependency-scan.sh
```

Reports are written to `reports/dependency-scan/`:

- `frontend-pnpm-audit.json` / `frontend-pnpm-audit.txt`
- `contract-cargo-audit.json` / `contract-cargo-audit.txt`

Validate report generation (integration check used in the self-correction loop):

```bash
./scripts/test-dependency-scan.sh
```

## Related CI

- Frontend build/lint: [`.github/workflows/frontend-ci.yml`](./.github/workflows/frontend-ci.yml) — see [`FRONTEND_CI_GUIDE.md`](./FRONTEND_CI_GUIDE.md)
- Contract fmt/build/test/clippy: [`.github/workflows/contract-ci.yml`](./.github/workflows/contract-ci.yml)

## References

- [pnpm audit](https://pnpm.io/cli/audit)
- [cargo-audit / RustSec](https://github.com/rustsec/rustsec/tree/main/cargo-audit)
- [GitHub Dependabot](https://docs.github.com/en/code-security/dependabot)
- [upload-artifact](https://github.com/actions/upload-artifact)
