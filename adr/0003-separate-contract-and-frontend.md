# ADR-0003: Separate contract and frontend workspaces

## Status

Accepted

## Context

The repository includes both Soroban contracts and a Next.js frontend. These parts move at different speeds, use different toolchains, and are validated with different commands.

## Decision

Keep the smart contract and frontend as separate workspaces within a single repository.

## Rationale

- Rust and Next.js have distinct dependency graphs and build pipelines.
- Contributors can work on one surface without needing to understand every detail of the other immediately.
- A monorepo still makes it easier to evolve interfaces, docs, and deployment guidance together.

## Alternatives Considered

### Single merged application workspace

- Pros: fewer top-level directories
- Cons: blurs ownership boundaries and makes tooling harder to reason about

### Separate repositories

- Pros: stronger isolation
- Cons: harder cross-repo coordination for interface changes and contributor onboarding

## Consequences

- Documentation should clearly point contributors to the right workspace for their changes.
- Shared concepts such as contract IDs and network configuration must be documented carefully at the repository root.
- CI may need contract-specific and frontend-specific checks instead of one universal pipeline.
