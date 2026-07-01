# ADR-0002: Keep reward escrow in the smart contract

## Status

Accepted

## Context

TaskBounty exists to reduce trust requirements between the task poster and the contributor. If funds remain fully off-chain until manual payout, contributors still face counterparty risk even if task tracking is public.

## Decision

Escrow the reward in the smart contract at task creation time and release or refund funds through contract-controlled flows.

## Rationale

- It gives contributors stronger assurance that the reward exists before they start work.
- Approval, rejection, cancellation, and dispute outcomes can be enforced consistently by contract logic.
- Escrow state can be audited on-chain instead of relying on manual bookkeeping.

## Alternatives Considered

### Off-chain payment after completion

- Pros: simpler implementation
- Cons: weak payout guarantees and more room for disputes over whether funds were ever reserved

### Hybrid escrow with a centralized admin wallet

- Pros: more operational flexibility
- Cons: introduces an extra trusted actor and operational security burden

## Consequences

- Task creation must validate and transfer reward funds up front.
- Contract APIs and events need to make escrow state transitions explicit.
- Bugs in payout logic have direct financial implications and should be treated as high-risk changes.
