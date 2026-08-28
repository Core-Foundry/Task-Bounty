import type { TaskRecord } from "@/types/task-workflow";

export interface CsvExportOptions {
  includeHeaders?: boolean;
  delimiter?: string;
  excludeSensitive?: boolean;
}

export interface ExportableGrantRecord {
  id: string;
  title: string;
  description: string;
  rewardStroops: number;
  rewardXlm: string;
  deadlineUnix: number;
  deadlineIso: string;
  maxSubmissions: number;
  submissionCount: number;
  status: string;
  createdAt: string;
  difficulty: string;
  technologies: string;
  organization: string;
  posterAddress: string;
}

export const CSV_EXPORT_HEADERS: Array<{ key: keyof ExportableGrantRecord; label: string }> = [
  { key: "id", label: "Grant ID" },
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "rewardStroops", label: "Reward (Stroops)" },
  { key: "rewardXlm", label: "Reward (XLM)" },
  { key: "deadlineUnix", label: "Deadline (Unix Timestamp)" },
  { key: "deadlineIso", label: "Deadline (ISO)" },
  { key: "maxSubmissions", label: "Max Submissions" },
  { key: "submissionCount", label: "Current Submissions" },
  { key: "status", label: "Status" },
  { key: "createdAt", label: "Created At" },
  { key: "difficulty", label: "Difficulty" },
  { key: "technologies", label: "Technologies" },
  { key: "organization", label: "Organization" },
  { key: "posterAddress", label: "Poster Address" },
];

/**
 * Escapes a cell value per RFC 4180 and protects against CSV formula injection (DDE attacks).
 * If a string begins with =, +, -, @, \t, or \r, a single quote prefix is prepended to neutralize formula execution in spreadsheet software.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  let str = String(value);

  // CSV formula injection protection: neutralize dangerous starting characters
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // If the cell contains quotes, commas, newlines, or carriage returns, wrap in quotes and escape existing quotes
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Maps an internal TaskRecord to a sanitized, public exportable structure excluding sensitive data.
 */
export function mapTaskToExportRecord(task: TaskRecord): ExportableGrantRecord {
  const rewardXlm = (task.reward / 10_000_000).toFixed(7).replace(/\.?0+$/, "");
  let deadlineIso = "";
  try {
    deadlineIso = new Date(task.deadline * 1000).toISOString();
  } catch {
    deadlineIso = "";
  }

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    rewardStroops: task.reward,
    rewardXlm: rewardXlm || "0",
    deadlineUnix: task.deadline,
    deadlineIso,
    maxSubmissions: task.maxSubmissions,
    submissionCount: task.submissionCount,
    status: task.status,
    createdAt: task.createdAt,
    difficulty: task.difficulty,
    technologies: Array.isArray(task.technologies) ? task.technologies.join("; ") : "",
    organization: task.organization || "",
    posterAddress: task.poster || "",
  };
}

/**
 * Converts an array of TaskRecords into an RFC 4180-compliant CSV string.
 */
export function generateGrantsCsv(
  tasks: TaskRecord[],
  options: CsvExportOptions = {},
): string {
  const { includeHeaders = true, delimiter = "," } = options;
  const rows: string[] = [];

  if (includeHeaders) {
    const headerRow = CSV_EXPORT_HEADERS.map((h) => sanitizeCsvCell(h.label)).join(delimiter);
    rows.push(headerRow);
  }

  for (const task of tasks) {
    const exportRecord = mapTaskToExportRecord(task);
    const row = CSV_EXPORT_HEADERS.map((h) => sanitizeCsvCell(exportRecord[h.key])).join(delimiter);
    rows.push(row);
  }

  return rows.join("\r\n");
}
