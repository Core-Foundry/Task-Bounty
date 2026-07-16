import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/health/route";
import { buildHealthReport, SERVICE_NAME } from "@/lib/health";

describe("buildHealthReport", () => {
  it("returns an ok status with the service name", () => {
    const report = buildHealthReport();

    expect(report.status).toBe("ok");
    expect(report.service).toBe(SERVICE_NAME);
  });

  it("uses the provided clock for the timestamp", () => {
    const now = new Date("2026-07-16T21:00:00.000Z");

    const report = buildHealthReport(now);

    expect(report.timestamp).toBe("2026-07-16T21:00:00.000Z");
  });

  it("produces a valid ISO-8601 timestamp by default", () => {
    const report = buildHealthReport();

    expect(new Date(report.timestamp).toISOString()).toBe(report.timestamp);
  });

  it("rounds uptime to whole seconds", () => {
    const report = buildHealthReport(new Date(), 12.6);

    expect(report.uptime).toBe(13);
  });

  it("clamps negative uptime to zero", () => {
    const report = buildHealthReport(new Date(), -5);

    expect(report.uptime).toBe(0);
  });

  it("handles zero uptime", () => {
    const report = buildHealthReport(new Date(), 0);

    expect(report.uptime).toBe(0);
  });

  it("treats NaN and Infinity uptime as zero", () => {
    expect(buildHealthReport(new Date(), Number.NaN).uptime).toBe(0);
    expect(buildHealthReport(new Date(), Number.POSITIVE_INFINITY).uptime).toBe(
      0,
    );
    expect(buildHealthReport(new Date(), Number.NEGATIVE_INFINITY).uptime).toBe(
      0,
    );
  });

  it("falls back when given an invalid Date", () => {
    const report = buildHealthReport(new Date("not-a-date"), 1);

    expect(report.status).toBe("ok");
    expect(new Date(report.timestamp).getTime()).not.toBeNaN();
    expect(report.uptime).toBe(1);
  });

  it("reports the runtime environment", () => {
    const report = buildHealthReport();

    expect(report.environment).toBe(process.env.NODE_ENV ?? "development");
    expect(report.environment).not.toBe("");
  });
});

describe("GET /api/health", () => {
  it("responds with HTTP 200", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
  });

  it("returns the health report as JSON", async () => {
    const response = await GET();
    const body = await response.json();

    expect(body).toMatchObject({
      status: "ok",
      service: SERVICE_NAME,
    });
    expect(typeof body.uptime).toBe("number");
    expect(body.uptime).toBeGreaterThanOrEqual(0);
    expect(new Date(body.timestamp).getTime()).not.toBeNaN();
  });

  it("disables caching so status is always live", async () => {
    const response = await GET();

    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
