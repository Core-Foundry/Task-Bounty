/**
 * Issue #162: Implement Import Validation for Bulk Grant Uploads
 *
 * Validates uploaded grant data before records are added to the system.
 * Parses CSV/JSON arrays, identifies invalid rows, and returns clear
 * validation errors. Only valid records are returned for creation.
 */

export type FieldType = "string" | "number" | "boolean" | "iso_date" | "unix_timestamp";

export interface FieldSchema {
  name: string;
  type: FieldType;
  required: boolean;
  min?: number;
  max?: number;
  maxLength?: number;
  enum?: string[];
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: unknown;
}

export interface ValidRow {
  row: number;
  data: Record<string, unknown>;
}

export interface ImportValidationResult {
  valid: ValidRow[];
  errors: ValidationError[];
  totalRows: number;
  validCount: number;
  errorCount: number;
}

/**
 * Default schema for a grant/task bulk import.
 * Matches the `CreateTaskInput` fields.
 */
export const GRANT_IMPORT_SCHEMA: FieldSchema[] = [
  { name: "title", type: "string", required: true, maxLength: 200 },
  { name: "description", type: "string", required: true, maxLength: 5000 },
  { name: "reward", type: "number", required: true, min: 1_000_000 },
  { name: "deadline", type: "unix_timestamp", required: true },
  { name: "maxSubmissions", type: "number", required: true, min: 1, max: 100 },
  { name: "difficulty", type: "string", required: false, enum: ["beginner", "intermediate", "advanced"] },
  { name: "organization", type: "string", required: false, maxLength: 200 },
  { name: "poster", type: "string", required: true, maxLength: 100 },
  { name: "technologies", type: "string", required: false },
];

/**
 * Validate a single field value against its schema.
 */
export function validateField(
  value: unknown,
  schema: FieldSchema,
): string | null {
  if (value === null || value === undefined || value === "") {
    return schema.required ? `${schema.name} is required.` : null;
  }

  switch (schema.type) {
    case "string": {
      const str = String(value).trim();
      if (schema.maxLength && str.length > schema.maxLength) {
        return `${schema.name} must be at most ${schema.maxLength} characters.`;
      }
      if (schema.enum && !schema.enum.includes(str)) {
        return `${schema.name} must be one of: ${schema.enum.join(", ")}.`;
      }
      return null;
    }
    case "number": {
      const num = Number(value);
      if (!Number.isFinite(num)) {
        return `${schema.name} must be a valid number.`;
      }
      if (schema.min !== undefined && num < schema.min) {
        return `${schema.name} must be at least ${schema.min}.`;
      }
      if (schema.max !== undefined && num > schema.max) {
        return `${schema.name} must be at most ${schema.max}.`;
      }
      return null;
    }
    case "boolean": {
      if (typeof value === "boolean") return null;
      if (["true", "false", "1", "0", "yes", "no"].includes(String(value).toLowerCase())) {
        return null;
      }
      return `${schema.name} must be a boolean value.`;
    }
    case "iso_date": {
      const date = new Date(String(value));
      if (isNaN(date.getTime())) {
        return `${schema.name} must be a valid ISO date string.`;
      }
      return null;
    }
    case "unix_timestamp": {
      const num = Number(value);
      if (!Number.isFinite(num) || num <= 0) {
        return `${schema.name} must be a valid Unix timestamp.`;
      }
      const now = Math.floor(Date.now() / 1000);
      if (num <= now) {
        return `${schema.name} must be in the future.`;
      }
      const maxFuture = now + 365 * 24 * 60 * 60;
      if (num > maxFuture) {
        return `${schema.name} cannot be more than 365 days from now.`;
      }
      return null;
    }
    default:
      return null;
  }
}

/**
 * Validate a single row of data against the schema.
 * Returns an array of validation errors (empty if valid).
 */
export function validateRow(
  rowData: Record<string, unknown>,
  schema: FieldSchema[],
  rowIndex: number,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of schema) {
    const value = rowData[field.name];
    const error = validateField(value, field);
    if (error) {
      errors.push({ row: rowIndex, field: field.name, message: error, value });
    }
  }

  return errors;
}

/**
 * Validate an array of rows for bulk import.
 * Returns valid rows and errors separately.
 */
export function validateImportData(
  rows: Record<string, unknown>[],
  schema: FieldSchema[] = GRANT_IMPORT_SCHEMA,
): ImportValidationResult {
  const valid: ValidRow[] = [];
  const errors: ValidationError[] = [];

  rows.forEach((rowData, index) => {
    const rowIndex = index + 1; // 1-based
    const rowErrors = validateRow(rowData, schema, rowIndex);

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else {
      valid.push({ row: rowIndex, data: { ...rowData } });
    }
  });

  return {
    valid,
    errors,
    totalRows: rows.length,
    validCount: valid.length,
    errorCount: errors.length,
  };
}

/**
 * Parse a CSV string into rows for validation.
 * Handles quoted fields, commas inside quotes, and newlines inside quotes.
 */
export function parseCSV(
  csv: string,
): Record<string, unknown>[] {
  const lines: string[][] = [];
  let currentField = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];

    if (inQuotes) {
      if (char === '"') {
        if (csv[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentField);
        currentField = "";
      } else if (char === "\n" || char === "\r") {
        if (char === "\r" && csv[i + 1] === "\n") i++;
        currentRow.push(currentField);
        lines.push(currentRow);
        currentField = "";
        currentRow = [];
      } else {
        currentField += char;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    lines.push(currentRow);
  }

  if (lines.length === 0) return [];

  const headers = lines[0].map((h) => h.trim());
  const rows: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = lines[i][j] ?? "";
    }
    rows.push(row);
  }

  return rows;
}
