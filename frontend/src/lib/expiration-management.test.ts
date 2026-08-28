import { describe, it, expect } from "vitest";
import {
  isExpired,
  isApproachingDeadline,
  hoursUntilDeadline,
  checkExpirations,
  filterOutExpired,
  getActiveTasks,
  getExpiredTasks,
  getExpirationStatus,
  EXPIRATION_GRACE_PERIOD_SECONDS,
  UPCOMING_EXPIRATION_WINDOW_SECONDS,
} from "@/lib/expiration-management";
import type { TaskRecord } from "@/types/task-workflow";

function makeTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: "1",
    poster: "user1",
    title: "Test Task",
    description: "desc",
    reward: 2_000_000,
    deadline: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
    maxSubmissions: 5,
    submissionCount: 0,
    status: "open",
    createdAt: "2026-01-01T00:00:00Z",
    difficulty: "intermediate",
    technologies: [],
    organization: "",
    ...overrides,
  };
}

describe("expiration-management", () => {
  describe("isExpired", () => {
    it("returns false for a task with a future deadline", () => {
      expect(isExpired(makeTask())).toBe(false);
    });

    it("returns true for a task with a past deadline (beyond grace period)", () => {
      const pastDeadline = Math.floor(Date.now() / 1000) - EXPIRATION_GRACE_PERIOD_SECONDS - 100;
      expect(isExpired(makeTask({ deadline: pastDeadline }))).toBe(true);
    });

    it("returns false within the grace period", () => {
      const justPast = Math.floor(Date.now() / 1000) - 100;
      expect(isExpired(makeTask({ deadline: justPast }))).toBe(false);
    });

    it("returns false for completed tasks even if deadline passed", () => {
      const pastDeadline = Math.floor(Date.now() / 1000) - 100000;
      expect(isExpired(makeTask({ deadline: pastDeadline, status: "completed" }))).toBe(false);
    });

    it("returns false for cancelled tasks", () => {
      const pastDeadline = Math.floor(Date.now() / 1000) - 100000;
      expect(isExpired(makeTask({ deadline: pastDeadline, status: "cancelled" }))).toBe(false);
    });
  });

  describe("isApproachingDeadline", () => {
    it("returns true for a task within the warning window", () => {
      const soonDeadline = Math.floor(Date.now() / 1000) + 12 * 3600; // 12 hours
      expect(isApproachingDeadline(makeTask({ deadline: soonDeadline }))).toBe(true);
    });

    it("returns false for a task far from deadline", () => {
      const farDeadline = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
      expect(isApproachingDeadline(makeTask({ deadline: farDeadline }))).toBe(false);
    });

    it("returns false for completed tasks", () => {
      const soonDeadline = Math.floor(Date.now() / 1000) + 12 * 3600;
      expect(isApproachingDeadline(makeTask({ deadline: soonDeadline, status: "completed" }))).toBe(false);
    });
  });

  describe("hoursUntilDeadline", () => {
    it("returns positive hours for future deadline", () => {
      const deadline = Math.floor(Date.now() / 1000) + 48 * 3600;
      expect(hoursUntilDeadline(makeTask({ deadline }))).toBe(48);
    });

    it("returns negative hours for past deadline", () => {
      const deadline = Math.floor(Date.now() / 1000) - 24 * 3600;
      expect(hoursUntilDeadline(makeTask({ deadline }))).toBe(-24);
    });
  });

  describe("checkExpirations", () => {
    it("identifies expired and upcoming tasks", () => {
      const tasks = [
        makeTask({ id: "1", deadline: Math.floor(Date.now() / 1000) + 7 * 24 * 3600 }),
        makeTask({ id: "2", deadline: Math.floor(Date.now() / 1000) - 100000 }),
        makeTask({ id: "3", deadline: Math.floor(Date.now() / 1000) + 12 * 3600 }),
      ];

      const result = checkExpirations(tasks);
      expect(result.checked).toBe(3);
      expect(result.expired).toBe(1);
      expect(result.expiredTasks[0].id).toBe("2");
      expect(result.upcomingExpirations.length).toBe(1);
      expect(result.upcomingExpirations[0].task.id).toBe("3");
    });

    it("sorts upcoming expirations by soonest first", () => {
      const tasks = [
        makeTask({ id: "1", deadline: Math.floor(Date.now() / 1000) + 20 * 3600 }),
        makeTask({ id: "2", deadline: Math.floor(Date.now() / 1000) + 5 * 3600 }),
      ];

      const result = checkExpirations(tasks);
      expect(result.upcomingExpirations[0].hoursUntilDeadline).toBeLessThan(
        result.upcomingExpirations[1].hoursUntilDeadline,
      );
    });
  });

  describe("filterOutExpired", () => {
    it("removes expired tasks", () => {
      const tasks = [
        makeTask({ id: "1", deadline: Math.floor(Date.now() / 1000) + 7 * 24 * 3600 }),
        makeTask({ id: "2", deadline: Math.floor(Date.now() / 1000) - 100000 }),
      ];
      const filtered = filterOutExpired(tasks);
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe("1");
    });
  });

  describe("getActiveTasks", () => {
    it("excludes expired and terminal tasks", () => {
      const tasks = [
        makeTask({ id: "1", deadline: Math.floor(Date.now() / 1000) + 7 * 24 * 3600 }),
        makeTask({ id: "2", deadline: Math.floor(Date.now() / 1000) - 100000 }),
        makeTask({ id: "3", status: "completed", deadline: Math.floor(Date.now() / 1000) + 7 * 24 * 3600 }),
      ];
      const active = getActiveTasks(tasks);
      expect(active.length).toBe(1);
      expect(active[0].id).toBe("1");
    });
  });

  describe("getExpiredTasks", () => {
    it("returns only expired tasks", () => {
      const tasks = [
        makeTask({ id: "1", deadline: Math.floor(Date.now() / 1000) + 7 * 24 * 3600 }),
        makeTask({ id: "2", deadline: Math.floor(Date.now() / 1000) - 100000 }),
      ];
      const expired = getExpiredTasks(tasks);
      expect(expired.length).toBe(1);
      expect(expired[0].id).toBe("2");
    });
  });

  describe("getExpirationStatus", () => {
    it("returns cancelled for open task", () => {
      expect(getExpirationStatus({ status: "open" })).toBe("cancelled");
    });

    it("returns cancelled for in_progress task", () => {
      expect(getExpirationStatus({ status: "in_progress" })).toBe("cancelled");
    });

    it("returns completed for completed task", () => {
      expect(getExpirationStatus({ status: "completed" })).toBe("completed");
    });

    it("returns cancelled for cancelled task", () => {
      expect(getExpirationStatus({ status: "cancelled" })).toBe("cancelled");
    });
  });

  describe("constants", () => {
    it("exports grace period as 1 hour", () => {
      expect(EXPIRATION_GRACE_PERIOD_SECONDS).toBe(3600);
    });

    it("exports upcoming window as 24 hours", () => {
      expect(UPCOMING_EXPIRATION_WINDOW_SECONDS).toBe(24 * 3600);
    });
  });
});
