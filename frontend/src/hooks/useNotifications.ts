"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NotificationRecord } from "@/types/notification";

export interface UseNotificationsReturn {
  notifications: NotificationRecord[];
  unreadCount: number;
  isConnected: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

interface SnapshotEvent {
  notifications: NotificationRecord[];
  unreadCount: number;
}

interface NotificationEvent {
  notification: NotificationRecord;
  unreadCount: number;
}

/**
 * Subscribes to the live notification stream for `userId` over
 * Server-Sent Events, falling back to an inert empty state until a userId
 * (e.g. a connected wallet address) is available.
 */
export function useNotifications(userId: string | null): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!userId || typeof window === "undefined") {
      return;
    }

    const source = new EventSource(
      `/api/notifications/stream?userId=${encodeURIComponent(userId)}`,
    );
    sourceRef.current = source;

    source.addEventListener("open", () => setIsConnected(true));
    source.addEventListener("error", () => setIsConnected(false));

    source.addEventListener("snapshot", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as SnapshotEvent;
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    });

    source.addEventListener("notification", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as NotificationEvent;
      setNotifications((prev) => [data.notification, ...prev]);
      setUnreadCount(data.unreadCount);
    });

    // Runs on userId change and on unmount — clears stale state from the
    // previous subscription rather than setting state synchronously in the
    // effect body.
    return () => {
      source.close();
      sourceRef.current = null;
      setNotifications([]);
      setUnreadCount(0);
      setIsConnected(false);
    };
  }, [userId]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!userId) return;

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      }).catch(() => {
        // Best-effort — the SSE snapshot will reconcile state on reconnect.
      });
    },
    [userId],
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    await fetch("/api/notifications/read-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    }).catch(() => {
      // Best-effort — the SSE snapshot will reconcile state on reconnect.
    });
  }, [userId]);

  return { notifications, unreadCount, isConnected, markAsRead, markAllAsRead };
}
