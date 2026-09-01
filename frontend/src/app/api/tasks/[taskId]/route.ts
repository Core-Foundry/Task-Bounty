import { getTask } from "@/lib/task-workflow";
import { buildErrorResponse, buildNoStoreJson } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ taskId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { response: rateLimitResponse, headers: rateLimitHeaders } =
    checkRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { taskId } = await context.params;
  const result = getTask(taskId);

  if (!result.ok) {
    return buildErrorResponse(
      result.error,
      result.status,
      "TASK_NOT_FOUND",
      undefined,
      undefined,
      rateLimitHeaders,
    );
  }

  return buildNoStoreJson(
    {
      ok: true,
      task: result.task,
    },
    200,
    rateLimitHeaders,
  );
}
