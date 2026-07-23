# Architecture Decision Records (ADR)

This directory contains Architecture Decision Records for the TaskBounty project.

An ADR documents a significant architectural decision made during the development of the project — including the context, the options considered, the decision made, and its consequences.

## Index

| ID | Title | Status |
|----|-------|--------|
| [ADR-0001](0001-use-soroban-smart-contracts.md) | Use Soroban Smart Contracts on Stellar | Accepted |
| [ADR-0002](0002-modular-contract-structure.md) | Modular Contract Source Structure | Accepted |
| [ADR-0003](0003-persistent-storage-strategy.md) | Persistent Storage Strategy | Accepted |
| [ADR-0004](0004-frontend-framework-selection.md) | Frontend Framework Selection | Accepted |
| [ADR-0005](0005-input-validation-approach.md) | Input Validation Approach | Accepted |

## How to Create a New ADR

1. Copy `TEMPLATE.md` to a new file named `NNNN-short-title.md` (zero-padded 4-digit number).
2. Fill in every section. "Proposed" is the initial status.
3. Submit a PR. The status moves to "Accepted" or "Rejected" after review.
4. Add the new entry to the index table above.

## ADR Lifecycle

```
Proposed → Accepted
         → Rejected
         → Deprecated (replaced by a newer ADR)
         → Superseded by ADR-XXXX
```
