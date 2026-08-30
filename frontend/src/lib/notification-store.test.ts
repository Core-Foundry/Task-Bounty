import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  BROADCAST_USER_ID,
  createNotification,
  getUnreadCount,
  listNotifications,
  markAllAsRead,
  markAsRead,
  pruneExpiredNotifications,
  resetNotificationStore,
  subscribe,
} from "@/lib/notification-store";

describe("notification-store", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_NOTIFICATION_RETENTION_DAYS", "36500");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetNotificationStore();
  });

  it("uses the configured retention window for historical notifications", () => {
    vi.stubEnv("NEXT_PUBLIC_NOTIFICATION_RETENTION_DAYS", "1");
    const now = new Date("2026-08-30T12:00:00.000Z");
    createNotification(
      { userId: "alice", type: "bounty_created", title: "Expired", message: "m" },
      new Date("2026-08-28T12:00:00.000Z"),
    );
    createNotification(
      { userId: "alice", type: "bounty_created", title: "Still active", message: "m" },
      now,
    );

    pruneExpiredNotifications(now);

    expect(listNotifications("alice")).toHaveLength(1);
    expect(listNotifications("alice")[0].title).toBe("Still active");
  });

  it("creates a notification with an incrementing id and unread by default", () => {
    const a = createNotification({
      userId: "alice",
      type: "bounty_created",
      title: "New bounty",
      message: "hello",
    });
    const b = createNotification({
      userId: "alice",
      type: "bounty_created",
      title: "New bounty 2",
      message: "hello again",
    });

    expect(a.id).not.toBe(b.id);
    expect(a.read).toBe(false);
    expect(b.read).toBe(false);
  });

  it("lists notifications for a user, newest first", () => {
    createNotification(
      { userId: "alice", type: "bounty_created", title: "First", message: "m" },
      new Date("2026-01-01T00:00:00.000Z"),
    );
    createNotification(
      { userId: "alice", type: "bounty_created", title: "Second", message: "m" },
      new Date("2026-01-02T00:00:00.000Z"),
    );

    const list = listNotifications("alice");
    expect(list).toHaveLength(2);
    expect(list[0].title).toBe("Second");
    expect(list[1].title).toBe("First");
  });

  it("excludes notifications belonging to other users", () => {
    createNotification({ userId: "alice", type: "bounty_created", title: "A", message: "m" });
    createNotification({ userId: "bob", type: "bounty_created", title: "B", message: "m" });

    expect(listNotifications("alice")).toHaveLength(1);
    expect(listNotifications("bob")).toHaveLength(1);
  });

  it("delivers broadcast notifications to every user", () => {
    createNotification({
      userId: BROADCAST_USER_ID,
      type: "bounty_created",
      title: "New bounty",
      message: "everyone sees this",
    });

    expect(listNotifications("alice")).toHaveLength(1);
    expect(listNotifications("bob")).toHaveLength(1);
  });

  it("tracks unread count and marks individual notifications as read", () => {
    const n1 = createNotification({ userId: "alice", type: "bounty_created", title: "A", message: "m" });
    createNotification({ userId: "alice", type: "bounty_created", title: "B", message: "m" });

    expect(getUnreadCount("alice")).toBe(2);

    const updated = markAsRead("alice", n1.id);
    expect(updated?.read).toBe(true);
    expect(getUnreadCount("alice")).toBe(1);
  });

  it("does not let one user mark another user's notification as read", () => {
    const n1 = createNotification({ userId: "alice", type: "bounty_created", title: "A", message: "m" });

    const result = markAsRead("bob", n1.id);
    expect(result).toBeNull();
    expect(getUnreadCount("alice")).toBe(1);
  });

  it("marks all notifications as read for a user and returns the count updated", () => {
    createNotification({ userId: "alice", type: "bounty_created", title: "A", message: "m" });
    createNotification({ userId: "alice", type: "bounty_created", title: "B", message: "m" });
    createNotification({ userId: "bob", type: "bounty_created", title: "C", message: "m" });

    const updatedCount = markAllAsRead("alice");

    expect(updatedCount).toBe(2);
    expect(getUnreadCount("alice")).toBe(0);
    expect(getUnreadCount("bob")).toBe(1);
  });

  it("notifies subscribers instantly when a matching notification is created", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe("alice", listener);

    createNotification({ userId: "alice", type: "submission_received", title: "A", message: "m" });
    createNotification({ userId: "bob", type: "submission_received", title: "B", message: "m" });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toMatchObject({ userId: "alice", title: "A" });

    unsubscribe();
    createNotification({ userId: "alice", type: "submission_received", title: "C", message: "m" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("delivers broadcast notifications to subscribers regardless of userId", () => {
    const listener = vi.fn();
    subscribe("alice", listener);

    createNotification({
      userId: BROADCAST_USER_ID,
      type: "bounty_created",
      title: "Broadcast",
      message: "m",
    });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("prunes expired notifications automatically", () => {
    vi.stubEnv("NEXT_PUBLIC_NOTIFICATION_RETENTION_DAYS", "1");
    const now = new Date();
    const expiredAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const activeAt = new Date(now.getTime() - 12 * 60 * 60 * 1000);

    createNotification(
      { userId: "alice", type: "bounty_created", title: "Expired", message: "old" },
      expiredAt,
    );
    createNotification(
      { userId: "alice", type: "bounty_created", title: "Still active", message: "new" },
      activeAt,
    );

    pruneExpiredNotifications(now);

    expect(listNotifications("alice")).toHaveLength(1);
    expect(listNotifications("alice")[0].title).toBe("Still active");
  });
});
