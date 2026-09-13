import { describe, it, expect, beforeEach } from "vitest";
import {
  recordSubmission,
  updateSubmissionStatus,
  getSubmissionHistory,
  getSubmissionEntry,
  getSubmissionCount,
  getSubmissionStatusBreakdown,
  resetSubmissionHistoryStore,
} from "@/lib/submission-history";

describe("submission-history", () => {
  beforeEach(() => {
    resetSubmissionHistoryStore();
  });

  describe("recordSubmission", () => {
    it("records a submission entry", () => {
      recordSubmission(
        "sub1", "task1", "Test Task", "user1",
        "https://example.com", "My submission",
        "2026-01-01T00:00:00Z", "pending",
        1000000, "TestOrg",
      );
      const result = getSubmissionHistory({ userId: "user1" });
      expect(result.total).toBe(1);
      expect(result.entries[0].submissionId).toBe("sub1");
      expect(result.entries[0].taskTitle).toBe("Test Task");
    });

    it("records multiple submissions for the same user", () => {
      recordSubmission("s1", "t1", "Task 1", "user1", "", "", "2026-01-01", "pending", 0, "");
      recordSubmission("s2", "t2", "Task 2", "user1", "", "", "2026-01-02", "pending", 0, "");
      const result = getSubmissionHistory({ userId: "user1" });
      expect(result.total).toBe(2);
    });

    it("separates submissions by user", () => {
      recordSubmission("s1", "t1", "Task 1", "user1", "", "", "2026-01-01", "pending", 0, "");
      recordSubmission("s2", "t2", "Task 2", "user2", "", "", "2026-01-01", "pending", 0, "");
      expect(getSubmissionHistory({ userId: "user1" }).total).toBe(1);
      expect(getSubmissionHistory({ userId: "user2" }).total).toBe(1);
    });
  });

  describe("updateSubmissionStatus", () => {
    it("updates the status of an existing submission", () => {
      recordSubmission("s1", "t1", "Task 1", "user1", "", "", "2026-01-01", "pending", 0, "");
      updateSubmissionStatus("s1", "approved");
      const entry = getSubmissionEntry("s1");
      expect(entry).not.toBeNull();
      expect(entry!.status).toBe("approved");
    });

    it("does nothing for non-existent submission", () => {
      updateSubmissionStatus("nonexistent", "approved");
      expect(getSubmissionEntry("nonexistent")).toBeNull();
    });
  });

  describe("getSubmissionHistory", () => {
    beforeEach(() => {
      recordSubmission("s1", "t1", "Task 1", "user1", "", "desc1", "2026-01-01T00:00:00Z", "pending", 100, "OrgA");
      recordSubmission("s2", "t2", "Task 2", "user1", "", "desc2", "2026-01-02T00:00:00Z", "approved", 200, "OrgB");
      recordSubmission("s3", "t3", "Task 3", "user1", "", "desc3", "2026-01-03T00:00:00Z", "rejected", 300, "OrgC");
    });

    it("returns all entries sorted newest first by default", () => {
      const result = getSubmissionHistory({ userId: "user1" });
      expect(result.total).toBe(3);
      expect(result.entries[0].submittedAt).toBe("2026-01-03T00:00:00Z");
      expect(result.entries[2].submittedAt).toBe("2026-01-01T00:00:00Z");
    });

    it("sorts oldest first", () => {
      const result = getSubmissionHistory({ userId: "user1", sort: "oldest" });
      expect(result.entries[0].submittedAt).toBe("2026-01-01T00:00:00Z");
    });

    it("sorts by status (pending -> approved -> rejected)", () => {
      const result = getSubmissionHistory({ userId: "user1", sort: "status" });
      expect(result.entries[0].status).toBe("pending");
      expect(result.entries[1].status).toBe("approved");
      expect(result.entries[2].status).toBe("rejected");
    });

    it("filters by status", () => {
      const result = getSubmissionHistory({ userId: "user1", status: "approved" });
      expect(result.total).toBe(1);
      expect(result.entries[0].status).toBe("approved");
    });

    it("paginates results", () => {
      const result = getSubmissionHistory({ userId: "user1", page: 1, pageSize: 2 });
      expect(result.entries.length).toBe(2);
      expect(result.total).toBe(3);
      expect(result.totalPages).toBe(2);

      const page2 = getSubmissionHistory({ userId: "user1", page: 2, pageSize: 2 });
      expect(page2.entries.length).toBe(1);
    });

    it("returns empty for user with no submissions", () => {
      const result = getSubmissionHistory({ userId: "nobody" });
      expect(result.total).toBe(0);
      expect(result.entries).toEqual([]);
    });
  });

  describe("getSubmissionCount", () => {
    it("returns total count for a user", () => {
      recordSubmission("s1", "t1", "Task 1", "user1", "", "", "2026-01-01", "pending", 0, "");
      recordSubmission("s2", "t2", "Task 2", "user1", "", "", "2026-01-02", "approved", 0, "");
      expect(getSubmissionCount("user1")).toBe(2);
    });

    it("returns 0 for user with no submissions", () => {
      expect(getSubmissionCount("nobody")).toBe(0);
    });
  });

  describe("getSubmissionStatusBreakdown", () => {
    it("returns counts by status", () => {
      recordSubmission("s1", "t1", "T1", "user1", "", "", "2026-01-01", "pending", 0, "");
      recordSubmission("s2", "t2", "T2", "user1", "", "", "2026-01-02", "pending", 0, "");
      recordSubmission("s3", "t3", "T3", "user1", "", "", "2026-01-03", "approved", 0, "");
      const breakdown = getSubmissionStatusBreakdown("user1");
      expect(breakdown.pending).toBe(2);
      expect(breakdown.approved).toBe(1);
      expect(breakdown.rejected).toBe(0);
    });
  });
});
