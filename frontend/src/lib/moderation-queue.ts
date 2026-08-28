/**
 * Admin Moderation Queue — centralized interface for administrators
 * to review pending grant/task submissions, updates, and user reports.
 *
 * Issue #159: Add an Admin Moderation Queue
 *
 * Moderation items are NOT auto-deleted. Admins can approve or reject.
 * Moderation actions update the relevant record's status.
 */

import type { TaskRecord, TaskStatus } from "@/types/task-workflow";

export type ModerationItemType =
  | "task_created"
  | "task_updated"
  | "duplicate_flag"
  | "user_report";

export type ModerationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "dismissed";

export interface ModerationItem {
  id: string;
  type: ModerationItemType;
  /** ID of the entity being moderated (task ID, etc.). */
  targetId: string;
  /** Title or label for display. */
  title: string;
  /** Description of what needs review. */
  description: string;
  /** Who reported/flagged this item (or "system" for auto-flags). */
  reportedBy: string;
  /** When the item was created. */
  createdAt: string;
  /** Current moderation status. */
  status: ModerationStatus;
  /** Admin who reviewed this item (if reviewed). */
  reviewedBy?: string;
  /** When the item was reviewed. */
  reviewedAt?: string;
  /** Optional admin note. */
  adminNote?: string;
  /** Severity level 1-5 (5 = highest). */
  severity: number;
}

export interface ModerationQueueResult {
  items: ModerationItem[];
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  dismissed: number;
}

// In-memory store (matches the project's pattern of in-memory Maps)
const moderationItems = new Map<string, ModerationItem>();
let nextModerationId = 1;

/**
 * Enqueue a new item for moderation.
 */
export function enqueueModeration(
  input: Omit<ModerationItem, "id" | "createdAt" | "status">,
  now: Date = new Date(),
): ModerationItem {
  const item: ModerationItem = {
    ...input,
    id: String(nextModerationId++),
    createdAt: now.toISOString(),
    status: "pending",
  };
  moderationItems.set(item.id, item);
  return item;
}

/**
 * List moderation items with optional status filter.
 */
export function listModerationItems(
  filter?: { status?: ModerationStatus; type?: ModerationItemType },
): ModerationQueueResult {
  let items = Array.from(moderationItems.values());

  if (filter?.status) {
    items = items.filter((i) => i.status === filter.status);
  }
  if (filter?.type) {
    items = items.filter((i) => i.type === filter.type);
  }

  items.sort((a, b) => {
    // Pending first, then by severity desc, then by date desc
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    if (a.severity !== b.severity) return b.severity - a.severity;
    return b.createdAt.localeCompare(a.createdAt);
  });

  const counts = {
    total: items.length,
    pending: items.filter((i) => i.status === "pending").length,
    approved: items.filter((i) => i.status === "approved").length,
    rejected: items.filter((i) => i.status === "rejected").length,
    dismissed: items.filter((i) => i.status === "dismissed").length,
  };

  return { items, ...counts };
}

/**
 * Approve a moderation item.
 */
export function approveModerationItem(
  id: string,
  adminAddress: string,
  note?: string,
  now: Date = new Date(),
): { ok: true; item: ModerationItem } | { ok: false; error: string } {
  const item = moderationItems.get(id);
  if (!item) {
    return { ok: false, error: "Moderation item not found." };
  }
  if (item.status !== "pending") {
    return { ok: false, error: `Item already ${item.status}.` };
  }
  const updated: ModerationItem = {
    ...item,
    status: "approved",
    reviewedBy: adminAddress,
    reviewedAt: now.toISOString(),
    adminNote: note,
  };
  moderationItems.set(id, updated);
  return { ok: true, item: updated };
}

/**
 * Reject a moderation item.
 */
export function rejectModerationItem(
  id: string,
  adminAddress: string,
  note?: string,
  now: Date = new Date(),
): { ok: true; item: ModerationItem } | { ok: false; error: string } {
  const item = moderationItems.get(id);
  if (!item) {
    return { ok: false, error: "Moderation item not found." };
  }
  if (item.status !== "pending") {
    return { ok: false, error: `Item already ${item.status}.` };
  }
  const updated: ModerationItem = {
    ...item,
    status: "rejected",
    reviewedBy: adminAddress,
    reviewedAt: now.toISOString(),
    adminNote: note,
  };
  moderationItems.set(id, updated);
  return { ok: true, item: updated };
}

/**
 * Dismiss a moderation item (no action needed).
 */
export function dismissModerationItem(
  id: string,
  adminAddress: string,
  note?: string,
  now: Date = new Date(),
): { ok: true; item: ModerationItem } | { ok: false; error: string } {
  const item = moderationItems.get(id);
  if (!item) {
    return { ok: false, error: "Moderation item not found." };
  }
  if (item.status !== "pending") {
    return { ok: false, error: `Item already ${item.status}.` };
  }
  const updated: ModerationItem = {
    ...item,
    status: "dismissed",
    reviewedBy: adminAddress,
    reviewedAt: now.toISOString(),
    adminNote: note,
  };
  moderationItems.set(id, updated);
  return { ok: true, item: updated };
}

/**
 * Get a single moderation item by ID.
 */
export function getModerationItem(id: string): ModerationItem | undefined {
  return moderationItems.get(id);
}

/**
 * Reset the moderation store (for testing).
 */
export function resetModerationStore(): void {
  moderationItems.clear();
  nextModerationId = 1;
}
