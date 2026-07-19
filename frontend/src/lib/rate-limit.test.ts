import { describe, expect, it, vi, beforeEach } from "vitest";

describe("enforceRateLimit", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    delete process.env.API_RATE_LIMIT_ENABLED;
    delete process.env.API_RATE_LIMIT_MAX_REQUESTS;
    delete process.env.API_RATE_LIMIT_WINDOW_MS;
  });

  it("blocks requests once the configured limit is exceeded", async () => {
    process.env.API_RATE_LIMIT_ENABLED = "true";
    process.env.API_RATE_LIMIT_MAX_REQUESTS = "2";
    process.env.API_RATE_LIMIT_WINDOW_MS = "60000";

    const { enforceRateLimit } = await import("./rate-limit");
    const request = new Request("http://localhost/api/health", {
      headers: {
        "x-forwarded-for": "203.0.113.10",
      },
    });

    expect(enforceRateLimit(request)).toBeNull();
    expect(enforceRateLimit(request)).toBeNull();

    const blocked = enforceRateLimit(request);

    expect(blocked).not.toBeNull();
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("retry-after")).toBe("60");
    expect(blocked?.headers.get("x-rate-limit-remaining")).toBe("0");
  });
});
