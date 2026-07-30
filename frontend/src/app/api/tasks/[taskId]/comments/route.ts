import { addComment } from "@/lib/task-workflow";
import { buildNoStoreJson } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ taskId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { response: rateLimitResponse, headers: rateLimitHeaders } =
    checkRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { taskId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return buildNoStoreJson(
      { ok: false, error: "Request body must be valid JSON." },
      400,
      rateLimitHeaders,
    );
  }

  const payload = (body ?? {}) as Record<string, unknown>;
  const submissionId = payload.submissionId
    ? String(payload.submissionId)
    : undefined;

  const result = addComment({
    taskId,
    submissionId,
    author: String(payload.author ?? ""),
    message: String(payload.message ?? ""),
  });

  if (!result.ok) {
    return buildNoStoreJson(
      { ok: false, error: result.error, details: result.details },
      result.status,
      rateLimitHeaders,
    );
  }

  return buildNoStoreJson({ ok: true, comment: result.comment }, 201, rateLimitHeaders);
}
