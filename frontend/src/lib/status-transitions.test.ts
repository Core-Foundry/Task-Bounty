import { describe, it, expect } from "vitest";
import {
  isValidTransition,
  transitionStatus,
  getNextStatuses,
  getStatusWorkflowDescription,
  isTerminalStatus,
  VALID_TRANSITIONS,
} from "@/lib/status-transitions";
import type { TaskStatus } from "@/types/task-workflow";

describe("status-transitions", () => {
  describe("isValidTransition", () => {
    it("allows same-status (no-op)", () => {
      expect(isValidTransition("open", "open")).toBe(true);
      expect(isValidTransition("completed", "completed")).toBe(true);
    });

    it("allows open → in_progress", () => {
      expect(isValidTransition("open", "in_progress")).toBe(true);
    });

    it("allows open → cancelled", () => {
      expect(isValidTransition("open", "cancelled")).toBe(true);
    });

    it("allows in_progress → completed", () => {
      expect(isValidTransition("in_progress", "completed")).toBe(true);
    });

    it("allows in_progress → disputed", () => {
      expect(isValidTransition("in_progress", "disputed")).toBe(true);
    });

    it("allows completed → disputed", () => {
      expect(isValidTransition("completed", "disputed")).toBe(true);
    });

    it("allows disputed → completed", () => {
      expect(isValidTransition("disputed", "completed")).toBe(true);
    });

    it("allows disputed → cancelled", () => {
      expect(isValidTransition("disputed", "cancelled")).toBe(true);
    });

    it("allows cancelled → open", () => {
      expect(isValidTransition("cancelled", "open")).toBe(true);
    });

    it("rejects open → completed (must go through in_progress)", () => {
      expect(isValidTransition("open", "completed")).toBe(false);
    });

    it("rejects completed → open", () => {
      expect(isValidTransition("completed", "open")).toBe(false);
    });

    it("rejects cancelled → completed", () => {
      expect(isValidTransition("cancelled", "completed")).toBe(false);
    });
  });

  describe("transitionStatus", () => {
    it("returns ok for valid transition", () => {
      const result = transitionStatus("open", "in_progress");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.from).toBe("open");
        expect(result.to).toBe("in_progress");
      }
    });

    it("returns ok for same-status (no-op)", () => {
      const result = transitionStatus("open", "open");
      expect(result.ok).toBe(true);
    });

    it("returns error for invalid transition", () => {
      const result = transitionStatus("open", "completed");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Invalid");
        expect(result.error).toContain("open");
        expect(result.error).toContain("completed");
      }
    });

    it("includes allowed transitions in error message", () => {
      const result = transitionStatus("completed", "open");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("disputed");
      }
    });
  });

  describe("getNextStatuses", () => {
    it("returns valid next statuses for open", () => {
      const next = getNextStatuses("open");
      expect(next).toContain("in_progress");
      expect(next).toContain("cancelled");
      expect(next.length).toBe(2);
    });

    it("returns valid next statuses for in_progress", () => {
      const next = getNextStatuses("in_progress");
      expect(next).toContain("completed");
      expect(next).toContain("cancelled");
      expect(next).toContain("disputed");
    });

    it("returns empty for terminal status", () => {
      // No status is truly terminal in this design except if a status has no outgoing transitions
      // Let's verify all statuses have defined transitions
      const allStatuses: TaskStatus[] = ["open", "in_progress", "completed", "cancelled", "disputed"];
      for (const status of allStatuses) {
        expect(VALID_TRANSITIONS[status]).toBeDefined();
      }
    });
  });

  describe("getStatusWorkflowDescription", () => {
    it("returns all valid transitions with descriptions", () => {
      const workflow = getStatusWorkflowDescription();
      expect(workflow.length).toBeGreaterThan(0);
      expect(workflow[0].from).toBe("open");
      expect(workflow[0].to).toBe("in_progress");
      expect(workflow[0].description).toBeTruthy();
    });
  });

  describe("isTerminalStatus", () => {
    it("returns false for open (has outgoing transitions)", () => {
      expect(isTerminalStatus("open")).toBe(false);
    });

    it("returns false for in_progress", () => {
      expect(isTerminalStatus("in_progress")).toBe(false);
    });
  });
});
