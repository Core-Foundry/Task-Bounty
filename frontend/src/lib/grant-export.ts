/**
 * Grant record CSV export.
 *
 * Two things this module is responsible for, beyond producing a file:
 *
 *   * **Only authorized callers get data.** Export is gated on role, and an
 *     unauthorized request returns a refusal rather than an empty file — an
 *     empty CSV is indistinguishable from "there were no grants", which is a
 *     bad answer to give someone who is not allowed to ask.
 *
 *   * **Restricted fields never leave.** The exported columns are an explicit
 *     allowlist, not a denylist. A new field added to `GrantRecord` is
 *     therefore excluded by default: forgetting to update this file omits a
 *     column, whereas a denylist would leak it.
 */
import type { ExportRequester, ExportRole, GrantRecord } from "@/types/grant";

/**
 * The exact columns an export contains, in order.
 *
 * Allowlist by design — see the module note above. Restricted fields
 * (`applicantEmail`, `reviewerNotes`, `internalScore`, `kycReference`,
 * `bankAccountNumber`) are absent and must stay absent.
 */
export const GRANT_EXPORT_FIELDS = [
  "id",
  "title",
  "recipientName",
  "recipientAddress",
  "amount",
  "currency",
  "status",
  "category",
  "createdAt",
  "updatedAt",
] as const;

export type GrantExportField = (typeof GRANT_EXPORT_FIELDS)[number];

/** Human-readable header for each exported column. */
export const GRANT_EXPORT_HEADERS: Record<GrantExportField, string> = {
  id: "Grant ID",
  title: "Title",
  recipientName: "Recipient Name",
  recipientAddress: "Recipient Address",
  amount: "Amount",
  currency: "Currency",
  status: "Status",
  category: "Category",
  createdAt: "Created At",
  updatedAt: "Updated At",
};

/**
 * Fields that must never appear in an export. Kept explicit so the guarantee
 * is testable, and so a reviewer can see at a glance what is being withheld.
 */
export const RESTRICTED_GRANT_FIELDS = [
  "applicantEmail",
  "reviewerNotes",
  "internalScore",
  "kycReference",
  "bankAccountNumber",
] as const;

/** Roles permitted to export. Reviewers and contributors are not included. */
export const EXPORT_AUTHORIZED_ROLES: readonly ExportRole[] = ["admin", "grant_manager"];

export function canExportGrants(requester: ExportRequester | null | undefined): boolean {
  if (!requester) return false;
  return EXPORT_AUTHORIZED_ROLES.includes(requester.role);
}

export type GrantExportResult =
  | { ok: true; csv: string; rowCount: number; fields: readonly GrantExportField[] }
  | { ok: false; reason: "unauthorized" };

/**
 * Escapes one CSV cell.
 *
 * Beyond the usual quote/comma/newline rules, a leading `=`, `+`, `-`, `@`,
 * tab or CR is prefixed with a single quote. Spreadsheet software treats those
 * as the start of a formula, so an attacker-controlled grant title could
 * otherwise execute when an administrator opens the export. Prefixing is the
 * standard mitigation and keeps the value legible.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";

  let text = value instanceof Date ? value.toISOString() : String(value);

  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Serializes one grant to its exported cells, in `GRANT_EXPORT_FIELDS` order. */
export function toExportRow(grant: GrantRecord): string[] {
  return GRANT_EXPORT_FIELDS.map((field) => escapeCsvCell(grant[field]));
}

export interface ExportGrantsOptions {
  /** Omit the header row, e.g. when appending to an existing file. */
  includeHeader?: boolean;
}

/**
 * Builds a CSV export of `grants` for `requester`.
 *
 * Returns `{ ok: false, reason: "unauthorized" }` for a caller without export
 * rights — deliberately distinct from a successful export of zero rows.
 */
export function exportGrantsToCsv(
  grants: readonly GrantRecord[],
  requester: ExportRequester | null | undefined,
  options: ExportGrantsOptions = {},
): GrantExportResult {
  if (!canExportGrants(requester)) {
    return { ok: false, reason: "unauthorized" };
  }

  const { includeHeader = true } = options;

  const lines: string[] = [];
  if (includeHeader) {
    lines.push(
      GRANT_EXPORT_FIELDS.map((field) => escapeCsvCell(GRANT_EXPORT_HEADERS[field])).join(","),
    );
  }
  for (const grant of grants) {
    lines.push(toExportRow(grant).join(","));
  }

  return {
    ok: true,
    // CRLF: RFC 4180, and the line ending Excel expects.
    csv: lines.join("\r\n"),
    rowCount: grants.length,
    fields: GRANT_EXPORT_FIELDS,
  };
}

/** Timestamped filename, e.g. `grants-export-2026-08-30.csv`. */
export function buildExportFilename(now: Date = new Date()): string {
  return `grants-export-${now.toISOString().slice(0, 10)}.csv`;
}
