import {
  approveModerationItem,
  rejectModerationItem,
  dismissModerationItem,
  getModerationItem,
  type ModerationItem,
} from "@/lib/moderation-queue";
import { buildNoStoreJson } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { response: rateLimitResponse, headers: rateLimitHeaders } =
    checkRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { itemId } = await params;
  const item = getModerationItem(itemId);

  if (!item) {
    return buildNoStoreJson(
      { ok: false, error: "Moderation item not found." },
      404,
      rateLimitHeaders,
    );
  }

  return buildNoStoreJson(
    { ok: true, item },
    200,
    rateLimitHeaders,
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { response: rateLimitResponse, headers: rateLimitHeaders } =
    checkRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { itemId } = await params;
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

  const payload = body as Record<string, unknown>;
  const action = String(payload.action ?? "");
  const adminAddress = String(payload.adminAddress ?? "");
  const note = payload.note ? String(payload.note) : undefined;

  if (!adminAddress.trim()) {
    return buildNoStoreJson(
      { ok: false, error: "Admin address is required." },
      400,
      rateLimitHeaders,
    );
  }

  let modResult: { ok: true; item: ModerationItem } | { ok: false; error: string };

  if (action === "approve") {
    modResult = approveModerationItem(itemId, adminAddress, note);
  } else if (action === "reject") {
    modResult = rejectModerationItem(itemId, adminAddress, note);
  } else if (action === "dismiss") {
    modResult = dismissModerationItem(itemId, adminAddress, note);
  } else {
    return buildNoStoreJson(
      { ok: false, error: `Invalid action: ${action}. Use approve, reject, or dismiss.` },
      400,
      rateLimitHeaders,
    );
  }

  if (!modResult.ok) {
    return buildNoStoreJson(
      { ok: false, error: modResult.error },
      409,
      rateLimitHeaders,
    );
  }

  return buildNoStoreJson(
    { ok: true, item: modResult.item },
    200,
    rateLimitHeaders,
  );
}
