/**
 * Issue #150: Implement Grant Application Submission History
 *
 * Provides a read-only view of a user's submitted grant applications
 * across all tasks. Leverages the existing `submissions` and `tasks`
 * stores from `task-workflow.ts` but exposes a dedicated history
 * interface with sorting, filtering, and pagination.
 *
 * This module is a thin query layer — it does not duplicate data.
 */

import { listTasks } from "@/lib/task-workflow";
import type { TaskRecord } from "@/types/task-workflow";

export type SubmissionHistoryStatus =
  | "all"
  | "pending"
  | "approved"
  | "rejected";

export interface SubmissionHistoryEntry {
  submissionId: string;
  taskId: string;
  taskTitle: string;
  contributor: string;
  workUrl: string;
  description: string;
  submittedAt: string;
  status: string;
  taskReward: number;
  taskOrganization: string;
}

export interface SubmissionHistoryResult {
  entries: SubmissionHistoryEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SubmissionHistoryQuery {
  userId: string;
  status?: SubmissionHistoryStatus;
  sort?: "newest" | "oldest" | "status";
  page?: number;
  pageSize?: number;
}

const DEFAULT_HISTORY_PAGE_SIZE = 10;
const MAX_HISTORY_PAGE_SIZE = 50;

/**
 * Build a submission history for a user from the task-workflow store.
 *
 * Since `task-workflow.ts` keeps submissions in a module-private Map,
 * we expose a bridge via `listTasks` + a new export. However, to avoid
 * circular imports and keep the pattern consistent, we maintain our own
 * index here that is populated when submissions are created.
 */

// --- in-memory index ---

const historyIndex = new Map<string, SubmissionHistoryEntry[]>();
/** submissionId -> entry for O(1) status updates */
const submissionIndex = new Map<string, SubmissionHistoryEntry>();

/**
 * Record a new submission in the history index.
 * Called by `submitTaskWork` in task-workflow.ts.
 */
export function recordSubmission(
  submissionId: string,
  taskId: string,
  taskTitle: string,
  contributor: string,
  workUrl: string,
  description: string,
  submittedAt: string,
  status: string,
  taskReward: number,
  taskOrganization: string,
): void {
  const entry: SubmissionHistoryEntry = {
    submissionId,
    taskId,
    taskTitle,
    contributor,
    workUrl,
    description,
    submittedAt,
    status,
    taskReward,
    taskOrganization,
  };

  submissionIndex.set(submissionId, entry);

  const userEntries = historyIndex.get(contributor) ?? [];
  userEntries.push(entry);
  historyIndex.set(contributor, userEntries);
}

/**
 * Update the status of a submission in the history index.
 * Called when a submission is approved or rejected.
 */
export function updateSubmissionStatus(
  submissionId: string,
  newStatus: string,
): void {
  const entry = submissionIndex.get(submissionId);
  if (entry) {
    entry.status = newStatus;
  }
}

/**
 * Retrieve a user's submission history with optional filtering,
 * sorting, and pagination.
 */
export function getSubmissionHistory(
  query: SubmissionHistoryQuery,
): SubmissionHistoryResult {
  const userId = query.userId.trim();
  const userEntries = historyIndex.get(userId) ?? [];

  // Filter by status
  let filtered = userEntries;
  if (query.status && query.status !== "all") {
    filtered = filtered.filter((e) => e.status === query.status);
  }

  // Sort
  const sort = query.sort ?? "newest";
  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "oldest":
        return a.submittedAt.localeCompare(b.submittedAt);
      case "status":
        // Group by status: pending -> approved -> rejected, then by date
        const statusOrder: Record<string, number> = {
          pending: 0,
          approved: 1,
          rejected: 2,
        };
        const sa = statusOrder[a.status] ?? 99;
        const sb = statusOrder[b.status] ?? 99;
        if (sa !== sb) return sa - sb;
        return b.submittedAt.localeCompare(a.submittedAt);
      case "newest":
      default:
        return b.submittedAt.localeCompare(a.submittedAt);
    }
  });

  // Paginate
  const total = sorted.length;
  const pageSize = Math.min(
    MAX_HISTORY_PAGE_SIZE,
    Math.max(
      1,
      Number.isFinite(query.pageSize) && query.pageSize
        ? Math.floor(query.pageSize)
        : DEFAULT_HISTORY_PAGE_SIZE,
    ),
  );
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(
    totalPages,
    Math.max(
      1,
      Number.isFinite(query.page) && query.page ? Math.floor(query.page) : 1,
    ),
  );

  const start = (page - 1) * pageSize;
  const pageEntries = sorted.slice(start, start + pageSize);

  return {
    entries: pageEntries,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Get a single submission's history entry.
 */
export function getSubmissionEntry(
  submissionId: string,
): SubmissionHistoryEntry | null {
  return submissionIndex.get(submissionId) ?? null;
}

/**
 * Get total count of submissions for a user (all statuses).
 */
export function getSubmissionCount(userId: string): number {
  return (historyIndex.get(userId.trim()) ?? []).length;
}

/**
 * Get breakdown of submission statuses for a user.
 */
export function getSubmissionStatusBreakdown(
  userId: string,
): Record<string, number> {
  const entries = historyIndex.get(userId.trim()) ?? [];
  const breakdown: Record<string, number> = {
    pending: 0,
    approved: 0,
    rejected: 0,
  };
  for (const entry of entries) {
    breakdown[entry.status] = (breakdown[entry.status] ?? 0) + 1;
  }
  return breakdown;
}

export function resetSubmissionHistoryStore() {
  historyIndex.clear();
  submissionIndex.clear();
}
