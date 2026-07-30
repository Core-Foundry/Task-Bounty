import { getContributorReputation } from "@/lib/task-workflow";
import { buildNoStoreJson } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/reputation?contributor=<address>
 *
 * Returns the reputation score for a given contributor.
 * If no contributor is specified, returns an error.
 */
export async function GET(request: Request) {
  const { response: rateLimitResponse, headers: rateLimitHeaders } =
    checkRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams } = new URL(request.url);
  const contributor = searchParams.get("contributor")?.trim();

  if (!contributor) {
    return buildNoStoreJson(
      { ok: false, error: "contributor query parameter is required." },
      400,
      rateLimitHeaders,
    );
  }

  const reputation = getContributorReputation(contributor);

  return buildNoStoreJson(
    {
      ok: true,
      reputation,
    },
    200,
    rateLimitHeaders,
  );
}