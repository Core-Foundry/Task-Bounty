/**
 * Issue #160: Implement Grant Status Transitions
 *
 * Introduces a controlled status workflow for grants (tasks).
 * Only valid transitions are allowed; invalid ones are rejected.
 */

import type { TaskStatus } from "@/types/task-workflow";

export type TransitionResult =
  | { ok: true; from: TaskStatus; to: TaskStatus }
  | { ok: false; from: TaskStatus; to: TaskStatus; error: string };

/**
 * Valid status transitions.
 * A grant can go through these stages:
 *
 *   open → in_progress (first submission received)
 *   open → cancelled (poster cancels before any submission)
 *   in_progress → completed (submission approved)
 *   in_progress → cancelled (poster cancels)
 *   in_progress → disputed (issue raised)
 *   completed → disputed (issue raised post-completion)
 *   disputed → completed (resolved in favor of contributor)
 *   disputed → cancelled (resolved in favor of poster)
 *   cancelled → open (reopened)
 *
 * Same-status transitions (no-op) are also allowed.
 */
export const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  open: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled", "disputed"],
  completed: ["disputed"],
  cancelled: ["open"],
  disputed: ["completed", "cancelled"],
};

/**
 * Check if a transition is valid.
 */
export function isValidTransition(
  from: TaskStatus,
  to: TaskStatus,
): boolean {
  if (from === to) return true; // no-op
  const allowed = VALID_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

/**
 * Attempt a status transition. Returns an error if the transition is not valid.
 */
export function transitionStatus(
  from: TaskStatus,
  to: TaskStatus,
): TransitionResult {
  if (from === to) {
    return { ok: true, from, to };
  }

  if (!isValidTransition(from, to)) {
    return {
      ok: false,
      from,
      to,
      error: `Invalid status transition: ${from} → ${to}. Allowed transitions from "${from}": ${(VALID_TRANSITIONS[from] ?? []).join(", ") || "none"}.`,
    };
  }

  return { ok: true, from, to };
}

/**
 * Get all valid next statuses from the current status.
 */
export function getNextStatuses(current: TaskStatus): TaskStatus[] {
  return VALID_TRANSITIONS[current] ?? [];
}

/**
 * Get a human-readable description of the status workflow.
 */
export function getStatusWorkflowDescription(): Array<{
  from: TaskStatus;
  to: TaskStatus;
  description: string;
}> {
  return [
    { from: "open", to: "in_progress", description: "First submission received" },
    { from: "open", to: "cancelled", description: "Poster cancels before any submission" },
    { from: "in_progress", to: "completed", description: "Submission approved" },
    { from: "in_progress", to: "cancelled", description: "Poster cancels" },
    { from: "in_progress", to: "disputed", description: "Issue raised" },
    { from: "completed", to: "disputed", description: "Issue raised post-completion" },
    { from: "disputed", to: "completed", description: "Resolved in favor of contributor" },
    { from: "disputed", to: "cancelled", description: "Resolved in favor of poster" },
    { from: "cancelled", to: "open", description: "Reopened" },
  ];
}

/**
 * Check if a status is terminal (no outgoing transitions except to itself).
 */
export function isTerminalStatus(status: TaskStatus): boolean {
  const next = VALID_TRANSITIONS[status] ?? [];
  return next.length === 0;
}
