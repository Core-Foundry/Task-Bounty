import { createTask } from "@/lib/task-workflow";
import { buildErrorResponse, buildNoStoreJson } from "@/lib/api-response";
import { createTask, listTasks } from "@/lib/task-workflow";
import { buildNoStoreJson } from "@/lib/api-response";
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
    page: parseOptionalNumber(searchParams.get("page")),
    pageSize: parseOptionalNumber(searchParams.get("pageSize")),
  });

  return buildNoStoreJson(
    {
      ok: true,
      tasks: result.tasks,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
    },
    200,
    rateLimitHeaders,
  );
}

export async function POST(request: Request) {
  const { response: rateLimitResponse, headers: rateLimitHeaders } =
    checkRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return buildErrorResponse(
      "Request body must be valid JSON.",
      400,
      "INVALID_JSON",
      undefined,
      undefined,
      rateLimitHeaders,
    );
  }

  if (!body || typeof body !== "object") {
    return buildErrorResponse(
      "Invalid task payload.",
      400,
      "INVALID_PAYLOAD",
      ["Request body must be a JSON object."],
      undefined,
      rateLimitHeaders,
    );
  }

  const payload = body as Record<string, unknown>;
  const difficulty = VALID_DIFFICULTIES.includes(payload.difficulty as TaskDifficulty)
    ? (payload.difficulty as TaskDifficulty)
    : undefined;

  const result = createTask({
    poster: String(payload.poster ?? ""),
    title: String(payload.title ?? ""),
    description: String(payload.description ?? ""),
    reward: Number(payload.reward),
    deadline: Number(payload.deadline),
    maxSubmissions: Number(payload.maxSubmissions),
    difficulty,
    technologies: Array.isArray(payload.technologies)
      ? payload.technologies.map((tech) => String(tech))
      : undefined,
    organization: payload.organization ? String(payload.organization) : undefined,
  });

  if (!result.ok) {
    return buildErrorResponse(
      result.error,
      result.status,
      "TASK_CREATION_FAILED",
      result.details,
      undefined,
      rateLimitHeaders,
    );
  }

  return buildNoStoreJson(
    {
      ok: true,
      task: result.task,
    },
    201,
    rateLimitHeaders,
  );
}
