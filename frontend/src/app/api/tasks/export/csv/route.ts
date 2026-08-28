import { listTasks } from "@/lib/task-workflow";
import { generateGrantsCsv } from "@/lib/csv-export";
import { checkRateLimit } from "@/lib/rate-limit";
import type { TaskDifficulty, TaskSortOrder } from "@/types/task-workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_DIFFICULTIES: TaskDifficulty[] = ["beginner", "intermediate", "advanced"];
const VALID_SORTS: TaskSortOrder[] = ["newest", "reward_desc", "deadline_asc"];

function parseOptionalNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(request: Request) {
  const { response: rateLimitResponse, headers: rateLimitHeaders } =
    checkRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams } = new URL(request.url);
  const difficultyParam = searchParams.get("difficulty");
  const sortParam = searchParams.get("sort");

  const result = listTasks({
    search: searchParams.get("search") ?? undefined,
    minReward: parseOptionalNumber(searchParams.get("minReward")),
    maxReward: parseOptionalNumber(searchParams.get("maxReward")),
    difficulty: VALID_DIFFICULTIES.includes(difficultyParam as TaskDifficulty)
      ? (difficultyParam as TaskDifficulty)
      : undefined,
    technology: searchParams.get("technology") ?? undefined,
    organization: searchParams.get("organization") ?? undefined,
    sort: VALID_SORTS.includes(sortParam as TaskSortOrder)
      ? (sortParam as TaskSortOrder)
      : undefined,
    page: 1,
    pageSize: 50, // Max page size supported by listTasks
  });

  const csvContent = generateGrantsCsv(result.tasks);
  const filename = `grant-records-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csvContent, {
    status: 200,
    headers: {
      ...rateLimitHeaders,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
