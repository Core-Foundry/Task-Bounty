/**
 * Issue #155: Create a Grant Expiration Management System
 *
 * Automatically identifies grants that have passed their deadline
 * and updates their availability status.
 */

import type { TaskRecord, TaskStatus } from "@/types/task-workflow";

export interface ExpirationCheckResult {
  checked: number;
  expired: number;
  expiredTasks: TaskRecord[];
  /** Tasks that will expire within the warning window. */
  upcomingExpirations: Array<{ task: TaskRecord; hoursUntilDeadline: number }>;
}

/** Grace period in seconds after deadline before auto-expiration (1 hour). */
export const EXPIRATION_GRACE_PERIOD_SECONDS = 3600;

/** Warning window in seconds before deadline for "upcoming" notifications (24 hours). */
export const UPCOMING_EXPIRATION_WINDOW_SECONDS = 24 * 3600;

/**
 * Check if a task's deadline has passed (with grace period).
 */
export function isExpired(
  task: Pick<TaskRecord, "deadline" | "status">,
  now: Date = new Date(),
): boolean {
  if (task.status === "completed" || task.status === "cancelled") {
    return false; // Terminal statuses don't expire
  }
  const nowSeconds = Math.floor(now.getTime() / 1000);
  return task.deadline + EXPIRATION_GRACE_PERIOD_SECONDS <= nowSeconds;
}

/**
 * Check if a task is approaching its deadline.
 */
export function isApproachingDeadline(
  task: Pick<TaskRecord, "deadline" | "status">,
  now: Date = new Date(),
): boolean {
  if (task.status === "completed" || task.status === "cancelled") {
    return false;
  }
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const timeUntilDeadline = task.deadline - nowSeconds;
  return (
    timeUntilDeadline > 0 &&
    timeUntilDeadline <= UPCOMING_EXPIRATION_WINDOW_SECONDS
  );
}

/**
 * Calculate hours until a task's deadline.
 */
export function hoursUntilDeadline(
  task: Pick<TaskRecord, "deadline">,
  now: Date = new Date(),
): number {
  const nowSeconds = Math.floor(now.getTime() / 1000);
  return Math.ceil((task.deadline - nowSeconds) / 3600);
}

/**
 * Run an expiration check on all tasks.
 * Returns expired tasks and upcoming expirations.
 *
 * This function does NOT mutate the tasks — it only identifies them.
 * The caller (task-workflow integration) is responsible for updating statuses.
 */
export function checkExpirations(
  tasks: TaskRecord[],
  now: Date = new Date(),
): ExpirationCheckResult {
  const expiredTasks: TaskRecord[] = [];
  const upcomingExpirations: Array<{ task: TaskRecord; hoursUntilDeadline: number }> = [];

  for (const task of tasks) {
    if (isExpired(task, now)) {
      expiredTasks.push(task);
    } else if (isApproachingDeadline(task, now)) {
      upcomingExpirations.push({
        task,
        hoursUntilDeadline: hoursUntilDeadline(task, now),
      });
    }
  }

  // Sort upcoming by soonest deadline
  upcomingExpirations.sort(
    (a, b) => a.hoursUntilDeadline - b.hoursUntilDeadline,
  );

  return {
    checked: tasks.length,
    expired: expiredTasks.length,
    expiredTasks,
    upcomingExpirations,
  };
}

/**
 * Filter a task list to exclude expired tasks.
 * Useful for "active listings" views.
 */
export function filterOutExpired(
  tasks: TaskRecord[],
  now: Date = new Date(),
): TaskRecord[] {
  return tasks.filter((t) => !isExpired(t, now));
}

/**
 * Get only active (non-expired, non-terminal) tasks.
 */
export function getActiveTasks(
  tasks: TaskRecord[],
  now: Date = new Date(),
): TaskRecord[] {
  return tasks.filter((t) => {
    if (t.status === "completed" || t.status === "cancelled") return false;
    return !isExpired(t, now);
  });
}

/**
 * Get only expired tasks.
 */
export function getExpiredTasks(
  tasks: TaskRecord[],
  now: Date = new Date(),
): TaskRecord[] {
  return tasks.filter((t) => isExpired(t, now));
}

/**
 * Determine the appropriate status for an expired task.
 * Expired tasks should be marked as "cancelled" if still open,
 * or remain in their current terminal status.
 */
export function getExpirationStatus(
  task: Pick<TaskRecord, "status">,
): TaskStatus {
  if (task.status === "completed" || task.status === "cancelled") {
    return task.status;
  }
  return "cancelled";
}
