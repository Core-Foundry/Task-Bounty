import { approveSubmission } from "@/lib/task-workflow";
import { buildNoStoreJson } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ taskId: string; submissionId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { response: rateLimitResponse, headers: rateLimitHeaders } =
    checkRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { taskId, submissionId } = await context.params;

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

  const actor = String((body as Record<string, unknown> | null)?.actor ?? "").trim();

  if (!actor) {
    return buildNoStoreJson(
      { ok: false, error: "actor is required." },
      400,
      rateLimitHeaders,
    );
  }

  const result = approveSubmission(taskId, submissionId, actor);

  if (!result.ok) {
    return buildNoStoreJson(
      { ok: false, error: result.error, details: result.details },
      result.status,
      rateLimitHeaders,
    );
  }

  return buildNoStoreJson(
    { ok: true, task: result.task, submission: result.submission },
    200,
    rateLimitHeaders,
  );
}
