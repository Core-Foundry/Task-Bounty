/**
 * Issue #151: Add Deadline Reminder Notifications
 *
 * Creates a deadline reminder system that notifies users when a
 * saved or active grant deadline is approaching. Integrates with
 * the existing notification-store and bookmark-store.
 */

import { createNotification } from "@/lib/notification-store";
import type { TaskRecord } from "@/types/task-workflow";

export type ReminderTiming = "1d" | "3d" | "7d" | "14d" | "30d";

export interface ReminderConfig {
  /** Hours before deadline to send reminder. */
  hoursBefore: number;
  label: string;
}

export interface DeadlineReminder {
  id: string;
  taskId: string;
  taskTitle: string;
  userId: string;
  deadline: number;
  reminderTime: number;
  sent: boolean;
  sentAt: string | null;
  createdAt: string;
}

export interface ReminderSettings {
  userId: string;
  enabled: boolean;
  timings: ReminderTiming[];
}

type ReminderSuccess<T> = { ok: true } & T;

type ReminderFailure = {
  ok: false;
  status: 400 | 404;
  error: string;
};

export type ReminderResult<T> = ReminderSuccess<T> | ReminderFailure;

/** Default reminder timings: 7 days, 3 days, and 1 day before deadline. */
export const DEFAULT_TIMINGS: ReminderTiming[] = ["7d", "3d", "1d"];

export const TIMING_CONFIG: Record<ReminderTiming, ReminderConfig> = {
  "30d": { hoursBefore: 30 * 24, label: "30 days" },
  "14d": { hoursBefore: 14 * 24, label: "14 days" },
  "7d": { hoursBefore: 7 * 24, label: "7 days" },
  "3d": { hoursBefore: 3 * 24, label: "3 days" },
  "1d": { hoursBefore: 1 * 24, label: "1 day" },
};

export const VALID_TIMINGS: ReminderTiming[] = ["1d", "3d", "7d", "14d", "30d"];

// --- in-memory stores ---

const reminders = new Map<string, DeadlineReminder>();
const userReminders = new Map<string, Set<string>>();
const userSettings = new Map<string, ReminderSettings>();
let nextReminderId = 1;

function getUserReminderSet(userId: string): Set<string> {
  let set = userReminders.get(userId);
  if (!set) {
    set = new Set<string>();
    userReminders.set(userId, set);
  }
  return set;
}

/**
 * Get or create default reminder settings for a user.
 */
export function getReminderSettings(userId: string): ReminderSettings {
  const uid = userId.trim();
  let settings = userSettings.get(uid);
  if (!settings) {
    settings = {
      userId: uid,
      enabled: true,
      timings: [...DEFAULT_TIMINGS],
    };
    userSettings.set(uid, settings);
  }
  return settings;
}

/**
 * Update a user's reminder settings.
 */
export function updateReminderSettings(
  userId: string,
  updates: { enabled?: boolean; timings?: ReminderTiming[] },
): ReminderResult<{ settings: ReminderSettings }> {
  const uid = userId.trim();
  if (!uid) {
    return { ok: false, status: 400, error: "User ID is required." };
  }

  const current = getReminderSettings(uid);

  if (updates.timings) {
    const invalid = updates.timings.filter((t) => !VALID_TIMINGS.includes(t));
    if (invalid.length > 0) {
      return {
        ok: false,
        status: 400,
        error: `Invalid timings: ${invalid.join(", ")}. Valid: ${VALID_TIMINGS.join(", ")}`,
      };
    }
    current.timings = [...new Set(updates.timings)];
  }

  if (typeof updates.enabled === "boolean") {
    current.enabled = updates.enabled;
  }

  userSettings.set(uid, current);
  return { ok: true, settings: current };
}

/**
 * Schedule reminders for a task. Called when a user bookmarks a task
 * or when a new task is created.
 */
export function scheduleReminders(
  task: Pick<TaskRecord, "id" | "title" | "deadline">,
  userId: string,
  now: Date = new Date(),
): ReminderResult<{ scheduled: number }> {
  const uid = userId.trim();
  if (!uid) {
    return { ok: false, status: 400, error: "User ID is required." };
  }

  const settings = getReminderSettings(uid);
  if (!settings.enabled) {
    return { ok: true, scheduled: 0 };
  }

  const nowSeconds = Math.floor(now.getTime() / 1000);

  // Don't schedule reminders for already-expired tasks
  if (task.deadline <= nowSeconds) {
    return { ok: true, scheduled: 0 };
  }

  const rset = getUserReminderSet(uid);
  let scheduled = 0;

  for (const timing of settings.timings) {
    const config = TIMING_CONFIG[timing];
    const reminderTime = task.deadline - config.hoursBefore * 3600;

    // Skip if reminder time has already passed
    if (reminderTime <= nowSeconds) continue;

    // Check if a reminder for this task+timing already exists
    const exists = Array.from(rset)
      .map((id) => reminders.get(id))
      .some(
        (r) =>
          r &&
          r.taskId === task.id &&
          r.userId === uid &&
          Math.abs(r.reminderTime - reminderTime) < 3600,
      );
    if (exists) continue;

    const reminder: DeadlineReminder = {
      id: String(nextReminderId++),
      taskId: task.id,
      taskTitle: task.title,
      userId: uid,
      deadline: task.deadline,
      reminderTime,
      sent: false,
      sentAt: null,
      createdAt: now.toISOString(),
    };

    reminders.set(reminder.id, reminder);
    rset.add(reminder.id);
    scheduled++;
  }

  return { ok: true, scheduled };
}

/**
 * Process due reminders: send notifications for reminders whose time has come.
 * Should be called periodically (e.g., every minute).
 */
export function processDueReminders(
  now: Date = new Date(),
): { processed: number; expired: number } {
  const nowSeconds = Math.floor(now.getTime() / 1000);
  let processed = 0;
  let expired = 0;

  for (const [id, reminder] of reminders.entries()) {
    if (reminder.sent) continue;

    // If the deadline has passed, mark as expired (don't send)
    if (reminder.deadline <= nowSeconds) {
      const updated: DeadlineReminder = {
        ...reminder,
        sent: true,
        sentAt: now.toISOString(),
      };
      reminders.set(id, updated);
      expired++;
      continue;
    }

    // If reminder time has arrived, send notification
    if (reminder.reminderTime <= nowSeconds) {
      const hoursLeft = Math.ceil(
        (reminder.deadline - nowSeconds) / 3600,
      );

      let message: string;
      if (hoursLeft >= 24) {
        const daysLeft = Math.ceil(hoursLeft / 24);
        message = `"${reminder.taskTitle}" deadline is in ${daysLeft} day(s).`;
      } else {
        message = `"${reminder.taskTitle}" deadline is in ${hoursLeft} hour(s)!`;
      }

      createNotification(
        {
          userId: reminder.userId,
          type: "comment_added",
          title: "Deadline approaching",
          message,
          taskId: reminder.taskId,
        },
        now,
      );

      const updated: DeadlineReminder = {
        ...reminder,
        sent: true,
        sentAt: now.toISOString(),
      };
      reminders.set(id, updated);
      processed++;
    }
  }

  return { processed, expired };
}

/**
 * Get all pending (unsent) reminders for a user.
 */
export function getPendingReminders(userId: string): DeadlineReminder[] {
  const uid = userId.trim();
  const rset = userReminders.get(uid);
  if (!rset) return [];

  return Array.from(rset)
    .map((id) => reminders.get(id))
    .filter((r): r is DeadlineReminder => r !== undefined && !r.sent)
    .sort((a, b) => a.reminderTime - b.reminderTime);
}

/**
 * Cancel all reminders for a specific task+user (e.g., when unbookmarking).
 */
export function cancelRemindersForTask(
  userId: string,
  taskId: string,
): number {
  const uid = userId.trim();
  const tid = taskId.trim();
  const rset = userReminders.get(uid);
  if (!rset) return 0;

  let cancelled = 0;
  for (const id of Array.from(rset)) {
    const reminder = reminders.get(id);
    if (reminder && reminder.taskId === tid && !reminder.sent) {
      reminders.delete(id);
      rset.delete(id);
      cancelled++;
    }
  }

  return cancelled;
}

export function resetDeadlineReminderStore() {
  reminders.clear();
  userReminders.clear();
  userSettings.clear();
  nextReminderId = 1;
}
