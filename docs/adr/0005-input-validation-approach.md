# ADR-0005: Input Validation Approach

- **Status:** Accepted
- **Date:** 2025-03-01
- **Author(s):** TaskBounty Core Team

## Context

Smart contract functions are public entrypoints callable by any account on the network. Without explicit input validation, malformed or malicious inputs can corrupt contract state, cause unexpected panics, or silently accept invalid data. We needed a consistent strategy for validating inputs across all public contract functions.

## Decision Drivers

- Invalid inputs must be rejected with a specific, identifiable error code — not a silent no-op or opaque panic
- Validation must happen before any state mutation or token transfer
- Error codes must be stable (not change across upgrades) so clients can handle them reliably
- Validation logic should be co-located with the function it protects, not scattered

## Options Considered

### Option A: Panic with string messages

Use `panic!("invalid input")` or `assert!()` with string messages.

- **Pros:** Simple to write
- **Cons:** String panics are not machine-readable; clients cannot distinguish error types; messages are not stable across versions

### Option B: Return `Result<T, Error>` with a typed `contracterror` enum, validate at the top of each function

Use Soroban's `#[contracterror]` macro to define a typed error enum. Each function validates all inputs at the start and returns `Err(Error::VariantName)` on failure, before touching any storage.

- **Pros:** Machine-readable error codes; stable across upgrades; validation is co-located with logic; easy to test specific error cases
- **Cons:** Slightly more boilerplate than panics

### Option C: Centralised validation middleware

Extract all validation into a single `validate_*` helper per function, called from a central dispatcher.

- **Pros:** DRY for shared validation rules
- **Cons:** Indirection makes the logic harder to follow; overkill for a contract of this size

## Decision

**Chosen option: Option B — typed `contracterror` enum with early-return validation at the top of each function**, because it gives clients stable, machine-readable error codes, makes the happy path clear (all checks pass before any mutation), and keeps validation close to the logic it protects. Shared rules (e.g. member percentage validation) are extracted into private helper functions.

## Consequences

### Positive

- Every invalid input produces a specific `Error` variant with a stable `u32` code
- Clients (frontend, tests, external integrators) can match on specific error codes
- State is never mutated on invalid input — validation always runs first
- The `#[contracterror]` enum serves as documentation of all possible failure modes

### Negative / Trade-offs

- Each new function requires explicitly listing its validation checks
- Error codes must never be renumbered once deployed to preserve client compatibility

### Neutral

- The `contracterror` repr values are part of the contract's public ABI and are documented in `CONTRACT_API.md`

## Links

- [Soroban error handling documentation](https://developers.stellar.org/docs/build/smart-contracts/example-contracts/errors)
- [Issue #45 — security: validate incoming API requests](https://github.com/susanyusuf/Task-Bounty/issues/45)
