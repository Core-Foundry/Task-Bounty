import { getDashboardStatistics } from "@/lib/dashboard-stats";
import { buildErrorResponse, buildNoStoreJson } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns dashboard overview statistics in a single response so the UI does not
 * need multiple round-trips for totals, member counts, and group listings.
 */
export async function GET(request: Request) {
  const { response: rateLimitResponse, headers: rateLimitHeaders } =
    checkRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const result = getDashboardStatistics();

    return buildNoStoreJson(
      {
        ok: true,
        stats: result.stats,
        meta: result.meta,
      },
      200,
      rateLimitHeaders,
    );
  } catch (error) {
    return buildErrorResponse(
      "Failed to retrieve dashboard statistics.",
      500,
      "STATS_FETCH_FAILED",
      error instanceof Error ? [error.message] : undefined,
      undefined,
      rateLimitHeaders,
    );
  }
}
