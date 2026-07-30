import {
  getUnreadCount,
  listNotifications,
} from "@/lib/notification-store";
import { buildNoStoreJson } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { response: rateLimitResponse, headers: rateLimitHeaders } =
    checkRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams } = new URL(request.url);
  const userId = (searchParams.get("userId") ?? "").trim();

  if (!userId) {
    return buildNoStoreJson(
      {
        ok: false,
        error: "userId query parameter is required.",
      },
      400,
      rateLimitHeaders,
    );
  }

  const notifications = listNotifications(userId);
  const unreadCount = getUnreadCount(userId);

  return buildNoStoreJson(
    {
      ok: true,
      notifications,
      unreadCount,
    },
    200,
    rateLimitHeaders,
  );
}
