import { describe, it, expect, beforeEach } from "vitest";
import {
  submitReport,
  listReports,
  getReport,
  getReportsForTask,
  resolveReport,
  markReviewing,
  resetReportStore,
  VALID_REPORT_REASONS,
} from "@/lib/grant-report-store";

describe("grant-report-store", () => {
  beforeEach(() => {
    resetReportStore();
  });

  describe("submitReport", () => {
    it("creates a report with valid input", () => {
      const result = submitReport({
        taskId: "task1",
        reportedBy: "user1",
        reason: "incorrect",
        description: "The reward amount is wrong.",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.report.taskId).toBe("task1");
        expect(result.report.reason).toBe("incorrect");
        expect(result.report.status).toBe("pending");
      }
    });

    it("returns 400 for empty taskId", () => {
      const result = submitReport({
        taskId: "",
        reportedBy: "user1",
        reason: "incorrect",
        description: "desc",
      });
      expect(result.ok).toBe(false);
    });

    it("returns 400 for empty reportedBy", () => {
      const result = submitReport({
        taskId: "task1",
        reportedBy: "",
        reason: "incorrect",
        description: "desc",
      });
      expect(result.ok).toBe(false);
    });

    it("returns 400 for invalid reason", () => {
      const result = submitReport({
        taskId: "task1",
        reportedBy: "user1",
        reason: "fake_reason" as never,
        description: "desc",
      });
      expect(result.ok).toBe(false);
    });

    it("returns 400 for empty description", () => {
      const result = submitReport({
        taskId: "task1",
        reportedBy: "user1",
        reason: "spam",
        description: "",
      });
      expect(result.ok).toBe(false);
    });

    it("returns 400 for description over 2000 chars", () => {
      const result = submitReport({
        taskId: "task1",
        reportedBy: "user1",
        reason: "spam",
        description: "x".repeat(2001),
      });
      expect(result.ok).toBe(false);
    });
  });

  describe("listReports", () => {
    it("returns all reports sorted newest first", () => {
      submitReport({ taskId: "t1", reportedBy: "u1", reason: "spam", description: "d1" },
        new Date("2026-01-01"));
      submitReport({ taskId: "t2", reportedBy: "u2", reason: "incorrect", description: "d2" },
        new Date("2026-01-02"));
      const result = listReports();
      expect(result.total).toBe(2);
      expect(result.reports[0].taskId).toBe("t2");
    });

    it("filters by status", () => {
      const r1 = submitReport({ taskId: "t1", reportedBy: "u1", reason: "spam", description: "d1" });
      submitReport({ taskId: "t2", reportedBy: "u2", reason: "incorrect", description: "d2" });
      if (r1.ok) {
        resolveReport(r1.report.id, "admin", "resolved");
      }
      const result = listReports({ status: "resolved" });
      expect(result.total).toBe(1);
    });

    it("filters by taskId", () => {
      submitReport({ taskId: "t1", reportedBy: "u1", reason: "spam", description: "d1" });
      submitReport({ taskId: "t2", reportedBy: "u2", reason: "incorrect", description: "d2" });
      const result = listReports({ taskId: "t1" });
      expect(result.total).toBe(1);
    });
  });

  describe("getReport", () => {
    it("returns a report by ID", () => {
      const r = submitReport({ taskId: "t1", reportedBy: "u1", reason: "spam", description: "d1" });
      if (r.ok) {
        const found = getReport(r.report.id);
        expect(found).not.toBeNull();
        expect(found!.id).toBe(r.report.id);
      }
    });

    it("returns null for non-existent ID", () => {
      expect(getReport("nonexistent")).toBeNull();
    });
  });

  describe("getReportsForTask", () => {
    it("returns all reports for a task", () => {
      submitReport({ taskId: "t1", reportedBy: "u1", reason: "spam", description: "d1" });
      submitReport({ taskId: "t1", reportedBy: "u2", reason: "incorrect", description: "d2" });
      submitReport({ taskId: "t2", reportedBy: "u3", reason: "spam", description: "d3" });
      const reports = getReportsForTask("t1");
      expect(reports.length).toBe(2);
    });
  });

  describe("resolveReport", () => {
    it("resolves a report", () => {
      const r = submitReport({ taskId: "t1", reportedBy: "u1", reason: "spam", description: "d1" });
      if (r.ok) {
        const result = resolveReport(r.report.id, "admin", "resolved", "Fixed");
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.report.status).toBe("resolved");
          expect(result.report.resolvedAt).toBeTruthy();
          expect(result.report.resolvedBy).toBe("admin");
          expect(result.report.resolutionNote).toBe("Fixed");
        }
      }
    });

    it("returns 404 for non-existent report", () => {
      const result = resolveReport("nonexistent", "admin", "resolved");
      expect(result.ok).toBe(false);
    });
  });

  describe("markReviewing", () => {
    it("marks a pending report as reviewing", () => {
      const r = submitReport({ taskId: "t1", reportedBy: "u1", reason: "spam", description: "d1" });
      if (r.ok) {
        const result = markReviewing(r.report.id);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.report.status).toBe("reviewing");
        }
      }
    });

    it("returns 400 when report is not pending", () => {
      const r = submitReport({ taskId: "t1", reportedBy: "u1", reason: "spam", description: "d1" });
      if (r.ok) {
        resolveReport(r.report.id, "admin", "resolved");
        const result = markReviewing(r.report.id);
        expect(result.ok).toBe(false);
      }
    });
  });

  describe("VALID_REPORT_REASONS", () => {
    it("includes all expected reasons", () => {
      expect(VALID_REPORT_REASONS).toContain("outdated");
      expect(VALID_REPORT_REASONS).toContain("incorrect");
      expect(VALID_REPORT_REASONS).toContain("suspicious");
      expect(VALID_REPORT_REASONS).toContain("incomplete");
      expect(VALID_REPORT_REASONS).toContain("spam");
      expect(VALID_REPORT_REASONS).toContain("other");
    });
  });
});
