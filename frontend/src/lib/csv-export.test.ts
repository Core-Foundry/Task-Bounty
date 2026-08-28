import { describe, expect, it } from "vitest";
import {
  generateGrantsCsv,
  mapTaskToExportRecord,
  sanitizeCsvCell,
  CSV_EXPORT_HEADERS,
} from "./csv-export";
import type { TaskRecord } from "@/types/task-workflow";

const MOCK_TASK_1: TaskRecord = {
  id: "1",
  poster: "GPOSTER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  title: "Build DEX Interface",
  description: "Create React frontend with swap UI, charts & wallet integration.",
  reward: 50_000_000,
  deadline: 1774780800,
  maxSubmissions: 5,
  submissionCount: 2,
  status: "open",
  createdAt: "2026-03-20T12:00:00.000Z",
  difficulty: "intermediate",
  technologies: ["React", "TypeScript", "Soroban"],
  organization: "Stellar Foundation",
};

const MOCK_TASK_INJECTION: TaskRecord = {
  id: "2",
  poster: "GATTACKER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  title: "=cmd|' /C calc'!A0",
  description: "-@SUM(1+1)*cmd|' /C calc'!A0",
  reward: 10_000_000,
  deadline: 1774780800,
  maxSubmissions: 1,
  submissionCount: 0,
  status: "open",
  createdAt: "2026-03-20T12:00:00.000Z",
  difficulty: "beginner",
  technologies: ["Security", "+Formula"],
  organization: "@EvilOrg",
};

describe("csv-export utility", () => {
  describe("sanitizeCsvCell", () => {
    it("handles null and undefined safely", () => {
      expect(sanitizeCsvCell(null)).toBe("");
      expect(sanitizeCsvCell(undefined)).toBe("");
    });

    it("returns simple strings unchanged", () => {
      expect(sanitizeCsvCell("Simple String")).toBe("Simple String");
      expect(sanitizeCsvCell(12345)).toBe("12345");
    });

    it("escapes cells containing commas and quotes per RFC 4180", () => {
      expect(sanitizeCsvCell("Hello, world")).toBe('"Hello, world"');
      expect(sanitizeCsvCell('Hello "quoted" text')).toBe('"Hello ""quoted"" text"');
      expect(sanitizeCsvCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
    });

    it("neutralizes CSV formula injection starting characters (=, +, -, @, \\t, \\r)", () => {
      expect(sanitizeCsvCell("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
      expect(sanitizeCsvCell("+123456")).toBe("'+123456");
      expect(sanitizeCsvCell("-100")).toBe("'-100");
      expect(sanitizeCsvCell("@SUM")).toBe("'@SUM");
      expect(sanitizeCsvCell("\tTAB")).toBe("'\tTAB");
    });

    it("wraps and escapes injected formulas that also contain commas or quotes", () => {
      const injectedWithComma = sanitizeCsvCell('=cmd|"/C calc",A0');
      expect(injectedWithComma).toBe('"\'=cmd|""/C calc"",A0"');
    });
  });

  describe("mapTaskToExportRecord", () => {
    it("maps TaskRecord correctly with human-readable XLM conversions", () => {
      const record = mapTaskToExportRecord(MOCK_TASK_1);
      expect(record.id).toBe("1");
      expect(record.title).toBe("Build DEX Interface");
      expect(record.rewardStroops).toBe(50_000_000);
      expect(record.rewardXlm).toBe("5");
      expect(record.technologies).toBe("React; TypeScript; Soroban");
      expect(record.organization).toBe("Stellar Foundation");
      expect(record.posterAddress).toBe("GPOSTER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    });
  });

  describe("generateGrantsCsv", () => {
    it("generates CSV with headers and data rows", () => {
      const csv = generateGrantsCsv([MOCK_TASK_1]);
      const lines = csv.split("\r\n");

      expect(lines.length).toBe(2);
      expect(lines[0]).toContain("Grant ID,Title,Description,Reward (Stroops)");
      expect(lines[1]).toContain("1,Build DEX Interface");
      expect(lines[1]).toContain("50000000");
      expect(lines[1]).toContain("React; TypeScript; Soroban");
    });

    it("prevents formula execution across all generated CSV fields", () => {
      const csv = generateGrantsCsv([MOCK_TASK_INJECTION]);
      const lines = csv.split("\r\n");
      const dataRow = lines[1];

      // Leading '=' is neutralized with single quote
      expect(dataRow).toContain("'=cmd");
      // Leading '-@' is neutralized
      expect(dataRow).toContain("'-@SUM");
      // Leading '@' in org is neutralized
      expect(dataRow).toContain("'@EvilOrg");
    });

    it("handles empty task arrays gracefully with header only", () => {
      const csv = generateGrantsCsv([]);
      expect(csv).toContain("Grant ID,Title,Description");
      const lines = csv.split("\r\n");
      expect(lines.length).toBe(1);
    });

    it("supports omitting headers when requested", () => {
      const csv = generateGrantsCsv([MOCK_TASK_1], { includeHeaders: false });
      const lines = csv.split("\r\n");
      expect(lines.length).toBe(1);
      expect(lines[0]).toContain("1,Build DEX Interface");
    });
  });
});
