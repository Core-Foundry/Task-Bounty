# ADR-0001: Use Soroban Smart Contracts on Stellar

- **Status:** Accepted
- **Date:** 2025-01-01
- **Author(s):** TaskBounty Core Team

## Context

TaskBounty requires a trustless escrow mechanism to hold bounty rewards between task creation and payout. The core requirement is that neither the poster nor the contributor can unilaterally access funds — payment must be conditional on an approved submission or a dispute resolution outcome.

We needed to choose a blockchain platform and smart contract runtime to implement this escrow logic.

## Decision Drivers

- Low transaction fees to keep micro-bounties economically viable
- Fast finality so users see outcomes quickly
- A modern, auditable smart contract runtime
- Native token support without bridging complexity
- Strong developer tooling and documentation

## Options Considered

### Option A: Ethereum / EVM (Solidity)

Deploy on Ethereum mainnet or an EVM-compatible L2 (Arbitrum, Base).

- **Pros:** Large ecosystem, many auditors, battle-tested patterns
- **Cons:** High gas fees on mainnet; L2s add bridging complexity; Solidity has well-known footguns

### Option B: Stellar + Soroban (Rust/WASM)

Deploy smart contracts on Stellar using the Soroban runtime.

- **Pros:** ~$0.0001 per transaction; 3–5 second finality; built-in DEX and token primitives; Rust type safety; WASM determinism; excellent CLI tooling
- **Cons:** Younger ecosystem; fewer auditors than Ethereum; Soroban SDK still maturing

### Option C: Solana (Rust)

Deploy programs on Solana using the Anchor framework.

- **Pros:** High throughput; low fees; Rust-based
- **Cons:** Complex account model increases audit surface; network has experienced outages; less suitable for financial escrow patterns

## Decision

**Chosen option: Option B — Stellar + Soroban**, because the fee structure makes small bounties (< 1 XLM) economically viable, finality is fast enough for a good UX, and Rust/WASM provides the type safety and determinism needed for financial contract logic. The Stellar network's built-in token interface (SAC) also removes the need for a custom ERC-20-style implementation.

## Consequences

### Positive

- Transaction fees are fractions of a cent, enabling micro-bounties
- 3–5 second confirmation time gives users near-instant feedback
- Rust's type system catches many contract bugs at compile time
- Native XLM support via SAC requires no custom token contracts

### Negative / Trade-offs

- Soroban ecosystem is younger; fewer third-party libraries and auditors available
- Contributors must use Stellar-compatible wallets (Freighter, LOBSTR, etc.)
- Contract storage model differs from EVM; team needed to learn Soroban-specific patterns

### Neutral

- The contract is compiled to WASM, which is portable and deterministic across network nodes

## Links

- [Soroban Developer Documentation](https://developers.stellar.org/docs/build/smart-contracts)
- [Stellar Network Overview](https://developers.stellar.org/docs/learn/fundamentals)
- [soroban-sdk crate](https://crates.io/crates/soroban-sdk)
