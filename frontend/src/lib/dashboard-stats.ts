import {
  DASHBOARD_GROUPS,
  type DashboardGroup,
} from "@/constants/dashboard-groups";

export type DashboardStatistics = {
  groups: DashboardGroup[];
  totalFunds: number;
  activeGroupCount: number;
  totalMembers: number;
  maxFunds: number;
  totalTransactions: number;
};

export type DashboardStatsQueryMeta = {
  /** Number of underlying data reads performed to build the response. */
  queryCount: number;
  /** Wall-clock milliseconds spent aggregating (best-effort). */
  durationMs: number;
  /** Strategy used to load the statistics. */
  strategy: "naive" | "optimized";
};

export type DashboardStatsResult = {
  ok: true;
  stats: DashboardStatistics;
  meta: DashboardStatsQueryMeta;
};

/**
 * Naive path: separate passes for each metric (simulates multiple DB round-trips).
 * Kept for regression comparison — production code should use the optimized path.
 */
export function getDashboardStatisticsNaive(
  groups: readonly DashboardGroup[] = DASHBOARD_GROUPS,
): DashboardStatsResult {
  const started = performance.now();
  let queryCount = 0;

  // Each reduce / map below models a separate query against storage.
  queryCount += 1;
  const listed = groups.map((group) => ({ ...group }));

  queryCount += 1;
  const totalFunds = listed.reduce((sum, group) => sum + group.totalFunds, 0);

  queryCount += 1;
  const activeGroupCount = listed.length;

  queryCount += 1;
  const totalMembers = listed.reduce((sum, group) => sum + group.members, 0);

  queryCount += 1;
  const maxFunds = listed.reduce(
    (max, group) => Math.max(max, group.totalFunds),
    0,
  );

  queryCount += 1;
  const totalTransactions = listed.reduce(
    (sum, group) => sum + group.recentTransactions,
    0,
  );

  return {
    ok: true,
    stats: {
      groups: listed,
      totalFunds,
      activeGroupCount,
      totalMembers,
      maxFunds,
      totalTransactions,
    },
    meta: {
      queryCount,
      durationMs: Number((performance.now() - started).toFixed(3)),
      strategy: "naive",
    },
  };
}

/**
 * Optimized path: one read of the group set, then a single aggregation pass.
 * Reduces query count from 6 → 1 while preserving identical statistics.
 */
export function getDashboardStatistics(
  groups: readonly DashboardGroup[] = DASHBOARD_GROUPS,
): DashboardStatsResult {
  const started = performance.now();

  // Single storage read of the dashboard dataset.
  const listed = groups.map((group) => ({ ...group }));
  const queryCount = 1;

  let totalFunds = 0;
  let totalMembers = 0;
  let maxFunds = 0;
  let totalTransactions = 0;

  for (const group of listed) {
    totalFunds += group.totalFunds;
    totalMembers += group.members;
    totalTransactions += group.recentTransactions;
    if (group.totalFunds > maxFunds) {
      maxFunds = group.totalFunds;
    }
  }

  return {
    ok: true,
    stats: {
      groups: listed,
      totalFunds,
      activeGroupCount: listed.length,
      totalMembers,
      maxFunds,
      totalTransactions,
    },
    meta: {
      queryCount,
      durationMs: Number((performance.now() - started).toFixed(3)),
      strategy: "optimized",
    },
  };
}
