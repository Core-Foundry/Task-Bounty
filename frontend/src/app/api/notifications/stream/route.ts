import {
  getUnreadCount,
  listNotifications,
  subscribe,
} from "@/lib/notification-store";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_INTERVAL_MS = 25_000;

function sseMessage(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Server-Sent Events stream of live notifications for a user.
 * Emits an initial `snapshot` with the current list + unread count, then a
 * `notification` event per newly created record, plus periodic `ping`
 * heartbeats to keep intermediary proxies from closing the connection.
 */
export async function GET(request: Request) {
  const { response: rateLimitResponse, headers: rateLimitHeaders } =
    checkRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams } = new URL(request.url);
  const userId = (searchParams.get("userId") ?? "").trim();

  if (!userId) {
    return new Response(
      JSON.stringify({ ok: false, error: "userId query parameter is required." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const encoder = new TextEncoder();
  let unsubscribe: () => void = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          sseMessage("snapshot", {
            notifications: listNotifications(userId),
            unreadCount: getUnreadCount(userId),
          }),
        ),
      );

      unsubscribe = subscribe(userId, (record) => {
        controller.enqueue(
          encoder.encode(
            sseMessage("notification", {
              notification: record,
              unreadCount: getUnreadCount(userId),
            }),
          ),
        );
      });

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          // Controller already closed; the interval is cleared on cancel().
        }
      }, HEARTBEAT_INTERVAL_MS);
    },
    cancel() {
      unsubscribe();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      ...rateLimitHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
