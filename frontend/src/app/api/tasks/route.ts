import { createTask } from "@/lib/task-workflow";
import { buildErrorResponse, buildNoStoreJson } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const result = createTask({
    poster: String(payload.poster ?? ""),
    title: String(payload.title ?? ""),
    description: String(payload.description ?? ""),
    reward: Number(payload.reward),
    deadline: Number(payload.deadline),
    maxSubmissions: Number(payload.maxSubmissions),
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
