import { describe, it, expect, beforeEach } from "vitest";
import {
  createComparison,
  getComparison,
  addToComparison,
  removeFromComparison,
  clearComparison,
  resetComparisonStore,
  MAX_COMPARISON_SIZE,
} from "@/lib/grant-comparison";

describe("grant-comparison", () => {
  beforeEach(() => {
    resetComparisonStore();
  });

  describe("createComparison", () => {
    it("creates a comparison with valid input", () => {
      const result = createComparison("user1", ["task1", "task2"]);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.comparison.taskIds).toEqual(["task1", "task2"]);
      }
    });

    it("returns 400 for fewer than 2 tasks", () => {
      const result = createComparison("user1", ["task1"]);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(400);
    });

    it("returns 400 for more than MAX_COMPARISON_SIZE tasks", () => {
      const tasks = Array.from({ length: MAX_COMPARISON_SIZE + 1 }, (_, i) => `t${i}`);
      const result = createComparison("user1", tasks);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(400);
    });

    it("deduplicates task IDs", () => {
      const result = createComparison("user1", ["task1", "task1", "task2"]);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.comparison.taskIds).toEqual(["task1", "task2"]);
      }
    });

    it("returns 400 for empty userId", () => {
      const result = createComparison("", ["t1", "t2"]);
      expect(result.ok).toBe(false);
    });
  });

  describe("getComparison", () => {
    it("returns null when no comparison exists", () => {
      expect(getComparison("user1")).toBeNull();
    });

    it("returns the created comparison", () => {
      createComparison("user1", ["t1", "t2"]);
      const result = getComparison("user1");
      expect(result).not.toBeNull();
      expect(result!.taskIds).toEqual(["t1", "t2"]);
    });
  });

  describe("addToComparison", () => {
    it("adds a task to existing comparison", () => {
      createComparison("user1", ["t1", "t2"]);
      const result = addToComparison("user1", "t3");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.comparison.taskIds).toContain("t3");
        expect(result.comparison.taskIds.length).toBe(3);
      }
    });

    it("does not add duplicates", () => {
      createComparison("user1", ["t1", "t2"]);
      const result = addToComparison("user1", "t1");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.comparison.taskIds).toEqual(["t1", "t2"]);
      }
    });

    it("returns 409 when exceeding max size", () => {
      const tasks = Array.from({ length: MAX_COMPARISON_SIZE }, (_, i) => `t${i}`);
      createComparison("user1", tasks);
      const result = addToComparison("user1", "t_new");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(409);
    });
  });

  describe("removeFromComparison", () => {
    it("removes a task from the comparison", () => {
      createComparison("user1", ["t1", "t2", "t3"]);
      const result = removeFromComparison("user1", "t2");
      expect(result.ok).toBe(true);
      if (result.ok && result.comparison) {
        expect(result.comparison.taskIds).not.toContain("t2");
        expect(result.comparison.taskIds.length).toBe(2);
      }
    });

    it("clears comparison when all tasks removed", () => {
      createComparison("user1", ["t1", "t2"]);
      removeFromComparison("user1", "t1");
      removeFromComparison("user1", "t2");
      expect(getComparison("user1")).toBeNull();
    });
  });

  describe("clearComparison", () => {
    it("clears the comparison set", () => {
      createComparison("user1", ["t1", "t2"]);
      clearComparison("user1");
      expect(getComparison("user1")).toBeNull();
    });
  });
});
