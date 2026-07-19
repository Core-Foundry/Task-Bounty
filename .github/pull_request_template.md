## What
<!-- Brief description of the changes introduced in this PR. -->

## Why
<!-- What problem does this solve? Link the issue below. -->

Closes #

## How
<!-- Key implementation decisions or approach taken. -->

## Testing
<!-- What tests were added or modified? How was this verified? -->

## Breaking Changes
<!-- List any breaking changes, or write "None" if there are none. -->

---

## Checklist

### General
- [ ] Branch is up to date with `main`
- [ ] PR title follows Conventional Commits format (e.g. `feat: add reputation system`)
- [ ] PR description is complete with issue reference (`Closes #<issue-number>`)
- [ ] One logical change per PR (no unrelated changes bundled in)

### Testing
- [ ] Tests added or updated to cover the changes
- [ ] All tests pass (`cargo test` for contracts, `npm run build` for frontend)
- [ ] No compiler warnings (`cargo clippy -- -D warnings`)

### Documentation
- [ ] Public API changes are documented with `///` doc comments (Rust) or JSDoc (TypeScript)
- [ ] `CONTRIBUTING.md`, `README.md`, or other docs updated if needed
- [ ] `CONTRACT_API.md` updated if contract interface changed

### Code Quality
- [ ] Code follows the project style (`cargo fmt` / ESLint)
- [ ] No `any` types introduced in TypeScript
- [ ] No hardcoded secrets, keys, or environment-specific values

### Smart Contract (if applicable)
- [ ] `require_auth()` called on all state-changing operations
- [ ] Events emitted for all state changes
- [ ] Storage keys don't collide with existing keys
- [ ] Deadline and input validation is complete
- [ ] No unintended token transfer paths introduced

### Frontend (if applicable)
- [ ] Components are under 150 lines
- [ ] UI is responsive and accessible
- [ ] Screenshots or recordings included for visual changes
