import { describe, expect, it } from "vitest";

import {
  EXPORT_AUTHORIZED_ROLES,
  GRANT_EXPORT_FIELDS,
  GRANT_EXPORT_HEADERS,
  RESTRICTED_GRANT_FIELDS,
  buildExportFilename,
  canExportGrants,
  escapeCsvCell,
  exportGrantsToCsv,
  toExportRow,
} from "./grant-export";
import type { ExportRequester, GrantRecord } from "@/types/grant";

const ADDRESS = `G${"A".repeat(55)}`;

function makeGrant(overrides: Partial<GrantRecord> = {}): GrantRecord {
  return {
    id: "grant-1",
    title: "Community Tooling Grant",
    recipientAddress: ADDRESS,
    recipientName: "Ada Lovelace",
    amount: 5000,
    currency: "USDC",
    status: "approved",
    category: "tooling",
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
    updatedAt: new Date("2026-02-01T12:30:00.000Z"),
    // Restricted — must never reach the CSV.
    applicantEmail: "ada@example.test",
    reviewerNotes: "Strong applicant, weak budget breakdown",
    internalScore: 87,
    kycReference: "KYC-99812",
    bankAccountNumber: "12345678",
    ...overrides,
  };
}

const admin: ExportRequester = { id: "u1", role: "admin" };
const manager: ExportRequester = { id: "u2", role: "grant_manager" };
const reviewer: ExportRequester = { id: "u3", role: "reviewer" };
const contributor: ExportRequester = { id: "u4", role: "contributor" };

describe("grant export — authorization", () => {
  it("allows admins and grant managers", () => {
    expect(canExportGrants(admin)).toBe(true);
    expect(canExportGrants(manager)).toBe(true);
  });

  it("refuses reviewers and contributors", () => {
    expect(canExportGrants(reviewer)).toBe(false);
    expect(canExportGrants(contributor)).toBe(false);
  });

  it("refuses a missing requester", () => {
    expect(canExportGrants(null)).toBe(false);
    expect(canExportGrants(undefined)).toBe(false);
  });

  it("refuses the export itself, not just the check", () => {
    const result = exportGrantsToCsv([makeGrant()], reviewer);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unauthorized");
  });

  it("distinguishes refusal from an empty result set", () => {
    // An empty CSV would read as "there are no grants", which is a different
    // and misleading answer for someone who is not allowed to ask.
    const refused = exportGrantsToCsv([makeGrant()], contributor);
    const empty = exportGrantsToCsv([], admin);

    expect(refused.ok).toBe(false);
    expect(empty.ok).toBe(true);
    if (empty.ok) expect(empty.rowCount).toBe(0);
  });

  it("only admin and grant_manager are authorized roles", () => {
    expect([...EXPORT_AUTHORIZED_ROLES].sort()).toEqual(["admin", "grant_manager"]);
  });
});

describe("grant export — restricted fields", () => {
  it("excludes every restricted field from the CSV", () => {
    const result = exportGrantsToCsv([makeGrant()], admin);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const field of RESTRICTED_GRANT_FIELDS) {
      expect(GRANT_EXPORT_FIELDS).not.toContain(field);
    }

    // And their values are absent from the output, not merely their names.
    expect(result.csv).not.toContain("ada@example.test");
    expect(result.csv).not.toContain("weak budget breakdown");
    expect(result.csv).not.toContain("KYC-99812");
    expect(result.csv).not.toContain("12345678");
    expect(result.csv).not.toContain("87");
  });

  it("exports exactly the declared field list, in order", () => {
    const result = exportGrantsToCsv([makeGrant()], admin);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const header = result.csv.split("\r\n")[0];
    expect(header).toBe(
      GRANT_EXPORT_FIELDS.map((f) => GRANT_EXPORT_HEADERS[f]).join(","),
    );
    expect(result.fields).toEqual(GRANT_EXPORT_FIELDS);
  });

  it("still excludes restricted fields when they are the only populated ones", () => {
    const grant = makeGrant({ reviewerNotes: "secret", applicantEmail: "x@y.test" });
    const row = toExportRow(grant);
    expect(row).toHaveLength(GRANT_EXPORT_FIELDS.length);
    expect(row.join(",")).not.toContain("secret");
  });
});

describe("grant export — CSV correctness", () => {
  it("emits a header plus one row per grant", () => {
    const result = exportGrantsToCsv([makeGrant(), makeGrant({ id: "grant-2" })], admin);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.csv.split("\r\n")).toHaveLength(3);
    expect(result.rowCount).toBe(2);
  });

  it("omits the header on request", () => {
    const result = exportGrantsToCsv([makeGrant()], admin, { includeHeader: false });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.csv.split("\r\n")).toHaveLength(1);
  });

  it("serializes dates as ISO strings", () => {
    const result = exportGrantsToCsv([makeGrant()], admin);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.csv).toContain("2026-01-15T10:00:00.000Z");
  });

  it("quotes and escapes commas, quotes and newlines", () => {
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("renders null and undefined as empty cells", () => {
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });

  it("keeps a comma in a title from breaking the row", () => {
    const result = exportGrantsToCsv(
      [makeGrant({ title: "Tooling, Docs and Testing" })],
      admin,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const dataRow = result.csv.split("\r\n")[1];
    expect(dataRow).toContain('"Tooling, Docs and Testing"');
    // Still exactly one row — the comma did not split it.
    expect(result.csv.split("\r\n")).toHaveLength(2);
  });

  it("neutralizes spreadsheet formula injection", () => {
    // A grant title is attacker-controllable; spreadsheet software would treat
    // a leading = as a formula and execute it when an admin opens the export.
    expect(escapeCsvCell("=1+1")).toBe("'=1+1");
    expect(escapeCsvCell("+SUM(A1)")).toBe("'+SUM(A1)");
    expect(escapeCsvCell("-2+3")).toBe("'-2+3");
    expect(escapeCsvCell("@cmd")).toBe("'@cmd");
  });

  it("neutralizes a formula inside an exported grant title", () => {
    const result = exportGrantsToCsv(
      [makeGrant({ title: '=HYPERLINK("http://evil.test")' })],
      admin,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.csv).toContain("'=HYPERLINK");
  });

  it("builds a dated filename", () => {
    expect(buildExportFilename(new Date("2026-08-30T09:00:00.000Z"))).toBe(
      "grants-export-2026-08-30.csv",
    );
  });
});
