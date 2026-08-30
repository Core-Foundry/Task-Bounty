import { listContributorSubmissions } from "@/lib/task-workflow";
import { buildNoStoreJson } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/my-submissions?contributor=<address>
 * Submission history for a contributor: submitted date, status, task title.
 */
export async function GET(request: Request) {
  const { response: rateLimitResponse, headers: rateLimitHeaders } =
    checkRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const url = new URL(request.url);
  const contributor = url.searchParams.get("contributor") ?? "";

  const result = listContributorSubmissions(contributor);

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
      submissions: result.submissions,
    },
    200,
    rateLimitHeaders,
  );
}
