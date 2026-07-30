import { getDashboardStatistics } from "@/lib/dashboard-stats";
import { buildNoStoreJson } from "@/lib/api-response";
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
}
