# ADR-0004: Support multiple submissions with dispute resolution

## Status

Accepted

## Context

TaskBounty is not just a one-to-one freelance workflow. A bounty board can attract competing contributors, partial submissions, and disagreements about whether work meets the task requirements.

The repository already models submissions and dispute handling, which means contributors need a clear statement of why the system is intentionally more flexible than a single-winner happy path.

## Decision

Support multiple submissions per task and provide an explicit dispute-resolution path when approval cannot be resolved directly between the poster and contributor.

## Rationale

- Competitive submissions are common in bounty-style systems.
- Disputes are inevitable when work quality, deadlines, or acceptance criteria are ambiguous.
- A defined dispute path makes the payout lifecycle more predictable than ad hoc moderator intervention.

## Alternatives Considered

### Single submission per task

- Pros: simpler storage and approval logic
- Cons: less aligned with bounty-board behavior and reduces contributor flexibility

### Poster-controlled finality with no dispute process

- Pros: smallest implementation surface
- Cons: contributors have weaker protection against unfair rejection

## Consequences

- Storage and event models must track more than one submission per task.
- Approval and refund logic must account for unresolved or contested states.
- Frontend flows should expose status changes clearly so contributors understand whether a task is open, in review, approved, rejected, or disputed.
