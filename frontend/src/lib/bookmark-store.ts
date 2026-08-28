/**
 * Issue #152: Implement Grant Bookmarking
 *
 * In-memory bookmark store following the same Map-based pattern as
 * `task-workflow.ts` and `notification-store.ts`.
 *
 * Users can bookmark / unbookmark grants (tasks) and retrieve their
 * saved list. Bookmarks persist for the lifetime of the server process
 * (same as all other stores in this project).
 */

/** A single bookmark record. */
export interface BookmarkRecord {
  id: string;
  userId: string;
  taskId: string;
  createdAt: string;
}

export interface BookmarkListResult {
  bookmarks: BookmarkRecord[];
  total: number;
}

type BookmarkSuccess<T> = { ok: true } & T;

type BookmarkFailure = {
  ok: false;
  status: 400 | 404 | 409;
  error: string;
};

export type BookmarkResult<T> = BookmarkSuccess<T> | BookmarkFailure;

// --- in-memory store ---

const bookmarks = new Map<string, BookmarkRecord>();
/** userId -> Set<bookmarkId> for O(1) lookups per user. */
const userBookmarks = new Map<string, Set<string>>();
/** userId -> Set<taskId> to prevent duplicates. */
const userTaskSet = new Map<string, Set<string>>();

let nextBookmarkId = 1;

function getUserBookmarkSet(userId: string): Set<string> {
  let set = userBookmarks.get(userId);
  if (!set) {
    set = new Set<string>();
    userBookmarks.set(userId, set);
  }
  return set;
}

function getUserTaskSet(userId: string): Set<string> {
  let set = userTaskSet.get(userId);
  if (!set) {
    set = new Set<string>();
    userTaskSet.set(userId, set);
  }
  return set;
}

/**
 * Add a bookmark for `taskId` on behalf of `userId`.
 * Returns 409 if the user has already bookmarked this task.
 */
export function addBookmark(
  userId: string,
  taskId: string,
  now: Date = new Date(),
): BookmarkResult<{ bookmark: BookmarkRecord }> {
  const uid = userId.trim();
  const tid = taskId.trim();

  if (!uid) {
    return { ok: false, status: 400, error: "User ID is required." };
  }
  if (!tid) {
    return { ok: false, status: 400, error: "Task ID is required." };
  }

  const taskSet = getUserTaskSet(uid);
  if (taskSet.has(tid)) {
    return {
      ok: false,
      status: 409,
      error: "Task is already bookmarked.",
    };
  }

  const bookmark: BookmarkRecord = {
    id: String(nextBookmarkId++),
    userId: uid,
    taskId: tid,
    createdAt: now.toISOString(),
  };

  bookmarks.set(bookmark.id, bookmark);
  getUserBookmarkSet(uid).add(bookmark.id);
  taskSet.add(tid);

  return { ok: true, bookmark };
}

/**
 * Remove a bookmark. Returns 404 if the bookmark doesn't exist or
 * doesn't belong to `userId`.
 */
export function removeBookmark(
  userId: string,
  bookmarkId: string,
): BookmarkResult<{ deleted: true }> {
  const uid = userId.trim();
  const bid = bookmarkId.trim();

  if (!uid || !bid) {
    return { ok: false, status: 400, error: "User ID and bookmark ID are required." };
  }

  const bookmark = bookmarks.get(bid);
  if (!bookmark || bookmark.userId !== uid) {
    return { ok: false, status: 404, error: "Bookmark not found." };
  }

  bookmarks.delete(bid);
  const bset = userBookmarks.get(uid);
  if (bset) bset.delete(bid);
  const tset = userTaskSet.get(uid);
  if (tset) tset.delete(bookmark.taskId);

  return { ok: true, deleted: true };
}

/**
 * Remove a bookmark by task ID (useful for toggle UIs).
 */
export function removeBookmarkByTask(
  userId: string,
  taskId: string,
): BookmarkResult<{ deleted: true }> {
  const uid = userId.trim();
  const tid = taskId.trim();

  if (!uid || !tid) {
    return { ok: false, status: 400, error: "User ID and task ID are required." };
  }

  const tset = userTaskSet.get(uid);
  if (!tset || !tset.has(tid)) {
    return { ok: false, status: 404, error: "Bookmark not found for this task." };
  }

  // Find the bookmark entry to remove
  for (const [bid, bookmark] of bookmarks.entries()) {
    if (bookmark.userId === uid && bookmark.taskId === tid) {
      bookmarks.delete(bid);
      const bset = userBookmarks.get(uid);
      if (bset) bset.delete(bid);
      tset.delete(tid);
      return { ok: true, deleted: true };
    }
  }

  // Shouldn't reach here, but clean up just in case
  tset.delete(tid);
  return { ok: true, deleted: true };
}

/**
 * List all bookmarks for a user, newest first.
 */
export function listBookmarks(userId: string): BookmarkListResult {
  const uid = userId.trim();
  const bset = userBookmarks.get(uid);

  if (!bset || bset.size === 0) {
    return { bookmarks: [], total: 0 };
  }

  const userBookmarkRecords = Array.from(bset)
    .map((bid) => bookmarks.get(bid))
    .filter((b): b is BookmarkRecord => b !== undefined)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { bookmarks: userBookmarkRecords, total: userBookmarkRecords.length };
}

/**
 * Check whether a user has bookmarked a specific task.
 */
export function isBookmarked(userId: string, taskId: string): boolean {
  const tset = userTaskSet.get(userId.trim());
  return tset ? tset.has(taskId.trim()) : false;
}

/**
 * Toggle a bookmark on/off. Returns the new state.
 */
export function toggleBookmark(
  userId: string,
  taskId: string,
  now: Date = new Date(),
): BookmarkResult<{ bookmarked: boolean; bookmark?: BookmarkRecord }> {
  if (isBookmarked(userId, taskId)) {
    const result = removeBookmarkByTask(userId, taskId);
    if (result.ok) {
      return { ok: true, bookmarked: false };
    }
    return result;
  }

  const result = addBookmark(userId, taskId, now);
  if (result.ok) {
    return { ok: true, bookmarked: true, bookmark: result.bookmark };
  }
  return result;
}

export function resetBookmarkStore() {
  bookmarks.clear();
  userBookmarks.clear();
  userTaskSet.clear();
  nextBookmarkId = 1;
}

