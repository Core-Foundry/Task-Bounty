import { afterEach, describe, expect, it } from "vitest";

import { createTask, listTasks, resetTaskWorkflowStore } from "@/lib/task-workflow";

function futureDeadline(offsetSeconds: number) {
  return Math.floor(Date.now() / 1000) + offsetSeconds;
}

function seedTasks() {
  createTask(
    {
      poster: "GPOSTER1",
      title: "Build a Soroban escrow contract",
      description: "Implement escrow logic in Rust for Soroban.",
      reward: 5_000_000,
      deadline: futureDeadline(86_400),
      maxSubmissions: 3,
      difficulty: "advanced",
      technologies: ["Rust", "Soroban"],
      organizationId: "org-sdf",
    },
    new Date("2026-01-01T00:00:00.000Z"),
  );

  createTask(
    {
      poster: "GPOSTER2",
      title: "Design a landing page",
      description: "Create a modern marketing landing page in Figma.",
      reward: 2_000_000,
      deadline: futureDeadline(172_800),
      maxSubmissions: 2,
      difficulty: "beginner",
      technologies: ["Figma", "CSS"],
      organizationId: "org-acme",
    },
    new Date("2026-01-02T00:00:00.000Z"),
  );

  createTask(
    {
      poster: "GPOSTER3",
      title: "Optimize React dashboard performance",
      description: "Reduce re-renders in the analytics dashboard.",
      reward: 8_000_000,
      deadline: futureDeadline(3_600),
      maxSubmissions: 1,
      difficulty: "intermediate",
      technologies: ["React", "TypeScript"],
      organizationId: "org-acme",
    },
    new Date("2026-01-03T00:00:00.000Z"),
  );
}

describe("listTasks", () => {
  afterEach(() => {
    resetTaskWorkflowStore();
  });

  it("defaults difficulty, technologies, and organization when omitted", () => {
    const result = createTask({
      poster: "GPOSTER",
      title: "Untitled bounty",
      description: "No extra metadata supplied.",
      reward: 1_000_000,
      deadline: futureDeadline(3_600),
      maxSubmissions: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.task.difficulty).toBe("intermediate");
    expect(result.task.technologies).toEqual([]);
    expect(result.task.organizationId).toBe("");
  });

  it("returns all tasks with no filters, newest first by default", () => {
    seedTasks();

    const result = listTasks();

    expect(result.total).toBe(3);
    expect(result.tasks.map((t) => t.title)).toEqual([
      "Optimize React dashboard performance",
      "Design a landing page",
      "Build a Soroban escrow contract",
    ]);
  });

  it("filters by reward range", () => {
    seedTasks();

    const result = listTasks({ minReward: 3_000_000, maxReward: 6_000_000 });

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toBe("Build a Soroban escrow contract");
  });

  it("filters by difficulty", () => {
    seedTasks();

    const result = listTasks({ difficulty: "beginner" });

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toBe("Design a landing page");
  });

  it("filters by technology (case-insensitive substring match)", () => {
    seedTasks();

    const result = listTasks({ technology: "rust" });

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toBe("Build a Soroban escrow contract");
  });

  it("filters by organization ID", () => {
    seedTasks();

    const result = listTasks({ organizationId: "org-acme" });

    expect(result.tasks).toHaveLength(2);
    expect(result.tasks.map((t) => t.title).sort()).toEqual(
      ["Design a landing page", "Optimize React dashboard performance"].sort(),
    );
  });

  it("searches by keyword across title and description", () => {
    seedTasks();

    const result = listTasks({ search: "dashboard" });

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toBe("Optimize React dashboard performance");
  });

  it("combines multiple filters with AND semantics", () => {
    seedTasks();

    const result = listTasks({ organizationId: "org-acme", difficulty: "beginner" });

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toBe("Design a landing page");

    const empty = listTasks({ organizationId: "org-acme", difficulty: "advanced" });
    expect(empty.tasks).toHaveLength(0);
    expect(empty.total).toBe(0);
  });

  it("sorts by highest reward", () => {
    seedTasks();

    const result = listTasks({ sort: "reward_desc" });

    expect(result.tasks.map((t) => t.reward)).toEqual([8_000_000, 5_000_000, 2_000_000]);
  });

  it("sorts by soonest deadline", () => {
    seedTasks();

    const result = listTasks({ sort: "deadline_asc" });

    expect(result.tasks.map((t) => t.title)).toEqual([
      "Optimize React dashboard performance",
      "Build a Soroban escrow contract",
      "Design a landing page",
    ]);
  });

  it("paginates results and reports correct metadata", () => {
    seedTasks();

    const firstPage = listTasks({ pageSize: 2, page: 1 });
    expect(firstPage.tasks).toHaveLength(2);
    expect(firstPage.total).toBe(3);
    expect(firstPage.totalPages).toBe(2);
    expect(firstPage.page).toBe(1);

    const secondPage = listTasks({ pageSize: 2, page: 2 });
    expect(secondPage.tasks).toHaveLength(1);
    expect(secondPage.page).toBe(2);

    const combinedTitles = [...firstPage.tasks, ...secondPage.tasks].map((t) => t.id).sort();
    expect(combinedTitles).toEqual(["1", "2", "3"]);
  });

  it("clamps page above the last page down to totalPages", () => {
    seedTasks();

    const result = listTasks({ pageSize: 2, page: 999 });

    expect(result.page).toBe(2);
    expect(result.tasks).toHaveLength(1);
  });

  it("clamps pageSize to the maximum allowed", () => {
    seedTasks();

    const result = listTasks({ pageSize: 10_000 });

    expect(result.pageSize).toBe(50);
  });

  it("treats non-positive page/pageSize as defaults instead of throwing", () => {
    seedTasks();

    const result = listTasks({ page: 0, pageSize: -5 });

    expect(result.page).toBe(1);
    expect(result.pageSize).toBeGreaterThan(0);
  });

  it("returns an empty page (not an error) with totalPages 1 when nothing matches", () => {
    seedTasks();

    const result = listTasks({ search: "nonexistent-keyword-xyz" });

    expect(result.tasks).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(1);
    expect(result.page).toBe(1);
  });

  it("keeps filtering and pagination combined and efficient for larger datasets", () => {
    for (let i = 0; i < 120; i += 1) {
      createTask({
        poster: `GPOSTER${i}`,
        title: `Bounty ${i}`,
        description: "Bulk seeded bounty for pagination testing.",
        reward: 1_000_000 + i * 1000,
        deadline: futureDeadline(3_600),
        maxSubmissions: 1,
        difficulty: i % 2 === 0 ? "beginner" : "advanced",
        technologies: ["TypeScript"],
        organizationId: "org-bulk",
      });
    }

    const start = Date.now();
    const result = listTasks({
      difficulty: "beginner",
      technology: "typescript",
      sort: "reward_desc",
      page: 2,
      pageSize: 10,
    });
    const elapsedMs = Date.now() - start;

    expect(result.total).toBe(60);
    expect(result.tasks).toHaveLength(10);
    expect(elapsedMs).toBeLessThan(200);
  });
});
