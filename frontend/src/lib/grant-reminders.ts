import type { GrantRecord, ReminderConfig } from "@/types/grant";
import { DEFAULT_REMINDER_CONFIG } from "@/types/grant";
import {
  createNotification,
  listNotifications,
} from "@/lib/notification-store";

/**
 * Grant deadline reminder engine.
 *
 * Acceptance criteria implemented here:
 * 1. Users receive reminders before deadlines — a reminder fires when `now`
 *    falls inside a configured reminder window (offset before deadline) and
 *    has not already fired for that window.
 * 2. Reminder timing is configurable — pass a ReminderConfig with custom
 *    `reminderOffsetsSeconds` (defaults: 7d / 3d / 1d / 6h before deadline).
 * 3. Expired grants no longer generate notifications — grants whose deadline
 *    has passed are skipped entirely, and expired grants are marked so
 *    callers can prune them from future sweeps.
 */

/** Message shown in the notification for a given reminder offset. */
function formatOffsetLabel(secondsBefore: number): string {
  if (secondsBefore % (24 * 60 * 60) === 0) {
    const days = secondsBefore / (24 * 60 * 60);
    return days === 1 ? "1 day" : `${days} days`;
  }
  if (secondsBefore % (60 * 60) === 0) {
    const hours = secondsBefore / (60 * 60);
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  return `${secondsBefore} seconds`;
}

/**
 * Which configured reminder windows does `now` fall inside for this grant?
 * A window (offset) is "due" when:
 *   deadline - offset <= now   (we have entered the window)
 * and the window has not already fired. Windows whose full period has
 * elapsed (now > deadline - offset + fireWindowSeconds) without firing are
 * still delivered late on the next sweep — a late reminder beats no
 * reminder — unless the deadline itself has passed.
 */
function dueOffsets(
  grant: GrantRecord,
  config: ReminderConfig,
  nowSeconds: number,
  firedWindows: Set<number>,
): number[] {
  return config.reminderOffsetsSeconds
    .filter((offset) => offset > 0)
    .filter((offset) => grant.deadline - offset <= nowSeconds)
    .filter((offset) => !firedWindows.has(offset));
}

/** Dedupe key for a fired reminder: one reminder per grant per window. */
function windowKey(grantId: string, offset: number): string {
  return `${grantId}::${offset}`;
}

/**
 * Run one reminder sweep over the given grants.
 *
 * @param grants  Grants to consider (saved + active). Expired grants are
 *                ignored and reported back via `expiredGrantIds`.
 * @param userId  Recipient for reminders (grant owner).
 * @param config  Reminder timing configuration.
 * @param now     Current time.
 * @param firedWindows Set of dedupe keys from previous sweeps; updated
 *                in place so repeated sweeps do not re-fire windows.
 *
 * @returns created notifications, plus ids of grants detected as expired.
 */
export function runDeadlineReminderSweep(
  grants: GrantRecord[],
  userId: string,
  config: ReminderConfig = DEFAULT_REMINDER_CONFIG,
  now: Date = new Date(),
  firedWindows: Set<string> = new Set<string>(),
): {
  reminders: ReturnType<typeof createNotification>[];
  expiredGrantIds: string[];
} {
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const reminders: ReturnType<typeof createNotification>[] = [];
  const expiredGrantIds: string[] = [];

  for (const grant of grants) {
    // Ownership check: only remind the grant's owner.
    if (grant.owner !== userId) continue;

    // Acceptance criterion 3: expired grants never generate notifications.
    if (grant.deadline <= nowSeconds) {
      expiredGrantIds.push(grant.id);
      continue;
    }

    const previouslyFired = new Set(
      Array.from(firedWindows)
        .filter((key) => key.startsWith(`${grant.id}::`))
        .map((key) => Number(key.split("::")[1])),
    );

    for (const offset of dueOffsets(grant, config, nowSeconds, previouslyFired)) {
      const label = formatOffsetLabel(offset);
      reminders.push(
        createNotification(
          {
            userId,
            type: "grant_deadline_reminder",
            title: "Grant deadline approaching",
            message: `${grant.title} (${grant.funder}) deadline is in ${label}.`,
            taskId: undefined,
            submissionId: undefined,
          },
          now,
        ),
      );
      firedWindows.add(windowKey(grant.id, offset));
    }
  }

  return { reminders, expiredGrantIds };
}

/**
 * Convenience wrapper: sweep with in-memory dedupe state held per user.
 * Suitable for the current in-process store; swap in persistent state when
 * the notification store moves to a database.
 */
const firedWindowsByUser = new Map<string, Set<string>>();

export function sweepGrantDeadlines(
  grants: GrantRecord[],
  userId: string,
  config: ReminderConfig = DEFAULT_REMINDER_CONFIG,
  now: Date = new Date(),
): ReturnType<typeof runDeadlineReminderSweep> {
  let fired = firedWindowsByUser.get(userId);
  if (!fired) {
    fired = new Set<string>();
    firedWindowsByUser.set(userId, fired);
  }
  return runDeadlineReminderSweep(grants, userId, config, now, fired);
}

/** Test helper: clear all dedupe state. */
export function resetGrantReminderState(): void {
  firedWindowsByUser.clear();
}

/**
 * Has every configured reminder window already fired (or become
 * unreachable) for this grant? Callers can use this to stop scheduling
 * sweeps for grants with nothing left to remind about.
 */
export function hasPendingReminders(
  grant: GrantRecord,
  config: ReminderConfig = DEFAULT_REMINDER_CONFIG,
  now: Date = new Date(),
): boolean {
  const nowSeconds = Math.floor(now.getTime() / 1000);
  if (grant.deadline <= nowSeconds) return false; // expired: nothing pending
  return config.reminderOffsetsSeconds.some(
    (offset) => offset > 0 && grant.deadline - offset <= nowSeconds,
  ) || config.reminderOffsetsSeconds.some((offset) => offset > 0);
}

/** All deadline reminders already created for a user (newest first). */
export function listDeadlineReminders(userId: string) {
  return listNotifications(userId).filter(
    (n) => n.type === "grant_deadline_reminder",
  );
}
