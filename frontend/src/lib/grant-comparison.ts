/**
 * Issue #153: Add Grant Comparison Functionality
 *
 * Allows users to select multiple grants (tasks) and compare their
 * key details side by side. Uses an in-memory comparison set per user.
 */

import type { TaskRecord } from "@/types/task-workflow";

export interface ComparisonSet {
  id: string;
  userId: string;
  taskIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ComparisonResult {
  comparison: ComparisonSet;
  tasks: TaskRecord[];
}

type ComparisonSuccess<T> = { ok: true } & T;

type ComparisonFailure = {
  ok: false;
  status: 400 | 404 | 409;
  error: string;
};

export type ComparisonResponse<T> = ComparisonSuccess<T> | ComparisonFailure;

/** Maximum number of grants that can be compared at once. */
export const MAX_COMPARISON_SIZE = 5;

// --- in-memory store ---

const comparisons = new Map<string, ComparisonSet>();
const userComparisons = new Map<string, string>();
let nextComparisonId = 1;

/**
 * Create or replace a comparison set for a user.
 * The user must have at least 2 task IDs to compare.
 */
export function createComparison(
  userId: string,
  taskIds: string[],
  now: Date = new Date(),
): ComparisonResponse<{ comparison: ComparisonSet }> {
  const uid = userId.trim();

  if (!uid) {
    return { ok: false, status: 400, error: "User ID is required." };
  }

  const unique = [...new Set(taskIds.map((t) => t.trim()).filter(Boolean))];

  if (unique.length < 2) {
    return {
      ok: false,
      status: 400,
      error: "At least 2 grants are required for comparison.",
    };
  }

  if (unique.length > MAX_COMPARISON_SIZE) {
    return {
      ok: false,
      status: 400,
      error: `Cannot compare more than ${MAX_COMPARISON_SIZE} grants at once.`,
    };
  }

  const existingId = userComparisons.get(uid);
  const id = existingId ?? String(nextComparisonId++);
  const ts = now.toISOString();

  const comparison: ComparisonSet = {
    id,
    userId: uid,
    taskIds: unique,
    createdAt: existingId
      ? comparisons.get(existingId)?.createdAt ?? ts
      : ts,
    updatedAt: ts,
  };

  comparisons.set(id, comparison);
  userComparisons.set(uid, id);

  return { ok: true, comparison };
}

/**
 * Get the current comparison set for a user.
 */
export function getComparison(userId: string): ComparisonSet | null {
  const uid = userId.trim();
  const id = userComparisons.get(uid);
  if (!id) return null;
  return comparisons.get(id) ?? null;
}

/**
 * Add a task to the user's comparison set.
 */
export function addToComparison(
  userId: string,
  taskId: string,
  now: Date = new Date(),
): ComparisonResponse<{ comparison: ComparisonSet }> {
  const uid = userId.trim();
  const tid = taskId.trim();

  if (!uid || !tid) {
    return { ok: false, status: 400, error: "User ID and task ID are required." };
  }

  const existing = getComparison(uid);
  if (existing) {
    if (existing.taskIds.includes(tid)) {
      return { ok: true, comparison: existing };
    }
    if (existing.taskIds.length >= MAX_COMPARISON_SIZE) {
      return {
        ok: false,
        status: 409,
        error: `Cannot compare more than ${MAX_COMPARISON_SIZE} grants.`,
      };
    }
    return createComparison(uid, [...existing.taskIds, tid], now);
  }

  return createComparison(uid, [tid], now);
}

/**
 * Remove a task from the user's comparison set.
 */
export function removeFromComparison(
  userId: string,
  taskId: string,
  now: Date = new Date(),
): ComparisonResponse<{ comparison: ComparisonSet | null }> {
  const uid = userId.trim();
  const tid = taskId.trim();

  if (!uid || !tid) {
    return { ok: false, status: 400, error: "User ID and task ID are required." };
  }

  const existing = getComparison(uid);
  if (!existing) {
    return { ok: false, status: 404, error: "No comparison set found." };
  }

  const newTaskIds = existing.taskIds.filter((t) => t !== tid);
  if (newTaskIds.length === 0) {
    clearComparison(uid);
    return { ok: true, comparison: null };
  }

  return createComparison(uid, newTaskIds, now);
}

/**
 * Clear the user's comparison set.
 */
export function clearComparison(userId: string): void {
  const uid = userId.trim();
  const id = userComparisons.get(uid);
  if (id) {
    comparisons.delete(id);
    userComparisons.delete(uid);
  }
}

export function resetComparisonStore() {
  comparisons.clear();
  userComparisons.clear();
  nextComparisonId = 1;
}
