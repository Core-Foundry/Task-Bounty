import { describe, it, expect } from "vitest";
import {
  escapeCSVValue,
  taskToCSVRow,
  exportTasksToCSV,
  generateExportFilename,
  getExportableFieldInfo,
  EXPORTABLE_FIELDS,
  EXCLUDED_FIELDS,
} from "@/lib/csv-export";
import type { TaskRecord } from "@/types/task-workflow";

function makeTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: "1",
    poster: "wallet_address_123",
    title: "Test Grant",
    description: "A test grant",
    reward: 2_000_000,
    deadline: 1893456000,
    maxSubmissions: 5,
    submissionCount: 2,
    status: "open",
    createdAt: "2026-01-01T00:00:00Z",
    difficulty: "intermediate",
    technologies: ["Rust", "Soroban"],
    organization: "TestOrg",
    ...overrides,
  };
}

describe("csv-export", () => {
  describe("escapeCSVValue", () => {
    it("returns empty string for null/undefined", () => {
      expect(escapeCSVValue(null)).toBe("");
      expect(escapeCSVValue(undefined)).toBe("");
    });

    it("returns plain string without quotes", () => {
      expect(escapeCSVValue("hello")).toBe("hello");
    });

    it("quotes values with commas", () => {
      expect(escapeCSVValue("hello, world")).toBe('"hello, world"');
    });

    it("quotes values with quotes and escapes them", () => {
      expect(escapeCSVValue('say "hi"')).toBe('"say ""hi"""');
    });

    it("quotes values with newlines", () => {
      expect(escapeCSVValue("line1\nline2")).toBe('"line1\nline2"');
    });
  });

  describe("taskToCSVRow", () => {
    it("converts a task to a CSV row", () => {
      const task = makeTask();
      const row = taskToCSVRow(task, [...EXPORTABLE_FIELDS]);
      expect(row).toContain("Test Grant");
      expect(row).toContain("2000000");
    });

    it("joins technologies with semicolons", () => {
      const task = makeTask({ technologies: ["Rust", "Soroban", "Stellar"] });
      const row = taskToCSVRow(task, [...EXPORTABLE_FIELDS]);
      expect(row).toContain("Rust; Soroban; Stellar");
    });
  });

  describe("exportTasksToCSV", () => {
    it("generates CSV with header", () => {
      const tasks = [makeTask(), makeTask({ id: "2", title: "Grant 2" })];
      const csv = exportTasksToCSV(tasks);
      expect(csv.split("\n")[0]).toContain("id");
      expect(csv.split("\n")[0]).toContain("title");
    });

    it("excludes poster (sensitive field) by default", () => {
      const tasks = [makeTask()];
      const csv = exportTasksToCSV(tasks);
      expect(csv).not.toContain("wallet_address_123");
    });

    it("can skip header", () => {
      const tasks = [makeTask()];
      const csv = exportTasksToCSV(tasks, { includeHeader: false });
      expect(csv.split("\n")[0]).not.toContain("id");
    });

    it("supports filtering", () => {
      const tasks = [
        makeTask({ id: "1", status: "open" }),
        makeTask({ id: "2", status: "completed" }),
      ];
      const csv = exportTasksToCSV(tasks, {
        filter: (t) => t.status === "open",
      });
      expect(csv).toContain("Test Grant");
      // Should only have one data row (plus header)
      expect(csv.split("\n").length).toBe(2);
    });

    it("handles empty input", () => {
      const csv = exportTasksToCSV([]);
      expect(csv.split("\n").length).toBe(1); // just header
    });
  });

  describe("generateExportFilename", () => {
    it("generates a filename with date", () => {
      const filename = generateExportFilename("grants", new Date("2026-01-15"));
      expect(filename).toBe("grants_export_2026-01-15.csv");
    });

    it("uses default prefix", () => {
      const filename = generateExportFilename(undefined, new Date("2026-01-15"));
      expect(filename).toBe("grants_export_2026-01-15.csv");
    });
  });

  describe("getExportableFieldInfo", () => {
    it("returns field info array", () => {
      const info = getExportableFieldInfo();
      expect(info.length).toBe(EXPORTABLE_FIELDS.length);
      expect(info[0].field).toBe("id");
      expect(info[0].label).toBe("ID");
    });
  });

  describe("EXCLUDED_FIELDS", () => {
    it("includes poster", () => {
      expect(EXCLUDED_FIELDS).toContain("poster");
    });
  });
});
