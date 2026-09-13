import { describe, it, expect } from "vitest";
import {
  validateField,
  validateRow,
  validateImportData,
  parseCSV,
  GRANT_IMPORT_SCHEMA,
} from "@/lib/import-validation";

describe("import-validation", () => {
  describe("validateField", () => {
    it("returns null for valid required string", () => {
      expect(validateField("My Title", { name: "title", type: "string", required: true })).toBeNull();
    });

    it("returns error for missing required field", () => {
      expect(validateField("", { name: "title", type: "string", required: true })).toContain("required");
    });

    it("returns null for missing optional field", () => {
      expect(validateField("", { name: "org", type: "string", required: false })).toBeNull();
    });

    it("validates maxLength", () => {
      expect(
        validateField("x".repeat(201), { name: "title", type: "string", required: true, maxLength: 200 }),
      ).toContain("at most 200");
    });

    it("validates enum values", () => {
      expect(
        validateField("expert", { name: "difficulty", type: "string", required: false, enum: ["beginner", "intermediate", "advanced"] }),
      ).toContain("one of");
    });

    it("validates number min", () => {
      expect(
        validateField(500, { name: "reward", type: "number", required: true, min: 1_000_000 }),
      ).toContain("at least");
    });

    it("returns null for valid number", () => {
      expect(
        validateField(2_000_000, { name: "reward", type: "number", required: true, min: 1_000_000 }),
      ).toBeNull();
    });

    it("validates unix_timestamp is in the future", () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 1000;
      expect(
        validateField(pastTimestamp, { name: "deadline", type: "unix_timestamp", required: true }),
      ).toContain("future");
    });

    it("validates unix_timestamp is not too far in the future", () => {
      const farFuture = Math.floor(Date.now() / 1000) + 400 * 24 * 3600;
      expect(
        validateField(farFuture, { name: "deadline", type: "unix_timestamp", required: true }),
      ).toContain("365 days");
    });
  });

  describe("validateRow", () => {
    it("returns no errors for a valid row", () => {
      const errors = validateRow(
        {
          title: "Test Grant",
          description: "A test grant",
          reward: 2_000_000,
          deadline: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
          maxSubmissions: 5,
          poster: "user1",
        },
        GRANT_IMPORT_SCHEMA,
        1,
      );
      expect(errors.length).toBe(0);
    });

    it("returns errors for missing required fields", () => {
      const errors = validateRow({}, GRANT_IMPORT_SCHEMA, 1);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.field === "title")).toBe(true);
      expect(errors.some((e) => e.field === "description")).toBe(true);
      expect(errors.some((e) => e.field === "reward")).toBe(true);
    });
  });

  describe("validateImportData", () => {
    it("returns valid rows and errors separately", () => {
      const futureDeadline = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
      const rows = [
        { title: "Valid", description: "desc", reward: 2_000_000, deadline: futureDeadline, maxSubmissions: 3, poster: "u1" },
        { title: "Invalid", description: "", reward: 500, deadline: "not_a_number", maxSubmissions: 0, poster: "" },
      ];

      const result = validateImportData(rows, GRANT_IMPORT_SCHEMA);
      expect(result.totalRows).toBe(2);
      expect(result.validCount).toBe(1);
      expect(result.errorCount).toBeGreaterThan(0);
      expect(result.valid[0].data.title).toBe("Valid");
    });

    it("handles empty input", () => {
      const result = validateImportData([], GRANT_IMPORT_SCHEMA);
      expect(result.totalRows).toBe(0);
      expect(result.validCount).toBe(0);
      expect(result.errorCount).toBe(0);
    });
  });

  describe("parseCSV", () => {
    it("parses simple CSV", () => {
      const csv = "title,description\nGrant 1,Description 1\nGrant 2,Description 2";
      const rows = parseCSV(csv);
      expect(rows.length).toBe(2);
      expect(rows[0].title).toBe("Grant 1");
      expect(rows[1].description).toBe("Description 2");
    });

    it("handles quoted fields with commas", () => {
      const csv = 'title,description\n"Grant, 1","Description, with comma"';
      const rows = parseCSV(csv);
      expect(rows[0].title).toBe("Grant, 1");
      expect(rows[0].description).toBe("Description, with comma");
    });

    it("handles escaped quotes", () => {
      const csv = 'title\n"Grant ""quoted"" 1"';
      const rows = parseCSV(csv);
      expect(rows[0].title).toBe('Grant "quoted" 1');
    });

    it("handles empty input", () => {
      expect(parseCSV("")).toEqual([]);
    });
  });
});
