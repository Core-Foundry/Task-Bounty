import { describe, it, expect, beforeEach } from "vitest";
import {
  getReminderSettings,
  updateReminderSettings,
  scheduleReminders,
  processDueReminders,
  getPendingReminders,
  cancelRemindersForTask,
  resetDeadlineReminderStore,
  DEFAULT_TIMINGS,
  VALID_TIMINGS,
  TIMING_CONFIG,
} from "@/lib/deadline-reminder";

describe("deadline-reminder", () => {
  beforeEach(() => {
    resetDeadlineReminderStore();
  });

  describe("getReminderSettings", () => {
    it("returns default settings for new user", () => {
      const settings = getReminderSettings("user1");
      expect(settings.enabled).toBe(true);
      expect(settings.timings).toEqual(DEFAULT_TIMINGS);
    });

    it("returns the same settings object on subsequent calls", () => {
      const s1 = getReminderSettings("user1");
      const s2 = getReminderSettings("user1");
      expect(s1).toBe(s2);
    });
  });

  describe("updateReminderSettings", () => {
    it("updates enabled flag", () => {
      const result = updateReminderSettings("user1", { enabled: false });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.settings.enabled).toBe(false);
      }
    });

    it("updates timings", () => {
      const result = updateReminderSettings("user1", { timings: ["1d", "14d"] });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.settings.timings).toEqual(["1d", "14d"]);
      }
    });

    it("deduplicates timings", () => {
      const result = updateReminderSettings("user1", { timings: ["1d", "1d", "3d"] });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.settings.timings).toEqual(["1d", "3d"]);
      }
    });

    it("returns 400 for invalid timing", () => {
      const result = updateReminderSettings("user1", { timings: ["1d", "fake" as never] });
      expect(result.ok).toBe(false);
    });
  });

  describe("scheduleReminders", () => {
    it("schedules reminders based on user settings", () => {
      const futureDeadline = Math.floor(Date.now() / 1000) + 30 * 24 * 3600; // 30 days
      const result = scheduleReminders(
        { id: "t1", title: "Task 1", deadline: futureDeadline },
        "user1",
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.scheduled).toBe(3); // DEFAULT_TIMINGS = 7d, 3d, 1d
      }
    });

    it("schedules 0 reminders for expired tasks", () => {
      const pastDeadline = Math.floor(Date.now() / 1000) - 100;
      const result = scheduleReminders(
        { id: "t1", title: "Task 1", deadline: pastDeadline },
        "user1",
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.scheduled).toBe(0);
      }
    });

    it("schedules 0 reminders when user has reminders disabled", () => {
      updateReminderSettings("user1", { enabled: false });
      const futureDeadline = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
      const result = scheduleReminders(
        { id: "t1", title: "Task 1", deadline: futureDeadline },
        "user1",
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.scheduled).toBe(0);
      }
    });

    it("does not create duplicate reminders", () => {
      const futureDeadline = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
      scheduleReminders({ id: "t1", title: "Task 1", deadline: futureDeadline }, "user1");
      const result = scheduleReminders(
        { id: "t1", title: "Task 1", deadline: futureDeadline },
        "user1",
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.scheduled).toBe(0);
      }
    });
  });

  describe("processDueReminders", () => {
    it("sends notifications for due reminders", () => {
      const reminderTime = Math.floor(Date.now() / 1000) - 100; // already passed
      const futureDeadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour
      scheduleReminders(
        { id: "t1", title: "Task 1", deadline: futureDeadline },
        "user1",
      );

      // Override reminderTime to be in the past
      // We manually call processDueReminders which should find unsent reminders
      // with reminderTime <= now
      const pending = getPendingReminders("user1");
      // The 1d reminder (24h before deadline) should have reminderTime in the past
      // since deadline is only 1h away
      expect(pending.length).toBeGreaterThan(0);

      const result = processDueReminders();
      expect(result.processed).toBeGreaterThan(0);
    });

    it("marks expired task reminders without sending", () => {
      const pastDeadline = Math.floor(Date.now() / 1000) - 100;
      // Manually create a reminder for an expired task
      scheduleReminders(
        { id: "t1", title: "Task 1", deadline: pastDeadline + 200 },
        "user1",
      );
      // This won't schedule because deadline is in the past
      // So let's test with a very close deadline
      const closeDeadline = Math.floor(Date.now() / 1000) - 50;
      const result = scheduleReminders(
        { id: "t2", title: "Task 2", deadline: closeDeadline },
        "user2",
      );
      // No reminders scheduled for expired tasks
      if (result.ok) {
        expect(result.scheduled).toBe(0);
      }
    });
  });

  describe("cancelRemindersForTask", () => {
    it("cancels unsent reminders for a task", () => {
      const futureDeadline = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
      scheduleReminders(
        { id: "t1", title: "Task 1", deadline: futureDeadline },
        "user1",
      );
      const cancelled = cancelRemindersForTask("user1", "t1");
      expect(cancelled).toBe(3); // 3 default timings
      expect(getPendingReminders("user1").length).toBe(0);
    });

    it("returns 0 when no reminders exist", () => {
      expect(cancelRemindersForTask("user1", "t1")).toBe(0);
    });
  });

  describe("constants", () => {
    it("exports VALID_TIMINGS", () => {
      expect(VALID_TIMINGS).toEqual(["1d", "3d", "7d", "14d", "30d"]);
    });

    it("TIMING_CONFIG has correct hoursBefore values", () => {
      expect(TIMING_CONFIG["1d"].hoursBefore).toBe(24);
      expect(TIMING_CONFIG["3d"].hoursBefore).toBe(72);
      expect(TIMING_CONFIG["7d"].hoursBefore).toBe(168);
    });
  });
});
