import { markAllAsRead } from "@/lib/notification-store";
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
      { ok: false, error: "Request body must be valid JSON." },
      400,
      rateLimitHeaders,
    );
  }

  const userId = String(
    (body as Record<string, unknown> | null)?.userId ?? "",
  ).trim();

  if (!userId) {
    return buildNoStoreJson(
      { ok: false, error: "userId is required." },
      400,
      rateLimitHeaders,
    );
  }

  const updatedCount = markAllAsRead(userId);

  return buildNoStoreJson({ ok: true, updatedCount }, 200, rateLimitHeaders);
}
