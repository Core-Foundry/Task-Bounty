import { describe, expect, it } from "vitest";
import { listUserActivities } from "@/lib/activity-store";
import { listOrganizations } from "@/lib/organization-store";
import { getUnreadCount, listNotifications } from "@/lib/notification-store";
import { getTask, listContributorSubmissions, listTasks } from "@/lib/task-workflow";
import { DEMO_USERS, resetDemoData, seedDemoData } from "@/lib/demo-seed";

describe("demo seed data", () => {
  const now = new Date();

  it("seeds realistic organizations and task workflow scenarios", () => {
    const summary = seedDemoData(now);

    expect(summary).toEqual({
      organizations: 2,
      tasks: 3,
      submissions: 2,
      comments: 1,
      notifications: 9,
      activities: 2,
    });
    expect(listOrganizations()).toHaveLength(2);
    expect(listTasks({}).tasks).toHaveLength(3);
    expect(listTasks({ difficulty: "advanced" }).tasks[0]?.status).toBe("completed");
    expect(listTasks({ technology: "typescript" }).tasks).toHaveLength(1);
    expect(listContributorSubmissions(DEMO_USERS.contributor).ok).toBe(true);
    expect(listNotifications(DEMO_USERS.contributor)).toHaveLength(7);
    expect(getUnreadCount(DEMO_USERS.contributor)).toBe(7);
    expect(listUserActivities({ userId: DEMO_USERS.contributor }).total).toBe(1);
  });

  it("can reset all seeded records and restart identifiers", () => {
    seedDemoData(now);
    resetDemoData();

    expect(listOrganizations()).toEqual([]);
    expect(listTasks({}).tasks).toEqual([]);
    expect(listNotifications(DEMO_USERS.contributor)).toEqual([]);
    expect(listUserActivities({ userId: DEMO_USERS.contributor }).total).toBe(0);
    expect(getTask("1").ok).toBe(false);

    const summary = seedDemoData(now);
    expect(summary.tasks).toBe(3);
    expect(listTasks({ sort: "newest" }).tasks[0]?.id).toBe("1");
  });
});
