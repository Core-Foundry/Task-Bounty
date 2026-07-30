import { createTask } from "@/lib/task-workflow";
import { buildNoStoreJson } from "@/lib/api-response";
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
    return buildNoStoreJson(
      {
        ok: false,
        error: "Request body must be valid JSON.",
      },
      400,
      rateLimitHeaders,
    );
  }

  if (!body || typeof body !== "object") {
    return buildNoStoreJson(
      {
        ok: false,
        error: "Invalid task payload.",
        details: ["Request body must be a JSON object."],
      },
      400,
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
    return buildNoStoreJson(
      {
        ok: false,
        error: result.error,
        details: result.details,
      },
      result.status,
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
