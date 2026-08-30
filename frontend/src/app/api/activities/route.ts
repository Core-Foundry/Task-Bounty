import { buildNoStoreJson } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  listUserActivities,
  recordActivity,
  seedDefaultActivitiesIfEmpty,
} from "@/lib/activity-store";
import type { ActivityType } from "@/types/activity";

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

  // Seed default activities for demo user if none exist yet
  seedDefaultActivitiesIfEmpty(userId);

  const type = (searchParams.get("type") as ActivityType) || undefined;
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");

  const limit = limitParam ? parseInt(limitParam, 10) : 50;
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

  const result = listUserActivities({
    userId,
    type,
    limit,
    offset,
  });

  return buildNoStoreJson(
    {
      ok: true,
      activities: result.activities,
      total: result.total,
    },
    200,
    rateLimitHeaders,
  );
}

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
      {
        ok: false,
        error: "Request body must be valid JSON.",
      },
      400,
      rateLimitHeaders,
    );
  }

  if (!body || typeof body !== "object") {
    return buildNoStoreJson(
      {
        ok: false,
        error: "Invalid activity payload.",
      },
      400,
      rateLimitHeaders,
    );
  }

  const payload = body as Record<string, unknown>;
  const userId = String(payload.userId ?? "").trim();
  const type = String(payload.type ?? "") as ActivityType;
  const title = String(payload.title ?? "").trim();
  const description = String(payload.description ?? "").trim();
  const metadata = (payload.metadata ?? undefined) as Record<string, unknown> | undefined;

  if (!userId) {
    return buildNoStoreJson(
      { ok: false, error: "userId is required." },
      400,
      rateLimitHeaders,
    );
  }

  if (!type) {
    return buildNoStoreJson(
      { ok: false, error: "type is required." },
      400,
      rateLimitHeaders,
    );
  }

  if (!title) {
    return buildNoStoreJson(
      { ok: false, error: "title is required." },
      400,
      rateLimitHeaders,
    );
  }

  const activity = recordActivity({
    userId,
    type,
    title,
    description,
    metadata,
  });

  return buildNoStoreJson(
    {
      ok: true,
      activity,
    },
    201,
    rateLimitHeaders,
  );
}
