import { listModerationItems } from "@/lib/moderation-queue";
import { buildNoStoreJson } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";
import type { ModerationStatus, ModerationItemType } from "@/lib/moderation-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { response: rateLimitResponse, headers: rateLimitHeaders } =
    checkRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const typeParam = searchParams.get("type");

  const filter: { status?: ModerationStatus; type?: ModerationItemType } = {};

  if (
    statusParam &&
    ["pending", "approved", "rejected", "dismissed"].includes(statusParam)
  ) {
    filter.status = statusParam as ModerationStatus;
  }

  if (
    typeParam &&
    ["task_created", "task_updated", "duplicate_flag", "user_report"].includes(
      typeParam,
    )
  ) {
    filter.type = typeParam as ModerationItemType;
  }

  const result = listModerationItems(
    Object.keys(filter).length > 0 ? filter : undefined,
  );

  return buildNoStoreJson(
    {
      ok: true,
      items: result.items,
      stats: {
        total: result.total,
        pending: result.pending,
        approved: result.approved,
        rejected: result.rejected,
        dismissed: result.dismissed,
      },
    },
    200,
    rateLimitHeaders,
  );
}
