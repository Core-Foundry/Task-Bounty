import { NextRequest, NextResponse } from "next/server";
import {
  getSubmissionHistory,
  getSubmissionCount,
  getSubmissionStatusBreakdown,
  type SubmissionHistoryStatus,
} from "@/lib/submission-history";

/**
 * GET /api/submission-history?userId=<wallet>&status=<all|pending|approved|rejected>&sort=<newest|oldest|status>&page=<n>&pageSize=<n>
 *
 * Returns the user's submission history with filtering, sorting, and pagination.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const userId = searchParams.get("userId") ?? "";
  const status = (searchParams.get("status") ?? "all") as SubmissionHistoryStatus;
  const sort = (searchParams.get("sort") ?? "newest") as
    | "newest"
    | "oldest"
    | "status";
  const page = Number(searchParams.get("page")) || undefined;
  const pageSize = Number(searchParams.get("pageSize")) || undefined;

  if (!userId.trim()) {
    return NextResponse.json(
      { error: "userId query parameter is required." },
      { status: 400 },
    );
  }

  const result = getSubmissionHistory({ userId, status, sort, page, pageSize });

  // Include summary counts in the response
  const totalCount = getSubmissionCount(userId);
  const statusBreakdown = getSubmissionStatusBreakdown(userId);

  return NextResponse.json({
    ...result,
    totalCount,
    statusBreakdown,
  });
}
