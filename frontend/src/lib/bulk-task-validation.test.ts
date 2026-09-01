import { describe, it, expect, beforeEach } from "vitest";
import { resetTaskWorkflowStore } from "@/lib/task-workflow";
import { POST } from "@/app/api/tasks/bulk/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a Web Request suitable for the POST handler.
 */
function makeRequest(body: unknown, contentType = "application/json"): Request {
  return new Request("http://localhost/api/tasks/bulk", {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: JSON.stringify(body),
  });
}

/**
 * Build a Web Request with a raw string body (useful for testing invalid JSON).
 */
function makeRawRequest(rawBody: string, contentType = "application/json"): Request {
  return new Request("http://localhost/api/tasks/bulk", {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: rawBody,
  });
}

/**
 * Produces a minimally valid row object.
 *
 * - poster:        any non-empty string (poster is not validated as a Stellar address in bulk)
 * - title:         ≥ 5 chars
 * - description:   ≥ 10 chars
 * - tokenAddress:  exactly 56 chars, starts with G, uses only A-Z and 2-7
 * - reward:        1_000_000 (= MIN_TASK_REWARD in stroops)
 * - deadline:      ISO string 1 day in the future
 * - maxSubmissions: 1
 */
function buildValidRow(
  now: Date,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day from now
  return {
    poster: "poster-wallet-address",
    title: "Valid Task Title",
    description: "This is a valid task description that meets minimum length.",
    // 56 chars: G(1) + A-Z(26) + 2-7(6) + A-W(23) = 56
    tokenAddress: "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVW",
    reward: 1_000_000,
    deadline: deadline.toISOString(),
    maxSubmissions: 1,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite 1 — 100% Valid Payload
// ---------------------------------------------------------------------------

describe("Suite 1 — 100% valid payload", () => {
  beforeEach(() => resetTaskWorkflowStore());

  it("inserts all rows and returns successCount equal to total", async () => {
    const now = new Date();
    const rows = [buildValidRow(now), buildValidRow(now), buildValidRow(now)];
    const response = await POST(makeRequest(rows));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalProcessed).toBe(3);
    expect(data.successCount).toBe(3);
    expect(data.errorCount).toBe(0);
    expect(data.errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — Mixed Payload
// ---------------------------------------------------------------------------

describe("Suite 2 — mixed payload", () => {
  beforeEach(() => resetTaskWorkflowStore());

  it("inserts only valid rows and reports invalid rows in errors with correct rowIndex", async () => {
    const now = new Date();
    const rows = [
      buildValidRow(now),                        // index 0 — valid
      buildValidRow(now, { title: "" }),          // index 1 — invalid (blank title)
      buildValidRow(now),                        // index 2 — valid
      buildValidRow(now, { reward: 0 }),         // index 3 — invalid (reward = 0)
      buildValidRow(now),                        // index 4 — valid
    ];

    const response = await POST(makeRequest(rows));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalProcessed).toBe(5);
    expect(data.successCount).toBe(3);
    expect(data.errorCount).toBe(2);
    expect(data.errors).toHaveLength(2);
    expect(data.errors[0].rowIndex).toBe(1);
    expect(data.errors[1].rowIndex).toBe(3);
    // Verify error messages are non-empty
    expect(data.errors[0].message).toBeTruthy();
    expect(data.errors[1].message).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — 100% Invalid Payload
// ---------------------------------------------------------------------------

describe("Suite 3 — 100% invalid payload", () => {
  beforeEach(() => resetTaskWorkflowStore());

  it("inserts nothing and returns all rows as errors", async () => {
    const now = new Date();
    const rows = [
      buildValidRow(now, { title: "" }),        // invalid: blank title
      buildValidRow(now, { description: "" }),  // invalid: blank description
      buildValidRow(now, { reward: -1 }),       // invalid: negative reward
    ];

    const response = await POST(makeRequest(rows));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalProcessed).toBe(3);
    expect(data.successCount).toBe(0);
    expect(data.errorCount).toBe(3);
    expect(data.errors).toHaveLength(3);
    expect(data.errors[0].rowIndex).toBe(0);
    expect(data.errors[1].rowIndex).toBe(1);
    expect(data.errors[2].rowIndex).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — Structural Validation
// ---------------------------------------------------------------------------

describe("Suite 4 — structural validation", () => {
  beforeEach(() => resetTaskWorkflowStore());

  it("returns 400 for empty array", async () => {
    const response = await POST(makeRequest([]));
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toBe("Batch must contain at least 1 row.");
  });

  it("returns 400 for array with more than 100 elements", async () => {
    const now = new Date();
    const rows = Array.from({ length: 101 }, () => buildValidRow(now));
    const response = await POST(makeRequest(rows));
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toBe("Batch size exceeds the maximum of 100 rows.");
  });

  it("returns 400 when element at index 2 is not an object", async () => {
    const now = new Date();
    const rows = [buildValidRow(now), buildValidRow(now), "oops", buildValidRow(now)];
    const response = await POST(makeRequest(rows));
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toBe("Row 2 is not a valid object.");
  });

  it("returns 400 for invalid JSON body", async () => {
    const response = await POST(makeRawRequest("not valid json"));
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toBe("Request body must be valid JSON.");
  });

  it("returns 415 for wrong Content-Type", async () => {
    const now = new Date();
    const rows = [buildValidRow(now)];
    const response = await POST(makeRequest(rows, "text/plain"));
    const data = await response.json();
    expect(response.status).toBe(415);
    expect(data.ok).toBe(false);
    expect(data.error).toBe("Content-Type must be application/json.");
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — Conservation Invariant
// ---------------------------------------------------------------------------

describe("Suite 5 — conservation invariant", () => {
  beforeEach(() => resetTaskWorkflowStore());

  it("successCount + errorCount === totalProcessed for all-valid batch", async () => {
    const now = new Date();
    const rows = [buildValidRow(now), buildValidRow(now)];
    const response = await POST(makeRequest(rows));
    const data = await response.json();
    expect(data.successCount + data.errorCount).toBe(data.totalProcessed);
    expect(data.errors.length).toBe(data.errorCount);
  });

  it("successCount + errorCount === totalProcessed for mixed batch", async () => {
    const now = new Date();
    const rows = [buildValidRow(now), buildValidRow(now, { title: "" }), buildValidRow(now)];
    const response = await POST(makeRequest(rows));
    const data = await response.json();
    expect(data.successCount + data.errorCount).toBe(data.totalProcessed);
    expect(data.errors.length).toBe(data.errorCount);
  });

  it("successCount + errorCount === totalProcessed for all-invalid batch", async () => {
    const now = new Date();
    const rows = [buildValidRow(now, { title: "" }), buildValidRow(now, { reward: 0 })];
    const response = await POST(makeRequest(rows));
    const data = await response.json();
    expect(data.successCount + data.errorCount).toBe(data.totalProcessed);
    expect(data.errors.length).toBe(data.errorCount);
  });
});
