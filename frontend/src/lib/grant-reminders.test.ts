import { afterEach, describe, expect, it } from "vitest";

import type { GrantRecord, ReminderConfig } from "@/types/grant";
import { DEFAULT_REMINDER_CONFIG } from "@/types/grant";
import { resetNotificationStore } from "@/lib/notification-store";
import { listDeadlineReminders, runDeadlineReminderSweep } from "@/lib/grant-reminders";
import { createGrant, listLiveGrants, resetGrantStore } from "@/lib/grant-store";

const OWNER = "GOWNER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function grant(overrides: Partial<GrantRecord> = {}): GrantRecord {
  return {
    id: "g1",
    title: "Creative Europe",
    funder: "European Commission",
    // 6.5 days out: inside the 7-day window (earliest default), outside 3d/1d/6h.
    deadline: Math.floor(Date.now() / 1000) + 6.5 * 24 * 60 * 60,
    status: "active",
    owner: OWNER,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

afterEach(() => {
  resetNotificationStore();
  resetGrantStore();
});

describe("grant deadline reminders — acceptance criteria", () => {
  it("1. fires a reminder when a deadline is approaching", () => {
    // 6.5 days out: inside the 7-day window (earliest default).
    const fired = new Set<string>();
    const { reminders } = runDeadlineReminderSweep([grant()], OWNER, undefined, new Date(), fired);

    expect(reminders).toHaveLength(1);
    expect(reminders[0].type).toBe("grant_deadline_reminder");
    expect(reminders[0].message).toContain("Creative Europe");
  });

  it("1. does not fire before any reminder window is entered", () => {
    // 10 days out; the earliest default window is 7 days → nothing due.
    const far = grant({ deadline: Math.floor(Date.now() / 1000) + 10 * 24 * 60 * 60 });
    const fired = new Set<string>();
    const { reminders } = runDeadlineReminderSweep([far], OWNER, undefined, new Date(), fired);

    expect(reminders).toHaveLength(0);
  });

  it("1. fires each configured window exactly once (no duplicates)", () => {
    const fired = new Set<string>();
    const g = grant(); // 6.5 days out → 7d window due on first sweep
    const first = runDeadlineReminderSweep([g], OWNER, undefined, new Date(), fired);
    expect(first.reminders).toHaveLength(1);
    expect(first.reminders[0].message).toContain("7 days");

    // Advance 4 days → 2.5 days out, now inside the 3-day window as well.
    const later = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
    const second = runDeadlineReminderSweep([g], OWNER, undefined, later, fired);

    expect(second.reminders).toHaveLength(1);
    expect(second.reminders[0].message).toContain("3 days");

    // Re-running immediately must not duplicate.
    const third = runDeadlineReminderSweep([g], OWNER, undefined, later, fired);
    expect(third.reminders).toHaveLength(0);
  });

  it("2. honours a custom reminder configuration", () => {
    const config: ReminderConfig = { reminderOffsetsSeconds: [48 * 60 * 60] }; // 48h only
    // 47h out: inside the custom 48h window, and no default windows apply.
    const g = grant({ deadline: Math.floor(Date.now() / 1000) + 47 * 60 * 60 });

    const fired = new Set<string>();
    const { reminders } = runDeadlineReminderSweep([g], OWNER, config, new Date(), fired);

    expect(reminders).toHaveLength(1);
    // 48h is formatted as "2 days" in the message.
    expect(reminders[0].message).toContain("2 days");
  });

  it("2. default config exposes 7d/3d/1d/6h offsets", () => {
    expect(DEFAULT_REMINDER_CONFIG.reminderOffsetsSeconds).toEqual([
      7 * 24 * 60 * 60,
      3 * 24 * 60 * 60,
      24 * 60 * 60,
      6 * 60 * 60,
    ]);
  });

  it("3. expired grants generate no notifications", () => {
    const expired = grant({
      deadline: Math.floor(Date.now() / 1000) - 3 * 24 * 60 * 60, // 3 days ago
    });
    const fired = new Set<string>();
    const { reminders, expiredGrantIds } = runDeadlineReminderSweep(
      [expired],
      OWNER,
      undefined,
      new Date(),
      fired,
    );

    expect(reminders).toHaveLength(0);
    expect(expiredGrantIds).toEqual([expired.id]);
    expect(listDeadlineReminders(OWNER)).toHaveLength(0);
  });

  it("3. a grant that expires between sweeps stops reminding", () => {
    const fired = new Set<string>();
    const g = grant(); // 6.5 days out

    // First sweep fires the 7-day window.
    const first = runDeadlineReminderSweep([g], OWNER, undefined, new Date(), fired);
    expect(first.reminders).toHaveLength(1);

    // Time jumps past the deadline → no further notifications ever.
    const afterDeadline = new Date(Date.now() + 11 * 24 * 60 * 60 * 1000);
    const second = runDeadlineReminderSweep([g], OWNER, undefined, afterDeadline, fired);
    expect(second.reminders).toHaveLength(0);
    expect(second.expiredGrantIds).toEqual([g.id]);
  });

  it("ignores grants owned by other users", () => {
    const other = grant({ owner: "GSOMEONE-ELSE" });
    const fired = new Set<string>();
    const { reminders } = runDeadlineReminderSweep([other], OWNER, undefined, new Date(), fired);
    expect(reminders).toHaveLength(0);
  });

  it("integrates with grant-store: live grants exclude expired ones", () => {
    const soon = createGrant({
      title: "Near deadline",
      funder: "F",
      // 5h out: inside the 6h window only (7d/3d/1d windows not yet entered).
      deadline: Math.floor(Date.now() / 1000) + 5 * 60 * 60,
      owner: OWNER,
    });
    createGrant({
      title: "Already gone",
      funder: "F",
      deadline: Math.floor(Date.now() / 1000) - 60,
      owner: OWNER,
    });

    const live = listLiveGrants(OWNER);
    expect(live.map((g) => g.id)).toEqual([soon.id]);

    const fired = new Set<string>();
    // 5h out means every default window (7d/3d/1d/6h) is due at once.
    const { reminders } = runDeadlineReminderSweep(live, OWNER, undefined, new Date(), fired);
    expect(reminders).toHaveLength(4);
    // Only the live grant reminded — the expired one is silent.
    expect(reminders.every((r) => r.message.includes("Near deadline"))).toBe(true);
  });
});
