/**
 * Security-header integration tests — refs #82.
 *
 * Verifies that:
 *   1. The Next.js config wires headers to all routes (/:path*).
 *   2. Every header required by issue #82 is present with the correct value.
 *   3. The health-route handler itself (the one real API route we can unit-call)
 *      does not accidentally set conflicting headers.
 *
 * Note: Next.js injects the security headers at the server layer (next.config.ts
 * → headers()), not inside individual route handlers. The config-level tests here
 * confirm the values that will appear on every response in production.
 */
import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/health/route";
import {
  buildContentSecurityPolicy,
  getNextSecurityHeadersConfig,
  getSecurityHeaderValue,
  SECURITY_HEADERS,
} from "../../../security-headers.mjs";

// ---------------------------------------------------------------------------
// 1. Next.js config wiring
// ---------------------------------------------------------------------------
describe("getNextSecurityHeadersConfig (wiring)", () => {
  it("applies headers to all routes via /:path*", () => {
    const config = getNextSecurityHeadersConfig();
    expect(config).toHaveLength(1);
    expect(config[0].source).toBe("/:path*");
  });

  it("uses the shared SECURITY_HEADERS list", () => {
    const config = getNextSecurityHeadersConfig();
    expect(config[0].headers).toBe(SECURITY_HEADERS);
  });
});

// ---------------------------------------------------------------------------
// 2. Required header values (issue #82 spec)
// ---------------------------------------------------------------------------
describe("security headers — required values (issue #82)", () => {
  it("HSTS: max-age=63072000; includeSubDomains; preload", () => {
    expect(
      getSecurityHeaderValue(SECURITY_HEADERS, "Strict-Transport-Security"),
    ).toBe("max-age=63072000; includeSubDomains; preload");
  });

  it("X-Content-Type-Options: nosniff", () => {
    expect(
      getSecurityHeaderValue(SECURITY_HEADERS, "X-Content-Type-Options"),
    ).toBe("nosniff");
  });

  it("X-Frame-Options: DENY", () => {
    expect(
      getSecurityHeaderValue(SECURITY_HEADERS, "X-Frame-Options"),
    ).toBe("DENY");
  });

  it("Content-Security-Policy starts with default-src 'self'", () => {
    const csp = getSecurityHeaderValue(SECURITY_HEADERS, "Content-Security-Policy");
    expect(csp).toMatch(/^default-src 'self'/);
  });

  it("Referrer-Policy: strict-origin-when-cross-origin", () => {
    expect(
      getSecurityHeaderValue(SECURITY_HEADERS, "Referrer-Policy"),
    ).toBe("strict-origin-when-cross-origin");
  });

  it("Permissions-Policy blocks geolocation, microphone, and camera", () => {
    const value = getSecurityHeaderValue(SECURITY_HEADERS, "Permissions-Policy") ?? "";
    expect(value).toContain("geolocation=()");
    expect(value).toContain("microphone=()");
    expect(value).toContain("camera=()");
  });
});

// ---------------------------------------------------------------------------
// 3. CSP compatibility (app still works with Google Fonts + Stellar Horizon)
// ---------------------------------------------------------------------------
describe("Content-Security-Policy compatibility", () => {
  it("allows Google Fonts stylesheet origin", () => {
    const csp = buildContentSecurityPolicy();
    expect(csp).toMatch(/fonts\.googleapis\.com/);
    expect(csp).toMatch(/fonts\.gstatic\.com/);
  });

  it("allows Stellar Horizon API origin", () => {
    const csp = buildContentSecurityPolicy();
    expect(csp).toMatch(/horizon\.stellar\.org/);
  });

  it("blocks plugins with object-src 'none'", () => {
    const csp = buildContentSecurityPolicy();
    expect(csp).toContain("object-src 'none'");
  });
});

// ---------------------------------------------------------------------------
// 4. Health route — no conflicting headers from the handler itself
// ---------------------------------------------------------------------------
describe("GET /api/health — no conflicting security-header overrides", () => {
  it("does not set X-Frame-Options in the route handler response", async () => {
    const response = await GET();
    // The route handler must not override X-Frame-Options; it belongs to the config layer.
    expect(response.headers.get("x-frame-options")).toBeNull();
  });

  it("does not set X-Powered-By (framework fingerprinting disabled via next.config.ts)", async () => {
    const response = await GET();
    expect(response.headers.get("x-powered-by")).toBeNull();
  });
});
