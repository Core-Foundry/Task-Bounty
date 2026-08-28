/**
 * Issue #158: Add Grant Reporting for Incorrect Information
 *
 * Allows users to report grants containing outdated, incorrect,
 * suspicious, or incomplete information. Reports are reviewed by
 * administrators via the moderation queue.
 */

export type ReportReason =
  | "outdated"
  | "incorrect"
  | "suspicious"
  | "incomplete"
  | "spam"
  | "other";

export type ReportStatus = "pending" | "reviewing" | "resolved" | "dismissed";

export interface GrantReport {
  id: string;
  taskId: string;
  reportedBy: string;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
}

export interface ReportListResult {
  reports: GrantReport[];
  total: number;
}

type ReportSuccess<T> = { ok: true } & T;

type ReportFailure = {
  ok: false;
  status: 400 | 404;
  error: string;
};

export type ReportResult<T> = ReportSuccess<T> | ReportFailure;

export const VALID_REPORT_REASONS: ReportReason[] = [
  "outdated",
  "incorrect",
  "suspicious",
  "incomplete",
  "spam",
  "other",
];

// --- in-memory store ---

const reports = new Map<string, GrantReport>();
const taskReports = new Map<string, Set<string>>();
let nextReportId = 1;

function getTaskReportSet(taskId: string): Set<string> {
  let set = taskReports.get(taskId);
  if (!set) {
    set = new Set<string>();
    taskReports.set(taskId, set);
  }
  return set;
}

/**
 * Submit a new report for a grant.
 */
export function submitReport(
  input: {
    taskId: string;
    reportedBy: string;
    reason: ReportReason;
    description: string;
  },
  now: Date = new Date(),
): ReportResult<{ report: GrantReport }> {
  const taskId = input.taskId.trim();
  const reportedBy = input.reportedBy.trim();
  const description = input.description.trim();
  const reason = input.reason;

  if (!taskId) {
    return { ok: false, status: 400, error: "Task ID is required." };
  }
  if (!reportedBy) {
    return { ok: false, status: 400, error: "Reporter address is required." };
  }
  if (!VALID_REPORT_REASONS.includes(reason)) {
    return {
      ok: false,
      status: 400,
      error: `Invalid reason. Valid reasons: ${VALID_REPORT_REASONS.join(", ")}.`,
    };
  }
  if (!description) {
    return { ok: false, status: 400, error: "Description is required." };
  }
  if (description.length > 2000) {
    return {
      ok: false,
      status: 400,
      error: "Description must be 2000 characters or less.",
    };
  }

  const report: GrantReport = {
    id: String(nextReportId++),
    taskId,
    reportedBy,
    reason,
    description,
    status: "pending",
    createdAt: now.toISOString(),
    resolvedAt: null,
    resolvedBy: null,
    resolutionNote: null,
  };

  reports.set(report.id, report);
  getTaskReportSet(taskId).add(report.id);

  return { ok: true, report };
}

/**
 * List all reports, optionally filtered by status or taskId.
 */
export function listReports(
  filter?: { status?: ReportStatus; taskId?: string },
): ReportListResult {
  let all = Array.from(reports.values());

  if (filter?.status) {
    all = all.filter((r) => r.status === filter.status);
  }
  if (filter?.taskId) {
    all = all.filter((r) => r.taskId === filter.taskId.trim());
  }

  all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { reports: all, total: all.length };
}

/**
 * Get a single report by ID.
 */
export function getReport(reportId: string): GrantReport | null {
  return reports.get(reportId.trim()) ?? null;
}

/**
 * Get all reports for a specific task.
 */
export function getReportsForTask(taskId: string): GrantReport[] {
  const set = taskReports.get(taskId.trim());
  if (!set) return [];
  return Array.from(set)
    .map((id) => reports.get(id))
    .filter((r): r is GrantReport => r !== undefined)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Resolve a report (admin action).
 */
export function resolveReport(
  reportId: string,
  resolvedBy: string,
  status: "resolved" | "dismissed",
  note?: string,
  now: Date = new Date(),
): ReportResult<{ report: GrantReport }> {
  const report = reports.get(reportId.trim());
  if (!report) {
    return { ok: false, status: 404, error: "Report not found." };
  }

  const updated: GrantReport = {
    ...report,
    status,
    resolvedAt: now.toISOString(),
    resolvedBy: resolvedBy.trim(),
    resolutionNote: note?.trim() || null,
  };

  reports.set(report.id, updated);
  return { ok: true, report: updated };
}

/**
 * Mark a report as "reviewing" (admin started reviewing).
 */
export function markReviewing(
  reportId: string,
  now: Date = new Date(),
): ReportResult<{ report: GrantReport }> {
  const report = reports.get(reportId.trim());
  if (!report) {
    return { ok: false, status: 404, error: "Report not found." };
  }

  if (report.status !== "pending") {
    return {
      ok: false,
      status: 400,
      error: `Report is already ${report.status}.`,
    };
  }

  const updated: GrantReport = {
    ...report,
    status: "reviewing",
  };

  reports.set(report.id, updated);
  return { ok: true, report: updated };
}

export function resetReportStore() {
  reports.clear();
  taskReports.clear();
  nextReportId = 1;
}
