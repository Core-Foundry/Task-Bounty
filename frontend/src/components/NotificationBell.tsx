"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import type { NotificationRecord } from "@/types/notification";

const TYPE_LABELS: Record<NotificationRecord["type"], string> = {
  grant_deadline_reminder: "Deadline reminder",
  bounty_created: "New bounty",
  submission_received: "New submission",
  submission_approved: "Approved",
  submission_rejected: "Rejected",
  reward_paid: "Reward paid",
  comment_added: "Comment",
};

export interface NotificationBellProps {
  /** Current user's wallet address; the bell renders nothing when absent. */
  userId: string | null;
  className?: string;
}

export default function NotificationBell({ userId, className }: NotificationBellProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications(userId);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!userId) {
    return null;
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={open}
        aria-controls="notification-panel"
        onClick={() => setOpen((prev) => !prev)}
        className="relative inline-flex items-center justify-center p-2.5 rounded-full text-[#E2E2E2] bg-[#101011] hover:bg-[#1C1D2E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B63D6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0D10]"
      >
        <Bell size={20} aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF4D4D] px-1 text-[10px] font-bold text-white"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id="notification-panel"
          role="region"
          aria-label="Notifications"
          className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-[#0D0D10] border border-[#232542] rounded-xl shadow-2xl py-2 z-50"
        >
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#232542] mb-1">
            <span className="text-sm font-semibold text-white">Notifications</span>
            <button
              type="button"
              onClick={() => markAllAsRead()}
              disabled={unreadCount === 0}
              className={cn(
                "text-xs font-medium transition-colors",
                unreadCount === 0
                  ? "text-[#3A3B4E] cursor-not-allowed"
                  : "text-[#8B92E8] hover:underline",
              )}
            >
              Mark all read
            </button>
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[#5A6578] text-center">
              No notifications yet.
            </p>
          ) : (
            <ul role="list">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => markAsRead(notification.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b border-[#1C1D2E] last:border-0 transition-colors hover:bg-[#1C1D2E]",
                      !notification.read && "bg-[#5B63D6]/5",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      {!notification.read && (
                        <span
                          aria-hidden="true"
                          className="h-1.5 w-1.5 rounded-full bg-[#5B63D6] shrink-0"
                        />
                      )}
                      <span className="text-xs font-semibold text-[#8B92E8] uppercase tracking-wide">
                        {TYPE_LABELS[notification.type]}
                      </span>
                    </div>
                    <p className="text-sm text-white">{notification.title}</p>
                    <p className="text-xs text-[#5A6578] mt-0.5">
                      {notification.message}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
