import { describe, it, expect, beforeEach } from "vitest";
import {
  saveDraft,
  getDraft,
  getLastSavedAt,
  listDrafts,
  deleteDraft,
  deleteDraftByTask,
  resetDraftStore,
  DEFAULT_AUTOSAVE_INTERVAL_MS,
  MAX_FORM_DATA_SIZE,
} from "@/lib/draft-autosave";

describe("draft-autosave", () => {
  beforeEach(() => {
    resetDraftStore();
  });

  describe("saveDraft", () => {
    it("creates a new draft", () => {
      const result = saveDraft({
        userId: "user1",
        taskId: "task1",
        formData: '{"title":"My Application"}',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.draft.userId).toBe("user1");
        expect(result.draft.taskId).toBe("task1");
        expect(result.draft.formData).toBe('{"title":"My Application"}');
        expect(result.draft.autoSaved).toBe(true);
        expect(result.draft.lastSavedAt).toBeTruthy();
      }
    });

    it("updates an existing draft (upsert) for same user+task", () => {
      saveDraft({
        userId: "user1",
        taskId: "task1",
        formData: "version1",
      });
      const result = saveDraft({
        userId: "user1",
        taskId: "task1",
        formData: "version2",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.draft.formData).toBe("version2");
      }
      const list = listDrafts("user1");
      expect(list.total).toBe(1);
    });

    it("preserves createdAt on update but changes lastSavedAt", () => {
      const r1 = saveDraft({
        userId: "user1",
        taskId: "task1",
        formData: "v1",
      }, new Date("2026-01-01"));
      const r2 = saveDraft({
        userId: "user1",
        taskId: "task1",
        formData: "v2",
      }, new Date("2026-01-02"));
      expect(r2.ok).toBe(true);
      if (r1.ok && r2.ok) {
        expect(r2.draft.createdAt).toBe(r1.draft.createdAt);
        expect(r2.draft.lastSavedAt).not.toBe(r1.draft.lastSavedAt);
        expect(r2.draft.lastSavedAt).toBe("2026-01-02T00:00:00.000Z");
      }
    });

    it("returns 400 for empty userId", () => {
      const result = saveDraft({
        userId: "",
        taskId: "task1",
        formData: "data",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(400);
    });

    it("returns 400 for empty taskId", () => {
      const result = saveDraft({
        userId: "user1",
        taskId: "",
        formData: "data",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(400);
    });

    it("returns 400 when form data exceeds max size", () => {
      const result = saveDraft({
        userId: "user1",
        taskId: "task1",
        formData: "x".repeat(MAX_FORM_DATA_SIZE + 1),
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(400);
    });

    it("sets autoSaved to false when autoSaved is false", () => {
      const result = saveDraft({
        userId: "user1",
        taskId: "task1",
        formData: "data",
        autoSaved: false,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.draft.autoSaved).toBe(false);
      }
    });
  });

  describe("getDraft", () => {
    it("retrieves a saved draft", () => {
      saveDraft({ userId: "user1", taskId: "task1", formData: "data" });
      const draft = getDraft("user1", "task1");
      expect(draft).not.toBeNull();
      expect(draft!.formData).toBe("data");
    });

    it("returns null for non-existent draft", () => {
      const draft = getDraft("user1", "task1");
      expect(draft).toBeNull();
    });
  });

  describe("getLastSavedAt", () => {
    it("returns the last saved timestamp", () => {
      saveDraft(
        { userId: "user1", taskId: "task1", formData: "data" },
        new Date("2026-01-01T12:00:00Z"),
      );
      const ts = getLastSavedAt("user1", "task1");
      expect(ts).toBe("2026-01-01T12:00:00.000Z");
    });

    it("returns null when no draft exists", () => {
      expect(getLastSavedAt("user1", "task1")).toBeNull();
    });
  });

  describe("listDrafts", () => {
    it("returns all drafts for a user sorted newest first", () => {
      saveDraft({ userId: "user1", taskId: "t1", formData: "d1" }, new Date("2026-01-01"));
      saveDraft({ userId: "user1", taskId: "t2", formData: "d2" }, new Date("2026-01-02"));
      const result = listDrafts("user1");
      expect(result.total).toBe(2);
      expect(result.drafts[0].taskId).toBe("t2");
      expect(result.drafts[1].taskId).toBe("t1");
    });

    it("returns empty for user with no drafts", () => {
      const result = listDrafts("nobody");
      expect(result.total).toBe(0);
      expect(result.drafts).toEqual([]);
    });
  });

  describe("deleteDraft", () => {
    it("deletes a draft by ID", () => {
      const saveResult = saveDraft({ userId: "user1", taskId: "task1", formData: "data" });
      if (saveResult.ok) {
        const result = deleteDraft("user1", saveResult.draft.id);
        expect(result.ok).toBe(true);
        expect(getDraft("user1", "task1")).toBeNull();
      }
    });

    it("returns 404 for non-existent draft", () => {
      const result = deleteDraft("user1", "nonexistent");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(404);
    });

    it("returns 404 when deleting another user's draft", () => {
      const saveResult = saveDraft({ userId: "user1", taskId: "task1", formData: "data" });
      if (saveResult.ok) {
        const result = deleteDraft("user2", saveResult.draft.id);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.status).toBe(404);
      }
    });
  });

  describe("deleteDraftByTask", () => {
    it("deletes a draft by user+task pair", () => {
      saveDraft({ userId: "user1", taskId: "task1", formData: "data" });
      const result = deleteDraftByTask("user1", "task1");
      expect(result.ok).toBe(true);
      expect(getDraft("user1", "task1")).toBeNull();
    });

    it("returns 404 for non-existent draft", () => {
      const result = deleteDraftByTask("user1", "task1");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(404);
    });
  });

  describe("constants", () => {
    it("exports DEFAULT_AUTOSAVE_INTERVAL_MS", () => {
      expect(DEFAULT_AUTOSAVE_INTERVAL_MS).toBe(30_000);
    });

    it("exports MAX_FORM_DATA_SIZE as 1MB", () => {
      expect(MAX_FORM_DATA_SIZE).toBe(1_048_576);
    });
  });
});
