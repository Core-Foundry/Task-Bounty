import { afterEach, describe, expect, it } from "vitest";

import { GET as listTasksRoute, POST as createTaskRoute } from "@/app/api/tasks/route";
import { resetTaskWorkflowStore } from "@/lib/task-workflow";

function futureDeadline(offsetSeconds = 86_400) {
  return Math.floor(Date.now() / 1000) + offsetSeconds;
}

async function seedTask(overrides: Record<string, unknown> = {}) {
  return createTaskRoute(
    new Request("http://localhost/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        poster: "GPOSTER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        title: "Build a Soroban escrow contract",
        description: "Implement escrow logic in Rust for Soroban.",
        reward: 5_000_000,
        deadline: futureDeadline(),
        maxSubmissions: 3,
        difficulty: "advanced",
        technologies: ["Rust", "Soroban"],
        organization: "Stellar Development Foundation",
        ...overrides,
      }),
    }),
  );
}

describe("GET /api/tasks", () => {
  afterEach(() => {
    resetTaskWorkflowStore();
  });

  it("creates a task with difficulty/technologies/organization via POST", async () => {
    const response = await seedTask();
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.task).toMatchObject({
      difficulty: "advanced",
      technologies: ["Rust", "Soroban"],
      organization: "Stellar Development Foundation",
    });
  });

  it("lists created tasks with pagination metadata", async () => {
    await seedTask({ title: "Task A" });
    await seedTask({ title: "Task B" });

    const response = await listTasksRoute(new Request("http://localhost/api/tasks"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.tasks).toHaveLength(2);
    expect(body.pagination).toMatchObject({ page: 1, total: 2, totalPages: 1 });
  });

  it("disables caching so listings are always fresh", async () => {
    const response = await listTasksRoute(new Request("http://localhost/api/tasks"));
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("combines search, difficulty, and technology query params", async () => {
    await seedTask({ title: "Escrow contract", difficulty: "advanced" });
    await seedTask({
      title: "Landing page",
      description: "Marketing site",
      difficulty: "beginner",
      technologies: ["Figma"],
      organization: "Acme DAO",
    });

    const response = await listTasksRoute(
      new Request(
        "http://localhost/api/tasks?search=escrow&difficulty=advanced&technology=rust",
      ),
    );
    const body = await response.json();

    expect(body.tasks).toHaveLength(1);
    expect(body.tasks[0].title).toBe("Escrow contract");
  });

  it("ignores an invalid difficulty or sort value instead of erroring", async () => {
    await seedTask();

    const response = await listTasksRoute(
      new Request("http://localhost/api/tasks?difficulty=nonsense&sort=bogus"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tasks).toHaveLength(1);
  });

  it("paginates via page/pageSize query params", async () => {
    for (let i = 0; i < 5; i += 1) {
      await seedTask({ title: `Task ${i}` });
    }

    const response = await listTasksRoute(
      new Request("http://localhost/api/tasks?pageSize=2&page=3"),
    );
    const body = await response.json();

    expect(body.tasks).toHaveLength(1);
    expect(body.pagination).toMatchObject({ page: 3, pageSize: 2, total: 5, totalPages: 3 });
  });

  it("sorts by highest reward via the sort query param", async () => {
    await seedTask({ title: "Low", reward: 1_000_000 });
    await seedTask({ title: "High", reward: 9_000_000 });

    const response = await listTasksRoute(
      new Request("http://localhost/api/tasks?sort=reward_desc"),
    );
    const body = await response.json();

    expect(body.tasks.map((t: { title: string }) => t.title)).toEqual(["High", "Low"]);
  });
});
