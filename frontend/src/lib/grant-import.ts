/**
 * Bulk grant import validation.
 *
 * A bulk upload is usually mostly-good data with a few bad rows. Rejecting the
 * whole file for one typo means the uploader fixes it, re-uploads, and hits the
 * next typo — so validation here is **per row**: every row is checked, every
 * failure is reported with its row number and the field that caused it, and the
 * valid rows are returned ready to import.
 *
 * Nothing here writes anything. `validateGrantImport` is pure, so the caller
 * decides whether to import the valid subset or make the uploader fix the file
 * first.
 */
import { z } from "zod";

/** One parsed row as it arrives from a CSV/JSON upload — all values untrusted. */
export type RawGrantRow = Record<string, unknown>;

export const GRANT_IMPORT_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "disbursed",
] as const;

/**
 * Row schema.
 *
 * Messages name the field and say what was expected, so a validation report is
 * actionable without the uploader having to consult a spec.
 */
export const grantImportRowSchema = z.object({
  title: z
    .string({ error: "title is required" })
    .trim()
    .min(5, "title must be at least 5 characters")
    .max(120, "title must be at most 120 characters"),
  recipientName: z
    .string({ error: "recipientName is required" })
    .trim()
    .min(1, "recipientName is required"),
  recipientAddress: z
    .string({ error: "recipientAddress is required" })
    .trim()
    .length(56, "recipientAddress must be exactly 56 characters")
    .startsWith("G", "recipientAddress must start with 'G'"),
  amount: z.coerce
    .number({ error: "amount must be a number" })
    .positive("amount must be greater than zero"),
  currency: z
    .string({ error: "currency is required" })
    .trim()
    .min(3, "currency must be a 3-4 character code")
    .max(4, "currency must be a 3-4 character code"),
  status: z.enum(GRANT_IMPORT_STATUSES, {
    error: `status must be one of: ${GRANT_IMPORT_STATUSES.join(", ")}`,
  }),
  category: z
    .string({ error: "category is required" })
    .trim()
    .min(1, "category is required"),
});

export type ValidGrantRow = z.infer<typeof grantImportRowSchema>;

export interface RowFieldError {
  field: string;
  message: string;
}

export interface InvalidGrantRow {
  /** 1-based row number as the uploader sees it in their file. */
  rowNumber: number;
  errors: RowFieldError[];
  /** The original row, so the caller can show it back in an error report. */
  raw: RawGrantRow;
}

export interface GrantImportValidation {
  valid: { rowNumber: number; data: ValidGrantRow }[];
  invalid: InvalidGrantRow[];
  totalRows: number;
  /** True when every row passed — the "safe to import everything" signal. */
  allValid: boolean;
}

export interface ValidateGrantImportOptions {
  /**
   * Row number of the first data row as the uploader sees it. Defaults to 2,
   * because a CSV's row 1 is the header — so reported numbers line up with what
   * they see in their spreadsheet.
   */
  firstRowNumber?: number;
}

/** Flattens a ZodError into per-field messages, keeping every failure. */
function toFieldErrors(error: z.ZodError): RowFieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join(".") : "(row)",
    message: issue.message,
  }));
}

/**
 * Validates every row and partitions them into importable and rejected.
 *
 * Every row is checked even after one fails, so the uploader gets the complete
 * list of problems in one pass rather than discovering them one re-upload at a
 * time.
 */
export function validateGrantImport(
  rows: readonly RawGrantRow[],
  options: ValidateGrantImportOptions = {},
): GrantImportValidation {
  const { firstRowNumber = 2 } = options;

  const valid: GrantImportValidation["valid"] = [];
  const invalid: InvalidGrantRow[] = [];

  rows.forEach((raw, index) => {
    const rowNumber = firstRowNumber + index;
    const parsed = grantImportRowSchema.safeParse(raw);

    if (parsed.success) {
      valid.push({ rowNumber, data: parsed.data });
    } else {
      invalid.push({ rowNumber, errors: toFieldErrors(parsed.error), raw });
    }
  });

  return {
    valid,
    invalid,
    totalRows: rows.length,
    allValid: invalid.length === 0 && rows.length > 0,
  };
}

/**
 * Duplicate `recipientAddress` values *within the upload*.
 *
 * Not a schema rule — each row is individually valid — but importing a file
 * that pays the same address twice is almost always an accident, so the
 * caller is told before anything is written.
 */
export function findDuplicateRecipients(
  valid: GrantImportValidation["valid"],
): { recipientAddress: string; rowNumbers: number[] }[] {
  const seen = new Map<string, number[]>();

  for (const row of valid) {
    const key = row.data.recipientAddress;
    seen.set(key, [...(seen.get(key) ?? []), row.rowNumber]);
  }

  return [...seen.entries()]
    .filter(([, rowNumbers]) => rowNumbers.length > 1)
    .map(([recipientAddress, rowNumbers]) => ({ recipientAddress, rowNumbers }));
}

/**
 * A one-line-per-problem report, ready to show the uploader.
 *
 * Empty array when everything passed.
 */
export function formatValidationReport(result: GrantImportValidation): string[] {
  return result.invalid.flatMap((row) =>
    row.errors.map((error) => `Row ${row.rowNumber}: ${error.field} — ${error.message}`),
  );
}

/** The rows safe to write, stripped of bookkeeping. */
export function importableRows(result: GrantImportValidation): ValidGrantRow[] {
  return result.valid.map((row) => row.data);
}
