/**
 * Issue #161: Add CSV Export for Grant Data
 *
 * Exports grant (task) records to CSV format. Sensitive or restricted
 * information is excluded by default.
 */

import type { TaskRecord } from "@/types/task-workflow";

/** Fields that are considered safe to export. */
export const EXPORTABLE_FIELDS = [
  "id",
  "title",
  "description",
  "reward",
  "deadline",
  "maxSubmissions",
  "submissionCount",
  "status",
  "createdAt",
  "difficulty",
  "technologies",
  "organization",
] as const;

/** Fields that are explicitly excluded (sensitive/restricted). */
export const EXCLUDED_FIELDS = [
  "poster", // wallet address — PII
] as const;

export type ExportField = (typeof EXPORTABLE_FIELDS)[number];

export interface ExportOptions {
  fields?: ExportField[];
  includeHeader?: boolean;
  /** Optional filter to apply before exporting. */
  filter?: (task: TaskRecord) => boolean;
}

/**
 * Escape a value for CSV output.
 * Wraps in quotes if it contains commas, quotes, or newlines.
 */
export function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);

  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Convert a single TaskRecord to a CSV row string.
 */
export function taskToCSVRow(
  task: TaskRecord,
  fields: ExportField[],
): string {
  return fields
    .map((field) => {
      const value = task[field];
      if (field === "technologies" && Array.isArray(value)) {
        return escapeCSVValue(value.join("; "));
      }
      return escapeCSVValue(value);
    })
    .join(",");
}

/**
 * Export an array of TaskRecords to CSV string.
 *
 * Excludes sensitive fields (poster wallet address) by default.
 * Custom field selection is supported via the `fields` option.
 */
export function exportTasksToCSV(
  tasks: TaskRecord[],
  options: ExportOptions = {},
): string {
  const fields = options.fields ?? [...EXPORTABLE_FIELDS];
  const includeHeader = options.includeHeader ?? true;

  // Verify no excluded fields are in the export
  const safeFields = fields.filter(
    (f) => !EXCLUDED_FIELDS.includes(f as never),
  );

  let filtered = tasks;
  if (options.filter) {
    filtered = tasks.filter(options.filter);
  }

  const rows: string[] = [];

  if (includeHeader) {
    rows.push(safeFields.join(","));
  }

  for (const task of filtered) {
    rows.push(taskToCSVRow(task, safeFields));
  }

  return rows.join("\n");
}

/**
 * Generate a filename for the CSV download.
 */
export function generateExportFilename(
  prefix: string = "grants",
  now: Date = new Date(),
): string {
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  return `${prefix}_export_${dateStr}.csv`;
}

/**
 * Get the list of available export fields with descriptions.
 * Useful for UI rendering.
 */
export function getExportableFieldInfo(): Array<{
  field: ExportField;
  label: string;
  description: string;
}> {
  return [
    { field: "id", label: "ID", description: "Unique grant identifier" },
    { field: "title", label: "Title", description: "Grant title" },
    { field: "description", label: "Description", description: "Grant description" },
    { field: "reward", label: "Reward", description: "Reward amount in stroops" },
    { field: "deadline", label: "Deadline", description: "Unix timestamp of deadline" },
    { field: "maxSubmissions", label: "Max Submissions", description: "Maximum allowed submissions" },
    { field: "submissionCount", label: "Submission Count", description: "Current number of submissions" },
    { field: "status", label: "Status", description: "Current grant status" },
    { field: "createdAt", label: "Created At", description: "Creation timestamp" },
    { field: "difficulty", label: "Difficulty", description: "Difficulty level" },
    { field: "technologies", label: "Technologies", description: "Required technologies" },
    { field: "organization", label: "Organization", description: "Posting organization" },
  ];
}
