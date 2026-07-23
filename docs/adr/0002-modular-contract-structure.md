# ADR-0002: Modular Contract Source Structure

- **Status:** Accepted
- **Date:** 2025-01-15
- **Author(s):** TaskBounty Core Team

## Context

As the contract grew beyond a single file it became hard to navigate, review, and test in isolation. We needed a source layout convention that keeps concerns separated while remaining compatible with Soroban's single-contract compilation model.

## Decision Drivers

- Reviewers should be able to audit one concern (e.g. error types, storage keys) without reading the entire file
- Logic changes should not require touching type definitions
- Test files should be clearly separated from production code
- The layout must compile to a single WASM binary (Soroban requirement)

## Options Considered

### Option A: Single `lib.rs` file

All types, logic, and tests in one file.

- **Pros:** Simple; no module path confusion
- **Cons:** Unmanageable as the contract grows; hard to review; merge conflicts on every change

### Option B: Flat module files at `src/` root

Separate files for `types.rs`, `errors.rs`, `logic.rs`, etc., all declared in `lib.rs`.

- **Pros:** Clear separation; easy to navigate
- **Cons:** No namespace grouping; file list grows flat

### Option C: Grouped sub-modules (`base/`, `interfaces/`, `tests/`)

Organise files into sub-directories:
- `src/base/` — foundational types, errors, events
- `src/interfaces/` — trait definitions for external integrators
- `src/tests/` — all test files, referenced via `#[path]` attributes

- **Pros:** Clear ownership of each concern; interfaces act as living documentation; tests are isolated
- **Cons:** Slightly more verbose module declarations in `lib.rs`

## Decision

**Chosen option: Option C — grouped sub-modules**, because it scales well as the contract adds features, makes auditing straightforward (reviewers go to `base/errors.rs` for all error codes), and keeps the interface trait as a compile-time contract against the implementation.

## Consequences

### Positive

- `base/types.rs` is the single source of truth for all on-chain data structures
- `interfaces/autoshare.rs` serves as documentation and compile-time API contract
- Test helpers in `tests/test_utils.rs` are reusable across all test modules
- New features add a new file rather than growing an existing one

### Negative / Trade-offs

- Requires `#[path = "tests/..."]` attributes in `lib.rs` to link test modules, which is non-standard Rust
- New contributors need to understand the module layout before contributing

### Neutral

- All modules compile into a single WASM binary; the directory structure has no runtime cost

## Links

- [Rust module system documentation](https://doc.rust-lang.org/book/ch07-02-defining-modules-to-control-scope-and-privacy.html)
- [Soroban contract examples](https://github.com/stellar/soroban-examples)
