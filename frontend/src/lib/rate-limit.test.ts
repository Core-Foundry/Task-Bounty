import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(ip = "203.0.113.10", path = "/api/health") {
  return new Request(`http://localhost${path}`, {
    headers: { "x-forwarded-for": ip },
  });
}

// Each test reloads the module so the in-memory store is fresh.
async function loadModule() {
  const mod = await import("./rate-limit");
  return mod;
}

// ---------------------------------------------------------------------------
// Suite: enforceRateLimit (legacy API)
// ---------------------------------------------------------------------------

describe("enforceRateLimit (legacy)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    delete process.env.API_RATE_LIMIT_ENABLED;
    delete process.env.API_RATE_LIMIT_MAX_REQUESTS;
    delete process.env.API_RATE_LIMIT_WINDOW_MS;
  });

  it("returns null when rate limiting is disabled", async () => {
    // API_RATE_LIMIT_ENABLED is not set
    const { enforceRateLimit } = await loadModule();
    expect(enforceRateLimit(makeRequest())).toBeNull();
  });

  it("blocks requests once the configured limit is exceeded", async () => {
    process.env.API_RATE_LIMIT_ENABLED = "true";
    process.env.API_RATE_LIMIT_MAX_REQUESTS = "2";
    process.env.API_RATE_LIMIT_WINDOW_MS = "60000";

    const { enforceRateLimit } = await loadModule();
    const req = makeRequest();

    expect(enforceRateLimit(req)).toBeNull();
    expect(enforceRateLimit(req)).toBeNull();

    const blocked = enforceRateLimit(req);
    expect(blocked).not.toBeNull();
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("retry-after")).toBe("60");
    expect(blocked?.headers.get("x-ratelimit-remaining")).toBe("0");
  });

  it("applies per-IP isolation", async () => {
    process.env.API_RATE_LIMIT_ENABLED = "true";
    process.env.API_RATE_LIMIT_MAX_REQUESTS = "1";

    const { enforceRateLimit } = await loadModule();

    // First client: hit the limit
    expect(enforceRateLimit(makeRequest("1.2.3.4"))).toBeNull();
    expect(enforceRateLimit(makeRequest("1.2.3.4"))).not.toBeNull();

    // Different IP: still allowed
    expect(enforceRateLimit(makeRequest("5.6.7.8"))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Suite: checkRateLimit (new API with X-RateLimit-Remaining)
// ---------------------------------------------------------------------------

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    delete process.env.API_RATE_LIMIT_ENABLED;
    delete process.env.API_RATE_LIMIT_MAX_REQUESTS;
    delete process.env.API_RATE_LIMIT_WINDOW_MS;
  });

  // -----------------------------------------------------------------------
  // Disabled mode: no enforcement but headers are still emitted
  // -----------------------------------------------------------------------

  it("returns a null response when disabled", async () => {
    const { checkRateLimit } = await loadModule();
    const result = checkRateLimit(makeRequest());
    expect(result.response).toBeNull();
  });

  it("returns X-RateLimit headers even when disabled", async () => {
    const { checkRateLimit } = await loadModule();
    const result = checkRateLimit(makeRequest());

    expect(result.headers["X-RateLimit-Limit"]).toBeDefined();
    expect(result.headers["X-RateLimit-Remaining"]).toBeDefined();
    expect(result.headers["X-RateLimit-Reset"]).toBeDefined();
    // Remaining equals the configured limit when not consuming any quota
    expect(result.headers["X-RateLimit-Remaining"]).toBe(
      result.headers["X-RateLimit-Limit"],
    );
  });

  // -----------------------------------------------------------------------
  // Enabled mode: header countdown
  // -----------------------------------------------------------------------

  it("decrements X-RateLimit-Remaining with each request", async () => {
    process.env.API_RATE_LIMIT_ENABLED = "true";
    process.env.API_RATE_LIMIT_MAX_REQUESTS = "5";
    process.env.API_RATE_LIMIT_WINDOW_MS = "60000";

    const { checkRateLimit } = await loadModule();
    const ip = "10.0.0.1";

    const first = checkRateLimit(makeRequest(ip));
    expect(first.response).toBeNull();
    expect(first.headers["X-RateLimit-Limit"]).toBe("5");
    expect(first.headers["X-RateLimit-Remaining"]).toBe("4");

    const second = checkRateLimit(makeRequest(ip));
    expect(second.response).toBeNull();
    expect(second.headers["X-RateLimit-Remaining"]).toBe("3");

    const third = checkRateLimit(makeRequest(ip));
    expect(third.headers["X-RateLimit-Remaining"]).toBe("2");
  });

  it("returns X-RateLimit-Remaining of 0 on the blocking response", async () => {
    process.env.API_RATE_LIMIT_ENABLED = "true";
    process.env.API_RATE_LIMIT_MAX_REQUESTS = "2";
    process.env.API_RATE_LIMIT_WINDOW_MS = "60000";

    const { checkRateLimit } = await loadModule();
    const req = makeRequest("192.168.1.1");

    checkRateLimit(req); // 1st — ok
    checkRateLimit(req); // 2nd — ok (remaining = 0)
    const blocked = checkRateLimit(req); // 3rd — blocked

    expect(blocked.response).not.toBeNull();
    expect(blocked.response?.status).toBe(429);
    expect(blocked.response?.headers.get("x-ratelimit-remaining")).toBe("0");
  });

  it("includes X-RateLimit-Reset as a Unix timestamp in the future", async () => {
    process.env.API_RATE_LIMIT_ENABLED = "true";
    process.env.API_RATE_LIMIT_MAX_REQUESTS = "10";
    process.env.API_RATE_LIMIT_WINDOW_MS = "60000";

    const { checkRateLimit } = await loadModule();
    const result = checkRateLimit(makeRequest("172.16.0.1"));

    const reset = Number(result.headers["X-RateLimit-Reset"]);
    expect(reset).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("returns empty headers map when the request is blocked", async () => {
    process.env.API_RATE_LIMIT_ENABLED = "true";
    process.env.API_RATE_LIMIT_MAX_REQUESTS = "1";

    const { checkRateLimit } = await loadModule();
    const req = makeRequest("10.0.0.2");

    checkRateLimit(req); // consume the only allowed request
    const blocked = checkRateLimit(req); // blocked

    expect(blocked.response).not.toBeNull();
    // headers on blocked result should be empty (headers are on the response)
    expect(Object.keys(blocked.headers)).toHaveLength(0);
  });

  it("respects X-Real-IP when X-Forwarded-For is absent", async () => {
    process.env.API_RATE_LIMIT_ENABLED = "true";
    process.env.API_RATE_LIMIT_MAX_REQUESTS = "1";

    const { checkRateLimit } = await loadModule();

    const reqReal = new Request("http://localhost/api/health", {
      headers: { "x-real-ip": "203.0.113.99" },
    });
    expect(checkRateLimit(reqReal).response).toBeNull();
    expect(checkRateLimit(reqReal).response).not.toBeNull(); // blocked
  });
});

// ---------------------------------------------------------------------------
// Suite: endpoint coverage — verify all public routes call checkRateLimit
// ---------------------------------------------------------------------------

describe("endpoint rate-limit integration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    process.env.API_RATE_LIMIT_ENABLED = "true";
    process.env.API_RATE_LIMIT_MAX_REQUESTS = "1";
    process.env.API_RATE_LIMIT_WINDOW_MS = "60000";
  });

  async function checkEndpointEnforces(
    importFn: () => Promise<{ GET?: Function; POST?: Function }>,
    method: "GET" | "POST",
    buildRequest: () => Request,
  ) {
    const mod = await importFn();
    const handler = method === "GET" ? mod.GET! : mod.POST!;

    // First call consumes the single allowed request
    await handler(buildRequest(), { params: Promise.resolve({ taskId: "t1" }) });
    // Second call should be rate-limited
    const res = await handler(buildRequest(), {
      params: Promise.resolve({ taskId: "t1" }),
    });
    expect(res.status).toBe(429);
  }

  it("enforces rate limiting on GET /api/health", async () => {
    await checkEndpointEnforces(
      () => import("@/app/api/health/route"),
      "GET",
      () =>
        new Request("http://localhost/api/health", {
          headers: { "x-forwarded-for": "1.1.1.1" },
        }),
    );
  });

  it("enforces rate limiting on GET /api/tasks/:taskId", async () => {
    await checkEndpointEnforces(
      () => import("@/app/api/tasks/[taskId]/route"),
      "GET",
      () =>
        new Request("http://localhost/api/tasks/t1", {
          headers: { "x-forwarded-for": "1.1.1.2" },
        }),
    );
  });

  it("enforces rate limiting on GET /api/dashboard/stats", async () => {
    await checkEndpointEnforces(
      () => import("@/app/api/dashboard/stats/route"),
      "GET",
      () =>
        new Request("http://localhost/api/dashboard/stats", {
          headers: { "x-forwarded-for": "1.1.1.3" },
        }),
    );
  });

  it("enforces rate limiting on POST /api/tasks", async () => {
    await checkEndpointEnforces(
      () => import("@/app/api/tasks/route"),
      "POST",
      () =>
        new Request("http://localhost/api/tasks", {
          method: "POST",
          headers: {
            "x-forwarded-for": "1.1.1.4",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            poster: "G" + "A".repeat(55),
            title: "test",
            description: "desc",
            reward: 100,
            deadline: Date.now() / 1000 + 86400,
            maxSubmissions: 1,
          }),
        }),
    );
  });

  it("enforces rate limiting on POST /api/task-submissions/validate", async () => {
    await checkEndpointEnforces(
      () => import("@/app/api/task-submissions/validate/route"),
      "POST",
      () => {
        const fd = new FormData();
        return new Request("http://localhost/api/task-submissions/validate", {
          method: "POST",
          headers: { "x-forwarded-for": "1.1.1.5" },
          body: fd,
        });
      },
    );
  });
});
