import { describe, it, expect, beforeEach } from "vitest";
import {
  enqueueModeration,
  listModerationItems,
  approveModerationItem,
  rejectModerationItem,
  dismissModerationItem,
  getModerationItem,
  resetModerationStore,
} from "@/lib/moderation-queue";

beforeEach(() => {
  resetModerationStore();
});

describe("enqueueModeration", () => {
  it("creates a pending item with generated ID", () => {
    const item = enqueueModeration({
      type: "duplicate_flag",
      targetId: "task-1",
      title: "Duplicate task detected",
      description: "Task 'Build DEX' may duplicate task #5",
      reportedBy: "system",
      severity: 3,
    });
    expect(item.id).toBe("1");
    expect(item.status).toBe("pending");
    expect(item.createdAt).toBeDefined();
  });
});

describe("listModerationItems", () => {
  it("returns empty queue initially", () => {
    const result = listModerationItems();
    expect(result.total).toBe(0);
    expect(result.pending).toBe(0);
  });

  it("filters by pending status", () => {
    enqueueModeration({
      type: "duplicate_flag",
      targetId: "t1",
      title: "Item 1",
      description: "desc",
      reportedBy: "system",
      severity: 3,
    });
    enqueueModeration({
      type: "user_report",
      targetId: "t2",
      title: "Item 2",
      description: "desc",
      reportedBy: "user1",
      severity: 5,
    });
    const result = listModerationItems({ status: "pending" });
    expect(result.total).toBe(2);
    // Higher severity first
    expect(result.items[0].title).toBe("Item 2");
  });

  it("counts by status correctly", () => {
    const item = enqueueModeration({
      type: "duplicate_flag",
      targetId: "t1",
      title: "Item 1",
      description: "desc",
      reportedBy: "system",
      severity: 3,
    });
    approveModerationItem(item.id, "admin1");
    const result = listModerationItems();
    expect(result.pending).toBe(0);
    expect(result.approved).toBe(1);
  });
});

describe("approveModerationItem", () => {
  it("approves a pending item", () => {
    const item = enqueueModeration({
      type: "duplicate_flag",
      targetId: "t1",
      title: "Test",
      description: "desc",
      reportedBy: "system",
      severity: 3,
    });
    const result = approveModerationItem(item.id, "admin1", "Looks good");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.item.status).toBe("approved");
      expect(result.item.reviewedBy).toBe("admin1");
      expect(result.item.adminNote).toBe("Looks good");
    }
  });

  it("fails on non-existent item", () => {
    const result = approveModerationItem("999", "admin1");
    expect(result.ok).toBe(false);
  });

  it("fails on already-reviewed item", () => {
    const item = enqueueModeration({
      type: "duplicate_flag",
      targetId: "t1",
      title: "Test",
      description: "desc",
      reportedBy: "system",
      severity: 3,
    });
    approveModerationItem(item.id, "admin1");
    const result = approveModerationItem(item.id, "admin2");
    expect(result.ok).toBe(false);
  });
});

describe("rejectModerationItem", () => {
  it("rejects a pending item", () => {
    const item = enqueueModeration({
      type: "user_report",
      targetId: "t1",
      title: "Report",
      description: "desc",
      reportedBy: "user1",
      severity: 4,
    });
    const result = rejectModerationItem(item.id, "admin1", "Not valid");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.item.status).toBe("rejected");
    }
  });
});

describe("dismissModerationItem", () => {
  it("dismisses a pending item", () => {
    const item = enqueueModeration({
      type: "duplicate_flag",
      targetId: "t1",
      title: "Flag",
      description: "desc",
      reportedBy: "system",
      severity: 1,
    });
    const result = dismissModerationItem(item.id, "admin1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.item.status).toBe("dismissed");
    }
  });
});

describe("getModerationItem", () => {
  it("returns item by ID", () => {
    const item = enqueueModeration({
      type: "duplicate_flag",
      targetId: "t1",
      title: "Test",
      description: "desc",
      reportedBy: "system",
      severity: 3,
    });
    const found = getModerationItem(item.id);
    expect(found).toBeDefined();
    expect(found!.title).toBe("Test");
  });

  it("returns undefined for non-existent ID", () => {
    expect(getModerationItem("999")).toBeUndefined();
  });
});
