import { EventEmitter } from "node:events";
import type {
  CreateNotificationInput,
  NotificationRecord,
} from "@/types/notification";

/** Recipient value meaning "deliver to every connected user". */
export const BROADCAST_USER_ID = "*";

const notifications = new Map<string, NotificationRecord>();
let nextId = 1;

// EventEmitter powers both the SSE stream and any in-process subscribers.
// Raised to avoid MaxListenersExceededWarning when many clients connect.
const emitter = new EventEmitter();
emitter.setMaxListeners(0);

const NOTIFICATION_EVENT = "notification";

function isForUser(record: NotificationRecord, userId: string): boolean {
  return record.userId === userId || record.userId === BROADCAST_USER_ID;
}

/**
 * Create a notification and publish it to any live subscribers.
 * `userId` may be a specific wallet address or `BROADCAST_USER_ID` ("*")
 * to notify every connected client (e.g. "new bounty created").
 */
export function createNotification(
  input: CreateNotificationInput,
  now: Date = new Date(),
): NotificationRecord {
  const record: NotificationRecord = {
    id: String(nextId++),
    userId: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    taskId: input.taskId,
    submissionId: input.submissionId,
    read: false,
    createdAt: now.toISOString(),
  };

  notifications.set(record.id, record);
  emitter.emit(NOTIFICATION_EVENT, record);

  return record;
}

/** List notifications for a user (specific + broadcast), newest first. */
export function listNotifications(userId: string): NotificationRecord[] {
  return Array.from(notifications.values())
    .filter((record) => isForUser(record, userId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getUnreadCount(userId: string): number {
  let count = 0;
  for (const record of notifications.values()) {
    if (isForUser(record, userId) && !record.read) {
      count += 1;
    }
  }
  return count;
}

export function markAsRead(
  userId: string,
  notificationId: string,
): NotificationRecord | null {
  const record = notifications.get(notificationId);
  if (!record || !isForUser(record, userId)) {
    return null;
  }

  if (!record.read) {
    const updated: NotificationRecord = { ...record, read: true };
    notifications.set(notificationId, updated);
    return updated;
  }

  return record;
}

export function markAllAsRead(userId: string): number {
  let updatedCount = 0;
  for (const [id, record] of notifications.entries()) {
    if (isForUser(record, userId) && !record.read) {
      notifications.set(id, { ...record, read: true });
      updatedCount += 1;
    }
  }
  return updatedCount;
}

/**
 * Subscribe to newly created notifications matching `userId` (or a
 * broadcast). Returns an unsubscribe function.
 */
export function subscribe(
  userId: string,
  listener: (record: NotificationRecord) => void,
): () => void {
  const handler = (record: NotificationRecord) => {
    if (isForUser(record, userId)) {
      listener(record);
    }
  };

  emitter.on(NOTIFICATION_EVENT, handler);
  return () => emitter.off(NOTIFICATION_EVENT, handler);
}

export function resetNotificationStore() {
  notifications.clear();
  nextId = 1;
  emitter.removeAllListeners(NOTIFICATION_EVENT);
}
