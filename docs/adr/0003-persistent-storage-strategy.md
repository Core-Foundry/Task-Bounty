# ADR-0003: Persistent Storage Strategy

- **Status:** Accepted
- **Date:** 2025-02-01
- **Author(s):** TaskBounty Core Team

## Context

Soroban provides three storage tiers — `persistent`, `temporary`, and `instance` — each with different TTL (time-to-live) and cost characteristics. We needed to decide which tier to use for each category of contract data (groups, members, payment history, admin config).

## Decision Drivers

- Group and member data must survive across ledger windows — data loss would mean lost funds
- Payment history must be immutable and permanently accessible for audit purposes
- Storage cost should not make the contract prohibitively expensive to operate
- Admin and configuration data must always be accessible

## Options Considered

### Option A: All data in `instance` storage

Store everything on the contract instance entry.

- **Pros:** Simple; single TTL to manage
- **Cons:** Instance storage has a fixed size limit; unsuitable for unbounded lists like payment history; all data is evicted together

### Option B: Mix of `temporary` and `persistent`

Use `temporary` for short-lived data (e.g. pending states) and `persistent` for records.

- **Pros:** Cost-efficient for ephemeral data
- **Cons:** Temporary data can be evicted unexpectedly, creating edge cases; complex TTL management

### Option C: All data in `persistent` storage with typed `DataKey` enum

Use `persistent` storage for all contract data, keyed by a typed `DataKey` enum variant.

- **Pros:** Data survives indefinitely (subject to rent); typed keys prevent key collisions; straightforward reasoning about what is stored; audit trail is always available
- **Cons:** Higher ledger rent cost compared to temporary storage; requires periodic rent bump for long-lived contracts

## Decision

**Chosen option: Option C — all persistent storage with typed DataKey**, because financial data (escrow amounts, payment history, membership) must never be silently evicted. The `DataKey` enum provides compile-time safety against key collisions, and the cost of persistent storage is acceptable given Stellar's low base fees.

## Consequences

### Positive

- No risk of accidental data eviction for group records or payment history
- `DataKey` variants make storage access self-documenting and refactor-safe
- Consistent pattern across all storage reads and writes reduces bugs

### Negative / Trade-offs

- Long-lived contracts will accumulate ledger rent; a rent-bump mechanism should be considered for production
- Unbounded lists (e.g. `AllGroups`, payment history) will grow over time and increase storage costs

### Neutral

- Storage reads (`get`) and writes (`set`) follow the same pattern throughout the codebase, making code review straightforward

## Links

- [Soroban storage documentation](https://developers.stellar.org/docs/learn/smart-contract-internals/storage)
- [Ledger TTL and rent documentation](https://developers.stellar.org/docs/learn/smart-contract-internals/fees-and-metering)
