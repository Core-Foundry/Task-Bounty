import { describe, it, expect, beforeEach } from "vitest";
import {
  recordActivity,
  listUserActivities,
  resetActivityStore,
  seedDefaultActivitiesIfEmpty,
} from "./activity-store";

describe("activity-store", () => {
  beforeEach(() => {
    resetActivityStore();
  });

  it("records activities and retrieves them in reverse chronological order", () => {
    const user = "GA123";
    const t1 = new Date(2026, 7, 30, 10, 0, 0);
    const t2 = new Date(2026, 7, 30, 11, 0, 0);
    const t3 = new Date(2026, 7, 30, 12, 0, 0);

    recordActivity(
      {
        userId: user,
        type: "grant_saved",
        title: "Saved Grant 1",
        description: "First saved grant",
      },
      t1,
    );

    recordActivity(
      {
        userId: user,
        type: "application_submitted",
        title: "Submitted Application",
        description: "Applied for bounty grant",
      },
      t2,
    );

    recordActivity(
      {
        userId: user,
        type: "account_updated",
        title: "Updated Profile",
        description: "Updated bio",
      },
      t3,
    );

    const result = listUserActivities({ userId: user });
    expect(result.total).toBe(3);
    expect(result.activities[0].title).toBe("Updated Profile");
    expect(result.activities[1].title).toBe("Submitted Application");
    expect(result.activities[2].title).toBe("Saved Grant 1");
  });

  it("isolates activities strictly per user (users only see their own activity)", () => {
    const userA = "GA123";
    const userB = "GB456";

    recordActivity({
      userId: userA,
      type: "grant_saved",
      title: "User A Grant",
      description: "Only for A",
    });

    recordActivity({
      userId: userB,
      type: "application_submitted",
      title: "User B App",
      description: "Only for B",
    });

    const userAResult = listUserActivities({ userId: userA });
    expect(userAResult.total).toBe(1);
    expect(userAResult.activities[0].title).toBe("User A Grant");

    const userBResult = listUserActivities({ userId: userB });
    expect(userBResult.total).toBe(1);
    expect(userBResult.activities[0].title).toBe("User B App");
  });

  it("filters activities by activity type", () => {
    const user = "GA123";

    recordActivity({
      userId: user,
      type: "grant_saved",
      title: "Saved Grant",
      description: "Watchlist item",
    });

    recordActivity({
      userId: user,
      type: "application_submitted",
      title: "Grant Application",
      description: "Submitted to foundation",
    });

    const savedGrants = listUserActivities({ userId: user, type: "grant_saved" });
    expect(savedGrants.total).toBe(1);
    expect(savedGrants.activities[0].type).toBe("grant_saved");

    const applications = listUserActivities({ userId: user, type: "application_submitted" });
    expect(applications.total).toBe(1);
    expect(applications.activities[0].type).toBe("application_submitted");
  });

  it("handles pagination with limit and offset", () => {
    const user = "GA123";
    for (let i = 1; i <= 5; i++) {
      recordActivity(
        {
          userId: user,
          type: "grant_saved",
          title: `Grant ${i}`,
          description: `Desc ${i}`,
        },
        new Date(2026, 7, 30, 10, i, 0),
      );
    }

    const page1 = listUserActivities({ userId: user, limit: 2, offset: 0 });
    expect(page1.activities).toHaveLength(2);
    expect(page1.total).toBe(5);
    expect(page1.activities[0].title).toBe("Grant 5");

    const page2 = listUserActivities({ userId: user, limit: 2, offset: 2 });
    expect(page2.activities).toHaveLength(2);
    expect(page2.activities[0].title).toBe("Grant 3");
  });

  it("seeds default activities when empty", () => {
    const user = "GNEWUSER";
    seedDefaultActivitiesIfEmpty(user);

    const result = listUserActivities({ userId: user });
    expect(result.total).toBeGreaterThan(0);
    const types = result.activities.map((a) => a.type);
    expect(types).toContain("application_submitted");
    expect(types).toContain("grant_saved");
    expect(types).toContain("account_updated");
  });
});
