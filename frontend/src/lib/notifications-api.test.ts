import { afterEach, describe, expect, it } from "vitest";

import { GET as listNotificationsRoute } from "@/app/api/notifications/route";
import { POST as markReadRoute } from "@/app/api/notifications/[id]/read/route";
import { POST as markAllReadRoute } from "@/app/api/notifications/read-all/route";
import { createNotification, resetNotificationStore } from "@/lib/notification-store";

function readRouteContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/notifications", () => {
  afterEach(() => {
    resetNotificationStore();
  });

  it("requires a userId query parameter", async () => {
    const response = await listNotificationsRoute(
      new Request("http://localhost/api/notifications"),
    );
    expect(response.status).toBe(400);
  });

  it("returns notifications and unread count for the given user", async () => {
    createNotification({ userId: "alice", type: "bounty_created", title: "A", message: "m" });
    createNotification({ userId: "bob", type: "bounty_created", title: "B", message: "m" });

    const response = await listNotificationsRoute(
      new Request("http://localhost/api/notifications?userId=alice"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.notifications).toHaveLength(1);
    expect(body.unreadCount).toBe(1);
  });

  it("disables caching so unread counts are always live", async () => {
    const response = await listNotificationsRoute(
      new Request("http://localhost/api/notifications?userId=alice"),
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("POST /api/notifications/[id]/read", () => {
  afterEach(() => {
    resetNotificationStore();
  });

  it("marks a notification as read for its owner", async () => {
    const notification = createNotification({
      userId: "alice",
      type: "bounty_created",
      title: "A",
      message: "m",
    });

    const response = await markReadRoute(
      new Request(`http://localhost/api/notifications/${notification.id}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "alice" }),
      }),
      readRouteContext(notification.id),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.notification.read).toBe(true);
  });

  it("returns 404 when the notification does not belong to the requesting user", async () => {
    const notification = createNotification({
      userId: "alice",
      type: "bounty_created",
      title: "A",
      message: "m",
    });

    const response = await markReadRoute(
      new Request(`http://localhost/api/notifications/${notification.id}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "bob" }),
      }),
      readRouteContext(notification.id),
    );

    expect(response.status).toBe(404);
  });
});

describe("POST /api/notifications/read-all", () => {
  afterEach(() => {
    resetNotificationStore();
  });

  it("marks every unread notification for the user as read", async () => {
    createNotification({ userId: "alice", type: "bounty_created", title: "A", message: "m" });
    createNotification({ userId: "alice", type: "bounty_created", title: "B", message: "m" });

    const response = await markAllReadRoute(
      new Request("http://localhost/api/notifications/read-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "alice" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.updatedCount).toBe(2);
  });
});
