import { NextRequest, NextResponse } from "next/server";
import {
  submitReport,
  listReports,
  type ReportStatus,
  type ReportReason,
  VALID_REPORT_REASONS,
} from "@/lib/grant-report-store";

/**
 * GET /api/reports?status=<pending|reviewing|resolved|dismissed>&taskId=<taskId>
 * List reports, optionally filtered.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as ReportStatus | null;
  const taskId = searchParams.get("taskId");

  const result = listReports({
    status: status ?? undefined,
    taskId: taskId ?? undefined,
  });

  return NextResponse.json(result);
}

/**
 * POST /api/reports
 * Body: { taskId, reportedBy, reason, description }
 * Submit a new grant report.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const taskId = String(body.taskId ?? "").trim();
  const reportedBy = String(body.reportedBy ?? "").trim();
  const reason = String(body.reason ?? "") as ReportReason;
  const description = String(body.description ?? "").trim();

  if (!VALID_REPORT_REASONS.includes(reason)) {
    return NextResponse.json(
      { error: `Invalid reason. Valid reasons: ${VALID_REPORT_REASONS.join(", ")}.` },
      { status: 400 },
    );
  }

  const result = submitReport({ taskId, reportedBy, reason, description });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ report: result.report }, { status: 201 });
}
