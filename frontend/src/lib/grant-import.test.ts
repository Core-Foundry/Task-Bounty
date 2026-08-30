import { describe, expect, it } from "vitest";

import {
  findDuplicateRecipients,
  formatValidationReport,
  importableRows,
  validateGrantImport,
  type RawGrantRow,
} from "./grant-import";

const ADDRESS = `G${"A".repeat(55)}`;
const OTHER_ADDRESS = `G${"B".repeat(55)}`;

function makeRow(overrides: Partial<RawGrantRow> = {}): RawGrantRow {
  return {
    title: "Community Tooling Grant",
    recipientName: "Ada Lovelace",
    recipientAddress: ADDRESS,
    amount: 5000,
    currency: "USDC",
    status: "approved",
    category: "tooling",
    ...overrides,
  };
}

describe("bulk grant import — valid data", () => {
  it("accepts a well-formed row", () => {
    const result = validateGrantImport([makeRow()]);

    expect(result.allValid).toBe(true);
    expect(result.invalid).toHaveLength(0);
    expect(result.valid).toHaveLength(1);
    expect(result.totalRows).toBe(1);
  });

  it("coerces a numeric amount supplied as a string", () => {
    // CSV uploads deliver everything as text.
    const result = validateGrantImport([makeRow({ amount: "2500" })]);
    expect(result.allValid).toBe(true);
    expect(result.valid[0].data.amount).toBe(2500);
  });

  it("trims surrounding whitespace", () => {
    const result = validateGrantImport([
      makeRow({ recipientName: "  Ada Lovelace  ", category: " tooling " }),
    ]);
    expect(result.valid[0].data.recipientName).toBe("Ada Lovelace");
    expect(result.valid[0].data.category).toBe("tooling");
  });

  it("returns importable rows stripped of bookkeeping", () => {
    const result = validateGrantImport([makeRow(), makeRow({ recipientAddress: OTHER_ADDRESS })]);
    const rows = importableRows(result);

    expect(rows).toHaveLength(2);
    expect(rows[0]).not.toHaveProperty("rowNumber");
  });

  it("reports allValid false for an empty upload", () => {
    // Nothing to import is not the same as "everything passed".
    const result = validateGrantImport([]);
    expect(result.allValid).toBe(false);
    expect(result.totalRows).toBe(0);
  });
});

describe("bulk grant import — invalid rows are identified", () => {
  it("rejects a short title with a message naming the field", () => {
    const result = validateGrantImport([makeRow({ title: "abc" })]);

    expect(result.allValid).toBe(false);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].errors).toContainEqual({
      field: "title",
      message: "title must be at least 5 characters",
    });
  });

  it("rejects a malformed recipient address", () => {
    const tooShort = validateGrantImport([makeRow({ recipientAddress: "G123" })]);
    expect(tooShort.invalid[0].errors[0].field).toBe("recipientAddress");

    const wrongPrefix = validateGrantImport([
      makeRow({ recipientAddress: `X${"A".repeat(55)}` }),
    ]);
    expect(wrongPrefix.invalid[0].errors).toContainEqual({
      field: "recipientAddress",
      message: "recipientAddress must start with 'G'",
    });
  });

  it("rejects a non-positive or non-numeric amount", () => {
    expect(validateGrantImport([makeRow({ amount: 0 })]).invalid).toHaveLength(1);
    expect(validateGrantImport([makeRow({ amount: -5 })]).invalid).toHaveLength(1);
    expect(validateGrantImport([makeRow({ amount: "abc" })]).invalid).toHaveLength(1);
  });

  it("rejects an unknown status and lists the accepted values", () => {
    const result = validateGrantImport([makeRow({ status: "pending" })]);
    expect(result.invalid[0].errors[0].message).toContain("status must be one of");
    expect(result.invalid[0].errors[0].message).toContain("approved");
  });

  it("rejects missing required fields", () => {
    const result = validateGrantImport([{ title: "Only a title here" }]);
    const fields = result.invalid[0].errors.map((e) => e.field);

    expect(fields).toContain("recipientName");
    expect(fields).toContain("recipientAddress");
    expect(fields).toContain("amount");
  });

  it("reports every problem in a row, not just the first", () => {
    const result = validateGrantImport([
      makeRow({ title: "no", recipientAddress: "bad", amount: -1 }),
    ]);

    const fields = result.invalid[0].errors.map((e) => e.field);
    expect(fields).toContain("title");
    expect(fields).toContain("recipientAddress");
    expect(fields).toContain("amount");
  });

  it("keeps the original row for the error report", () => {
    const raw = makeRow({ title: "no" });
    const result = validateGrantImport([raw]);
    expect(result.invalid[0].raw).toEqual(raw);
  });
});

describe("bulk grant import — row numbering", () => {
  it("numbers rows from 2, matching the spreadsheet under a header", () => {
    const result = validateGrantImport([makeRow({ title: "no" }), makeRow()]);
    expect(result.invalid[0].rowNumber).toBe(2);
    expect(result.valid[0].rowNumber).toBe(3);
  });

  it("honours a custom first row number for headerless files", () => {
    const result = validateGrantImport([makeRow({ title: "no" })], { firstRowNumber: 1 });
    expect(result.invalid[0].rowNumber).toBe(1);
  });

  it("numbers correctly when failures are interleaved", () => {
    const result = validateGrantImport([
      makeRow(),
      makeRow({ amount: -1 }),
      makeRow(),
      makeRow({ status: "nope" }),
    ]);

    expect(result.invalid.map((r) => r.rowNumber)).toEqual([3, 5]);
    expect(result.valid.map((r) => r.rowNumber)).toEqual([2, 4]);
  });
});

describe("bulk grant import — partial imports are safe", () => {
  it("separates valid rows from invalid ones so the good data can still import", () => {
    const result = validateGrantImport([
      makeRow(),
      makeRow({ title: "no" }),
      makeRow({ recipientAddress: OTHER_ADDRESS }),
    ]);

    expect(result.totalRows).toBe(3);
    expect(result.valid).toHaveLength(2);
    expect(result.invalid).toHaveLength(1);
    expect(result.allValid).toBe(false);
  });

  it("never lets an invalid row into the importable set", () => {
    const result = validateGrantImport([
      makeRow({ title: "no" }),
      makeRow({ amount: -1 }),
      makeRow(),
    ]);

    const rows = importableRows(result);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("Community Tooling Grant");
  });

  it("validates every row rather than stopping at the first failure", () => {
    // One re-upload per typo would be miserable; the uploader gets the full
    // list in a single pass.
    const result = validateGrantImport([
      makeRow({ title: "a" }),
      makeRow({ title: "b" }),
      makeRow({ title: "c" }),
    ]);
    expect(result.invalid).toHaveLength(3);
  });
});

describe("bulk grant import — reporting", () => {
  it("formats one readable line per problem", () => {
    const result = validateGrantImport([makeRow({ title: "no", amount: -1 })]);
    const report = formatValidationReport(result);

    expect(report.length).toBeGreaterThanOrEqual(2);
    expect(report[0]).toMatch(/^Row 2: /);
    expect(report.join("\n")).toContain("title");
  });

  it("produces an empty report when everything passes", () => {
    expect(formatValidationReport(validateGrantImport([makeRow()]))).toEqual([]);
  });

  it("flags duplicate recipients within one upload", () => {
    const result = validateGrantImport([
      makeRow(),
      makeRow({ recipientAddress: OTHER_ADDRESS }),
      makeRow(),
    ]);

    const duplicates = findDuplicateRecipients(result.valid);
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].recipientAddress).toBe(ADDRESS);
    expect(duplicates[0].rowNumbers).toEqual([2, 4]);
  });

  it("reports no duplicates when every recipient is distinct", () => {
    const result = validateGrantImport([
      makeRow(),
      makeRow({ recipientAddress: OTHER_ADDRESS }),
    ]);
    expect(findDuplicateRecipients(result.valid)).toEqual([]);
  });
});
