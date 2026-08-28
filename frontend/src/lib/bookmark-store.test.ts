import { describe, it, expect, beforeEach } from "vitest";
import {
  addBookmark,
  removeBookmark,
  removeBookmarkByTask,
  listBookmarks,
  isBookmarked,
  toggleBookmark,
  resetBookmarkStore,
} from "@/lib/bookmark-store";

describe("bookmark-store", () => {
  beforeEach(() => {
    resetBookmarkStore();
  });

  describe("addBookmark", () => {
    it("creates a bookmark with valid input", () => {
      const result = addBookmark("user1", "task1");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.bookmark.userId).toBe("user1");
        expect(result.bookmark.taskId).toBe("task1");
        expect(result.bookmark.id).toBeTruthy();
        expect(result.bookmark.createdAt).toBeTruthy();
      }
    });

    it("returns 400 for empty userId", () => {
      const result = addBookmark("", "task1");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(400);
      }
    });

    it("returns 400 for empty taskId", () => {
      const result = addBookmark("user1", "");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(400);
      }
    });

    it("returns 409 when bookmarking the same task twice", () => {
      addBookmark("user1", "task1");
      const result = addBookmark("user1", "task1");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(409);
      }
    });

    it("allows different users to bookmark the same task", () => {
      addBookmark("user1", "task1");
      const result = addBookmark("user2", "task1");
      expect(result.ok).toBe(true);
    });

    it("allows same user to bookmark different tasks", () => {
      addBookmark("user1", "task1");
      const result = addBookmark("user1", "task2");
      expect(result.ok).toBe(true);
    });

    it("trims whitespace from inputs", () => {
      const result = addBookmark("  user1  ", "  task1  ");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.bookmark.userId).toBe("user1");
        expect(result.bookmark.taskId).toBe("task1");
      }
    });
  });

  describe("removeBookmark", () => {
    it("removes an existing bookmark", () => {
      const addResult = addBookmark("user1", "task1");
      if (addResult.ok) {
        const result = removeBookmark("user1", addResult.bookmark.id);
        expect(result.ok).toBe(true);
      }
    });

    it("returns 404 for non-existent bookmark", () => {
      const result = removeBookmark("user1", "nonexistent");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(404);
      }
    });

    it("returns 404 when removing another user's bookmark", () => {
      const addResult = addBookmark("user1", "task1");
      if (addResult.ok) {
        const result = removeBookmark("user2", addResult.bookmark.id);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.status).toBe(404);
        }
      }
    });
  });

  describe("removeBookmarkByTask", () => {
    it("removes a bookmark by task ID", () => {
      addBookmark("user1", "task1");
      const result = removeBookmarkByTask("user1", "task1");
      expect(result.ok).toBe(true);
      expect(isBookmarked("user1", "task1")).toBe(false);
    });

    it("returns 404 when bookmark not found for task", () => {
      const result = removeBookmarkByTask("user1", "task1");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(404);
      }
    });
  });

  describe("listBookmarks", () => {
    it("returns empty list for user with no bookmarks", () => {
      const result = listBookmarks("user1");
      expect(result.total).toBe(0);
      expect(result.bookmarks).toEqual([]);
    });

    it("returns bookmarks sorted newest first", () => {
      const r1 = addBookmark("user1", "task1", new Date("2026-01-01"));
      const r2 = addBookmark("user1", "task2", new Date("2026-01-02"));
      const result = listBookmarks("user1");
      expect(result.total).toBe(2);
      expect(result.bookmarks[0].taskId).toBe("task2");
      expect(result.bookmarks[1].taskId).toBe("task1");
    });

    it("only returns bookmarks for the specified user", () => {
      addBookmark("user1", "task1");
      addBookmark("user2", "task2");
      const result = listBookmarks("user1");
      expect(result.total).toBe(1);
      expect(result.bookmarks[0].taskId).toBe("task1");
    });
  });

  describe("isBookmarked", () => {
    it("returns true for a bookmarked task", () => {
      addBookmark("user1", "task1");
      expect(isBookmarked("user1", "task1")).toBe(true);
    });

    it("returns false for a non-bookmarked task", () => {
      expect(isBookmarked("user1", "task1")).toBe(false);
    });
  });

  describe("toggleBookmark", () => {
    it("adds a bookmark when not bookmarked", () => {
      const result = toggleBookmark("user1", "task1");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.bookmarked).toBe(true);
      }
    });

    it("removes the bookmark when already bookmarked", () => {
      addBookmark("user1", "task1");
      const result = toggleBookmark("user1", "task1");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.bookmarked).toBe(false);
      }
    });
  });
});
