# Contributing to TaskBounty

Thank you for your interest in contributing to TaskBounty — a decentralized task and reward board built on Stellar using Soroban smart contracts. This document covers everything you need to get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Before You Start](#before-you-start)
- [Development Setup](#development-setup)
- [Branch Naming Conventions](#branch-naming-conventions)
- [Commit Message Standards](#commit-message-standards)
- [Development Workflow](#development-workflow)
- [Pull Request Requirements](#pull-request-requirements)
- [Issue Reporting Guidelines](#issue-reporting-guidelines)
- [Code Review Expectations](#code-review-expectations)
- [Code Style](#code-style)

---

## Code of Conduct

- Be respectful and inclusive
- Provide constructive, actionable feedback
- Communicate early if you're blocked — create a draft PR rather than going silent
- Maximum ETA for claimed issues: **48 hours**. After 24 hours, a draft PR or progress update is expected

---

## Before You Start

1. Check [open issues](../../issues) to avoid duplicate work
2. Comment on the issue you want to work on and wait for assignment
3. Read [SETUP.md](./SETUP.md) to get your environment ready
4. Read [CONTRACT_API.md](./CONTRACT_API.md) to understand the contract interface

---

## Development Setup

See [SETUP.md](./SETUP.md) for full instructions. Quick summary:

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add WebAssembly target
rustup target add wasm32-unknown-unknown

# Install Stellar CLI
cargo install --locked stellar-cli --features opt

# Clone and build
git clone https://github.com/<your-username>/Task-Bounty.git
cd Task-Bounty/contract
stellar contract build

# Run tests
cargo test
```

---

## Branch Naming Conventions

```
<type>/<short-description>
```

| Type | Use for |
|------|---------|
| `feature/` | New functionality |
| `fix/` | Bug fixes |
| `docs/` | Documentation only changes |
| `refactor/` | Code restructuring without behavior change |
| `test/` | Adding or updating tests |
| `chore/` | Tooling, CI, dependency updates |

**Examples:**
```
feature/reputation-system
fix/deadline-validation
docs/contract-api
refactor/storage-helpers
```

---

## Commit Message Standards

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short description>

[optional body]
```

**Types:** `feat`, `fix`, `docs`, `test`, `refactor`, `chore`

**Examples:**
```bash
feat: add milestone-based task support
fix: prevent double-submission from same contributor
docs: add contract API reference
test: add dispute resolution edge cases
refactor: extract token transfer logic to helper
chore: update soroban-sdk to 21.0.0
```

Rules:
- Use **imperative mood**: "add" not "added"
- Keep subject line under 72 characters
- Reference issue numbers in the body: `Closes #42`

---

## Development Workflow

### 1. Fork and clone

```bash
git clone https://github.com/<your-username>/Task-Bounty.git
cd Task-Bounty
git remote add upstream https://github.com/<org>/Task-Bounty.git
```

### 2. Create a branch

```bash
git checkout -b feature/your-feature-name
```

### 3. Make changes

**Smart contract changes (`contract/`):**
- Write clean, modular Rust code
- Add doc comments (`///`) to all public functions
- Follow the existing module structure (`task.rs`, `submission.rs`, etc.)
- Run `cargo clippy` and fix all warnings before committing

**Frontend changes (`frontend/`):**
- Maximum 150 lines per component
- Use TypeScript types — no `any`
- Match the existing component structure
- Ensure responsive design

### 4. Write tests

All contract changes require tests in `src/test.rs`:

```rust
#[test]
fn test_your_feature() {
    let env = Env::default();
    // setup
    // execute
    // assert
}
```

### 5. Verify

```bash
# Contract
cargo test
cargo clippy -- -D warnings

# Frontend
cd frontend
npm run lint
npm run build
```

### 6. Commit and push

```bash
git add <specific-files>
git commit -m "feat: your feature description"
git push origin feature/your-feature-name
```

---

## Pull Request Requirements

### Title

Same format as commit messages: `feat: add reputation system`

### Description must include

```markdown
## What
Brief description of the changes.

## Why
What problem does this solve? Link the issue: Closes #<issue-number>

## How
Key implementation decisions or approach.

## Testing
What tests were added or modified?

## Breaking Changes
List any breaking changes (or "None").
```

### Checklist before requesting review

- [ ] Tests added/updated and passing (`cargo test`)
- [ ] No compiler warnings (`cargo clippy`)
- [ ] Documentation updated if public API changed
- [ ] PR description complete with issue reference
- [ ] Branch is up to date with `main`
- [ ] Screenshots/recordings included for UI changes

### Scope

Keep PRs focused. One logical change per PR. Large features should be split into smaller, reviewable pieces.

---

## Issue Reporting Guidelines

### Bug reports

Use the **Bug Report** template and include:

1. **Description** — What happened vs. what you expected
2. **Steps to reproduce** — Minimal steps to trigger the bug
3. **Environment** — OS, Rust version (`rustc --version`), Stellar CLI version (`stellar --version`)
4. **Logs/errors** — Paste relevant error output in a code block

### Feature requests

Use the **Feature Request** template and include:

1. **Problem** — What pain point does this address?
2. **Proposed solution** — How should it work?
3. **Alternatives** — Other approaches you considered
4. **Scope** — Is this a contract change, frontend change, or both?

### Getting help

If you're stuck during implementation:
1. Create a **draft PR** with your current progress
2. Tag the maintainer in the PR description
3. Describe the specific blocker
4. Do **not** ask for help in issue comments

---

## Code Review Expectations

### For contributors

- Respond to review comments within 24 hours
- Don't push force-push over a review in progress — add new commits
- If you disagree with feedback, explain your reasoning; don't just ignore it
- Mark resolved threads as resolved

### For reviewers

- Review within 48 hours of assignment
- Test contract logic locally for non-trivial changes
- Focus on correctness, security, and maintainability — not style preferences
- Approve explicitly when ready; don't leave PRs in limbo

### Review focus areas for Soroban contracts

- `require_auth()` called on all state-changing operations
- No unintended token transfer paths
- Correct status transition guards
- Events emitted for all state changes
- Storage keys don't collide
- Deadline and input validation complete

---

## Code Style

### Rust / Soroban

- Use `///` doc comments on all public functions
- Follow `rustfmt` formatting (`cargo fmt`)
- Prefer explicit error types (`Error` enum) over panics
- Use `symbol_short!` for event topics

### TypeScript / Next.js

- Use functional components with TypeScript
- Name components in PascalCase, files matching component name
- Co-locate component-specific types in the same file
- Use `const` arrow functions for event handlers

---

## License

By contributing, you agree your contributions will be licensed under the [MIT License](./LICENSE).
