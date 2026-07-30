import { markAsRead } from "@/lib/notification-store";
import { buildNoStoreJson } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { response: rateLimitResponse, headers: rateLimitHeaders } =
    checkRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { id } = await context.params;

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

  const notification = markAsRead(userId, id);

  if (!notification) {
    return buildNoStoreJson(
      { ok: false, error: "Notification not found." },
      404,
      rateLimitHeaders,
    );
  }

  return buildNoStoreJson({ ok: true, notification }, 200, rateLimitHeaders);
}
