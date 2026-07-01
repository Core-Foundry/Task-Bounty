# ADR-0001: Use Stellar Soroban for bounty contracts

## Status

Accepted

## Context

TaskBounty needs a smart-contract platform that can hold rewards in escrow, process approvals and refunds, and keep the full task lifecycle transparent for contributors and task posters.

The platform should also be approachable for a small team building in Rust and should not make low-value bounties economically impractical through transaction fees.

## Decision

Use Stellar Soroban as the smart-contract runtime for the TaskBounty contract system.

## Rationale

- Soroban supports Rust-based contract development, which fits the repository's contract implementation.
- Stellar transaction costs are low enough to keep smaller bounty flows viable.
- Fast finality improves the user experience for submissions, approvals, and payout confirmation.
- Native asset support and token interfaces make it practical to handle XLM and compatible Stellar assets.

## Alternatives Considered

### Ethereum mainnet

- Pros: mature ecosystem, familiar contract patterns
- Cons: higher transaction costs would make small task payouts harder to justify

### Centralized escrow service

- Pros: simpler operational model at the start
- Cons: undermines the trustless payout goal and introduces custodial risk

### Non-blockchain task board

- Pros: lowest implementation complexity
- Cons: does not satisfy the project's core goal of transparent, trust-minimized rewards

## Consequences

- Contributors should expect blockchain-specific concepts such as token addresses, finality, and wallet signing to remain central to the design.
- Contract changes need careful review because core business rules live on-chain.
- Tooling and local setup depend on Soroban and the Stellar CLI.
