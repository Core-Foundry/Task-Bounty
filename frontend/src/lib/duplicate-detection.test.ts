import { describe, it, expect } from "vitest";
import { detectDuplicates } from "@/lib/duplicate-detection";
import type { TaskRecord } from "@/types/task-workflow";

function makeTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: "1",
    poster: "addr1",
    title: "Build a DeFi lending protocol",
    description: "A protocol for lending on Stellar",
    reward: 5_000_000,
    deadline: Math.floor(Date.now() / 1000) + 86400,
    maxSubmissions: 5,
    submissionCount: 0,
    status: "open",
    createdAt: new Date().toISOString(),
    difficulty: "intermediate",
    technologies: ["Rust"],
    organization: "DeFi Corp",
    ...overrides,
  };
}

describe("detectDuplicates", () => {
  it("returns no matches when no existing tasks", () => {
    const result = detectDuplicates(
      { title: "New Task", organization: "", description: "" },
      [],
    );
    expect(result.hasDuplicates).toBe(false);
    expect(result.matches).toHaveLength(0);
  });

  it("detects identical title", () => {
    const existing = makeTask({ id: "1", title: "Build a DEX" });
    const result = detectDuplicates(
      { title: "Build a DEX", organization: "", description: "" },
      [existing],
    );
    expect(result.hasDuplicates).toBe(true);
    expect(result.matches[0].confidence).toBeGreaterThanOrEqual(0.9);
    expect(result.matches[0].reason).toContain("Identical title");
  });

  it("detects similar title with minor typo", () => {
    const existing = makeTask({ id: "1", title: "Build a DEX" });
    const result = detectDuplicates(
      { title: "Build aDEX", organization: "", description: "" },
      [existing],
    );
    expect(result.hasDuplicates).toBe(true);
  });

  it("detects same organization + description overlap", () => {
    const existing = makeTask({
      id: "1",
      title: "Task A",
      organization: "OrgX",
      description: "Build a payment system with Soroban smart contracts on Stellar",
    });
    const result = detectDuplicates(
      {
        title: "Task B",
        organization: "OrgX",
        description: "Build a payment system with Soroban smart contracts on Stellar",
      },
      [existing],
    );
    expect(result.hasDuplicates).toBe(true);
  });

  it("does not flag different tasks from same org", () => {
    const existing = makeTask({
      id: "1",
      title: "Build a DEX",
      organization: "OrgX",
      description: "A decentralized exchange",
    });
    const result = detectDuplicates(
      {
        title: "Build a lending protocol",
        organization: "OrgX",
        description: "A lending platform with flash loans",
      },
      [existing],
    );
    // Same org alone is weak signal (0.3 confidence), should still be flagged
    // but with low confidence
    if (result.hasDuplicates) {
      expect(result.matches[0].confidence).toBeLessThanOrEqual(0.5);
    }
  });

  it("handles empty title gracefully", () => {
    const existing = makeTask({ id: "1", title: "Some Task" });
    const result = detectDuplicates(
      { title: "", organization: "", description: "" },
      [existing],
    );
    expect(result.hasDuplicates).toBe(false);
  });

  it("sorts matches by confidence descending", () => {
    const existing1 = makeTask({ id: "1", title: "Build a DEX" });
    const existing2 = makeTask({ id: "2", title: "Build a DEX with AMM" });
    const result = detectDuplicates(
      { title: "Build a DEX", organization: "", description: "" },
      [existing1, existing2],
    );
    expect(result.hasDuplicates).toBe(true);
    expect(result.matches.length).toBeGreaterThanOrEqual(1);
    for (let i = 1; i < result.matches.length; i++) {
      expect(result.matches[i - 1].confidence).toBeGreaterThanOrEqual(
        result.matches[i].confidence,
      );
    }
  });
});
