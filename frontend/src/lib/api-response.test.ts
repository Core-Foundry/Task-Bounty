import { describe, expect, it } from "vitest";

import { buildErrorResponse, ApiErrorResponse } from "./api-response";

describe("buildErrorResponse", () => {
  it("returns a NextResponse with correct status", () => {
    const response = buildErrorResponse("Test error", 400);
    expect(response.status).toBe(400);
  });

  it("includes Cache-Control: no-store header", () => {
    const response = buildErrorResponse("Test error", 400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("includes Content-Type: application/json header", () => {
    const response = buildErrorResponse("Test error", 400);
    expect(response.headers.get("Content-Type")).toBe("application/json");
  });

  it("returns JSON body with ok: false", async () => {
    const response = buildErrorResponse("Test error", 400);
    const body = await response.json();

    expect(body.ok).toBe(false);
  });

  it("includes error message in body", async () => {
    const response = buildErrorResponse("Test error message", 400);
    const body = await response.json() as ApiErrorResponse;

    expect(body.error).toBe("Test error message");
  });

  it("includes error code when provided", async () => {
    const response = buildErrorResponse("Test error", 400, "INVALID_INPUT");
    const body = await response.json() as ApiErrorResponse;

    expect(body.code).toBe("INVALID_INPUT");
  });

  it("omits error code when not provided", async () => {
    const response = buildErrorResponse("Test error", 400);
    const body = await response.json() as ApiErrorResponse;

    expect(body.code).toBeUndefined();
  });

  it("includes details array when provided", async () => {
    const details = ["Field required", "Invalid format"];
    const response = buildErrorResponse("Test error", 400, undefined, details);
    const body = await response.json() as ApiErrorResponse;

    expect(body.details).toEqual(details);
  });

  it("omits details array when not provided", async () => {
    const response = buildErrorResponse("Test error", 400);
    const body = await response.json() as ApiErrorResponse;

    expect(body.details).toBeUndefined();
  });

  it("includes limits object when provided", async () => {
    const limits = { maxFiles: 5, maxSize: 10485760 };
    const response = buildErrorResponse("Test error", 413, undefined, undefined, limits);
    const body = await response.json() as ApiErrorResponse;

    expect(body.limits).toEqual(limits);
  });

  it("omits limits object when not provided", async () => {
    const response = buildErrorResponse("Test error", 400);
    const body = await response.json() as ApiErrorResponse;

    expect(body.limits).toBeUndefined();
  });

  it("merges extra headers into response", () => {
    const response = buildErrorResponse(
      "Test error",
      400,
      undefined,
      undefined,
      undefined,
      { "X-Custom-Header": "custom-value" },
    );

    expect(response.headers.get("X-Custom-Header")).toBe("custom-value");
  });

  it("includes all fields when fully populated", async () => {
    const response = buildErrorResponse(
      "Validation failed",
      422,
      "VALIDATION_ERROR",
      ["Email is invalid", "Password too short"],
      { maxAttempts: 3 },
      { "X-Retry-After": "60" },
    );
    const body = await response.json() as ApiErrorResponse;

    expect(body).toEqual({
      ok: false,
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: ["Email is invalid", "Password too short"],
      limits: { maxAttempts: 3 },
    });
    expect(response.headers.get("X-Retry-After")).toBe("60");
  });

  it("defaults to status 500 when not provided", () => {
    const response = buildErrorResponse("Server error");
    expect(response.status).toBe(500);
  });
});

describe("ApiErrorResponse interface", () => {
  it("defines required fields correctly", () => {
    const error: ApiErrorResponse = {
      ok: false,
      error: "Test error",
    };

    expect(error.ok).toBe(false);
    expect(error.error).toBe("Test error");
    expect(error.code).toBeUndefined();
    expect(error.details).toBeUndefined();
    expect(error.limits).toBeUndefined();
  });

  it("allows optional fields", () => {
    const error: ApiErrorResponse = {
      ok: false,
      error: "Test error",
      code: "ERROR_CODE",
      details: ["Detail 1"],
      limits: { limit: 10 },
    };

    expect(error.code).toBe("ERROR_CODE");
    expect(error.details).toEqual(["Detail 1"]);
    expect(error.limits).toEqual({ limit: 10 });
  });
});
