import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET as exportCsvRoute } from "./route";
import { POST as createTaskRoute } from "../../route";
import { resetTaskWorkflowStore } from "@/lib/task-workflow";

async function seedTask(title: string, overrides: Record<string, unknown> = {}) {
  return createTaskRoute(
    new Request("http://localhost/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        poster: "GPOSTER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        title,
        description: `Description for ${title}`,
        reward: 5_000_000,
        deadline: Math.floor(Date.now() / 1000) + 86400,
        maxSubmissions: 3,
        difficulty: "intermediate",
        technologies: ["Soroban", "Rust"],
        organization: "GrantFox",
        ...overrides,
      }),
    }),
  );
}

describe("GET /api/tasks/export/csv", () => {
  beforeEach(() => {
    resetTaskWorkflowStore();
  });

  afterEach(() => {
    resetTaskWorkflowStore();
  });

  it("returns 200 with text/csv content type and attachment headers", async () => {
    await seedTask("Grant Alpha");
    await seedTask("Grant Beta");

    const request = new Request("http://localhost/api/tasks/export/csv");
    const response = await exportCsvRoute(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("Content-Disposition")).toContain("attachment; filename=");

    const text = await response.text();
    expect(text).toContain("Grant ID,Title,Description");
    expect(text).toContain("Grant Alpha");
    expect(text).toContain("Grant Beta");
  });

  it("filters exported CSV records by difficulty or search parameter", async () => {
    await seedTask("Beginner Bounty", { difficulty: "beginner" });
    await seedTask("Advanced Bounty", { difficulty: "advanced" });

    const request = new Request("http://localhost/api/tasks/export/csv?difficulty=beginner");
    const response = await exportCsvRoute(request);
    const text = await response.text();

    expect(text).toContain("Beginner Bounty");
    expect(text).not.toContain("Advanced Bounty");
  });

  it("returns empty CSV table with headers when no records match filter", async () => {
    const request = new Request("http://localhost/api/tasks/export/csv?search=nonexistent");
    const response = await exportCsvRoute(request);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain("Grant ID,Title,Description");
    const lines = text.trim().split("\r\n");
    expect(lines.length).toBe(1);
  });
});
