import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/dashboard/stats/route";
import { DASHBOARD_GROUPS } from "@/constants/dashboard-groups";
import {
  getDashboardStatistics,
  getDashboardStatisticsNaive,
} from "@/lib/dashboard-stats";

describe("dashboard statistics query optimization", () => {
  it("returns the same aggregates for naive and optimized strategies", () => {
    const naive = getDashboardStatisticsNaive();
    const optimized = getDashboardStatistics();

    expect(optimized.stats).toEqual(naive.stats);
    expect(optimized.stats.activeGroupCount).toBe(DASHBOARD_GROUPS.length);
    expect(optimized.stats.totalFunds).toBe(70050);
    expect(optimized.stats.totalMembers).toBe(35);
    expect(optimized.stats.maxFunds).toBe(24500);
    expect(optimized.stats.totalTransactions).toBe(118);
  });

  it("reduces query count versus the naive multi-pass approach", () => {
    const naive = getDashboardStatisticsNaive();
    const optimized = getDashboardStatistics();

    expect(naive.meta.strategy).toBe("naive");
    expect(optimized.meta.strategy).toBe("optimized");
    expect(optimized.meta.queryCount).toBe(1);
    expect(naive.meta.queryCount).toBeGreaterThan(optimized.meta.queryCount);
    expect(optimized.meta.queryCount).toBeLessThanOrEqual(1);
  });

  it("preserves group ordering and fields for the overview widget", () => {
    const { stats } = getDashboardStatistics();

    expect(stats.groups).toHaveLength(DASHBOARD_GROUPS.length);
    expect(stats.groups[0]).toMatchObject({
      id: "1",
      name: "Paymesh Core",
      totalFunds: 24500,
      members: 8,
      activity: "high",
    });
    expect(stats.groups.map((group) => group.id)).toEqual(
      DASHBOARD_GROUPS.map((group) => group.id),
    );
  });

  it("GET /api/dashboard/stats serves a single aggregated payload", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.meta.queryCount).toBe(1);
    expect(body.meta.strategy).toBe("optimized");
    expect(body.stats.activeGroupCount).toBe(5);
    expect(body.stats.totalFunds).toBe(70050);
    expect(body.stats.groups).toHaveLength(5);
  });
});
