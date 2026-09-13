/**
 * Issue #149: Add Draft Auto-Save for Grant Applications
 *
 * In-memory draft store that automatically saves a user's grant
 * application form data at periodic intervals. Drafts persist for the
 * server process lifetime and can be resumed by the user at any time.
 *
 * Design:
 * - `saveDraft()` is idempotent: calling it with the same userId+taskId
 *   updates the existing draft rather than creating duplicates.
 * - `getDraft()` retrieves the latest saved draft for a user+task pair.
 * - `listDrafts()` returns all drafts for a user.
 * - `deleteDraft()` manually removes a draft.
 * - `getLastSavedAt()` returns when the draft was last saved (for UI display).
 */

export interface DraftRecord {
  id: string;
  userId: string;
  taskId: string;
  /** Arbitrary form data serialized as a JSON string. */
  formData: string;
  /** Auto-save indicator: true if saved by the auto-save timer, false if manual. */
  autoSaved: boolean;
  lastSavedAt: string;
  createdAt: string;
}

export interface DraftListResult {
  drafts: DraftRecord[];
  total: number;
}

type DraftSuccess<T> = { ok: true } & T;

type DraftFailure = {
  ok: false;
  status: 400 | 404;
  error: string;
};

export type DraftResult<T> = DraftSuccess<T> | DraftFailure;

/** Default auto-save interval in milliseconds (30 seconds). */
export const DEFAULT_AUTOSAVE_INTERVAL_MS = 30_000;

/** Maximum form data size (1 MB to prevent abuse). */
export const MAX_FORM_DATA_SIZE = 1_048_576;

// --- in-memory store ---

const drafts = new Map<string, DraftRecord>();
/** userId+taskId -> draftId for O(1) upserts */
const userTaskDrafts = new Map<string, string>();
/** userId -> Set<draftId> */
const userDrafts = new Map<string, Set<string>>();

let nextDraftId = 1;

function draftKey(userId: string, taskId: string): string {
  return `${userId}::${taskId}`;
}

function getUserDraftSet(userId: string): Set<string> {
  let set = userDrafts.get(userId);
  if (!set) {
    set = new Set<string>();
    userDrafts.set(userId, set);
  }
  return set;
}

/**
 * Save (create or update) a draft for a user+task pair.
 * If a draft already exists for this pair, it is updated in place.
 */
export function saveDraft(
  input: {
    userId: string;
    taskId: string;
    formData: string;
    autoSaved?: boolean;
  },
  now: Date = new Date(),
): DraftResult<{ draft: DraftRecord }> {
  const userId = input.userId.trim();
  const taskId = input.taskId.trim();

  if (!userId) {
    return { ok: false, status: 400, error: "User ID is required." };
  }
  if (!taskId) {
    return { ok: false, status: 400, error: "Task ID is required." };
  }
  if (input.formData.length > MAX_FORM_DATA_SIZE) {
    return {
      ok: false,
      status: 400,
      error: `Form data exceeds maximum size of ${MAX_FORM_DATA_SIZE} bytes.`,
    };
  }

  const key = draftKey(userId, taskId);
  const existingId = userTaskDrafts.get(key);

  if (existingId) {
    const existing = drafts.get(existingId);
    if (existing) {
      const updated: DraftRecord = {
        ...existing,
        formData: input.formData,
        autoSaved: input.autoSaved ?? true,
        lastSavedAt: now.toISOString(),
      };
      drafts.set(existingId, updated);
      return { ok: true, draft: updated };
    }
  }

  const draft: DraftRecord = {
    id: String(nextDraftId++),
    userId,
    taskId,
    formData: input.formData,
    autoSaved: input.autoSaved ?? true,
    lastSavedAt: now.toISOString(),
    createdAt: now.toISOString(),
  };

  drafts.set(draft.id, draft);
  userTaskDrafts.set(key, draft.id);
  getUserDraftSet(userId).add(draft.id);

  return { ok: true, draft };
}

/**
 * Retrieve the latest saved draft for a user+task pair.
 */
export function getDraft(
  userId: string,
  taskId: string,
): DraftRecord | null {
  const key = draftKey(userId.trim(), taskId.trim());
  const draftId = userTaskDrafts.get(key);
  if (!draftId) return null;
  return drafts.get(draftId) ?? null;
}

/**
 * Get the last-saved timestamp for a user+task pair.
 * Returns null if no draft exists.
 */
export function getLastSavedAt(
  userId: string,
  taskId: string,
): string | null {
  const draft = getDraft(userId, taskId);
  return draft ? draft.lastSavedAt : null;
}

/**
 * List all drafts for a user, newest first.
 */
export function listDrafts(userId: string): DraftListResult {
  const uid = userId.trim();
  const dset = userDrafts.get(uid);
  if (!dset || dset.size === 0) {
    return { drafts: [], total: 0 };
  }

  const userDraftRecords = Array.from(dset)
    .map((did) => drafts.get(did))
    .filter((d): d is DraftRecord => d !== undefined)
    .sort((a, b) => b.lastSavedAt.localeCompare(a.lastSavedAt));

  return { drafts: userDraftRecords, total: userDraftRecords.length };
}

/**
 * Delete a draft by ID.
 */
export function deleteDraft(
  userId: string,
  draftId: string,
): DraftResult<{ deleted: true }> {
  const uid = userId.trim();
  const did = draftId.trim();

  if (!uid || !did) {
    return { ok: false, status: 400, error: "User ID and draft ID are required." };
  }

  const draft = drafts.get(did);
  if (!draft || draft.userId !== uid) {
    return { ok: false, status: 404, error: "Draft not found." };
  }

  drafts.delete(did);
  userTaskDrafts.delete(draftKey(uid, draft.taskId));
  const dset = userDrafts.get(uid);
  if (dset) dset.delete(did);

  return { ok: true, deleted: true };
}

/**
 * Delete a draft by user+task pair (useful for form cleanup after submission).
 */
export function deleteDraftByTask(
  userId: string,
  taskId: string,
): DraftResult<{ deleted: true }> {
  const uid = userId.trim();
  const tid = taskId.trim();

  if (!uid || !tid) {
    return { ok: false, status: 400, error: "User ID and task ID are required." };
  }

  const key = draftKey(uid, tid);
  const draftId = userTaskDrafts.get(key);

  if (!draftId) {
    return { ok: false, status: 404, error: "Draft not found for this task." };
  }

  drafts.delete(draftId);
  userTaskDrafts.delete(key);
  const dset = userDrafts.get(uid);
  if (dset) dset.delete(draftId);

  return { ok: true, deleted: true };
}

export function resetDraftStore() {
  drafts.clear();
  userTaskDrafts.clear();
  userDrafts.clear();
  nextDraftId = 1;
}
