import { NextRequest, NextResponse } from "next/server";
import { exportTasksToCSV, generateExportFilename } from "@/lib/csv-export";
import { listTasks } from "@/lib/task-workflow";

/**
 * GET /api/export?format=csv&status=<status>&difficulty=<difficulty>
 *
 * Exports grant data in CSV format.
 * Sensitive fields (poster wallet address) are excluded by default.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "csv";
  const status = searchParams.get("status");
  const difficulty = searchParams.get("difficulty");

  if (format !== "csv") {
    return NextResponse.json(
      { error: "Only CSV format is supported." },
      { status: 400 },
    );
  }

  // Fetch all tasks (use large pageSize to get everything)
  const result = listTasks({ pageSize: 50, page: 1 });

  let tasks = result.tasks;

  // Apply filters
  if (status) {
    tasks = tasks.filter((t) => t.status === status);
  }
  if (difficulty) {
    tasks = tasks.filter((t) => t.difficulty === difficulty);
  }

  const csv = exportTasksToCSV(tasks);
  const filename = generateExportFilename();

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
