/**
 * Unit tests for HTTP security header configuration.
 * Run: node --test security-headers.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SECURITY_HEADERS,
  REQUIRED_SECURITY_HEADER_NAMES,
  buildContentSecurityPolicy,
  getSecurityHeaderValue,
  getNextSecurityHeadersConfig,
} from "./security-headers.mjs";

describe("SECURITY_HEADERS", () => {
  it("includes all required OWASP-recommended header names", () => {
    const keys = SECURITY_HEADERS.map((h) => h.key);
    for (const name of [
      "Content-Security-Policy",
      "Strict-Transport-Security",
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Referrer-Policy",
      "Permissions-Policy",
    ]) {
      assert.ok(keys.includes(name), `missing header: ${name}`);
    }
  });

  it("has non-empty string values for every header", () => {
    for (const header of SECURITY_HEADERS) {
      assert.equal(typeof header.key, "string");
      assert.ok(header.key.length > 0);
      assert.equal(typeof header.value, "string");
      assert.ok(header.value.length > 0, `${header.key} value is empty`);
    }
  });

  it("exports REQUIRED_SECURITY_HEADER_NAMES matching SECURITY_HEADERS", () => {
    assert.deepEqual(
      REQUIRED_SECURITY_HEADER_NAMES,
      SECURITY_HEADERS.map((h) => h.key),
    );
  });

  // Exact-value assertions for all #82 required headers
  it("sets HSTS with 2-year max-age, includeSubDomains, and preload", () => {
    assert.equal(
      getSecurityHeaderValue(SECURITY_HEADERS, "Strict-Transport-Security"),
      "max-age=63072000; includeSubDomains; preload",
    );
  });

  it("sets X-Content-Type-Options to nosniff", () => {
    assert.equal(
      getSecurityHeaderValue(SECURITY_HEADERS, "X-Content-Type-Options"),
      "nosniff",
    );
  });

  it("sets X-Frame-Options to DENY", () => {
    assert.equal(
      getSecurityHeaderValue(SECURITY_HEADERS, "X-Frame-Options"),
      "DENY",
    );
  });

  it("sets Referrer-Policy to strict-origin-when-cross-origin", () => {
    assert.equal(
      getSecurityHeaderValue(SECURITY_HEADERS, "Referrer-Policy"),
      "strict-origin-when-cross-origin",
    );
  });

  it("sets Permissions-Policy blocking geolocation, microphone, and camera", () => {
    const value = getSecurityHeaderValue(SECURITY_HEADERS, "Permissions-Policy");
    assert.ok(value.includes("geolocation=()"), "Permissions-Policy must block geolocation");
    assert.ok(value.includes("microphone=()"), "Permissions-Policy must block microphone");
    assert.ok(value.includes("camera=()"), "Permissions-Policy must block camera");
  });

  it("CSP includes default-src 'self'", () => {
    const csp = getSecurityHeaderValue(SECURITY_HEADERS, "Content-Security-Policy");
    assert.ok(csp.startsWith("default-src 'self'"), "CSP must start with default-src 'self'");
  });
});

describe("buildContentSecurityPolicy", () => {
  it("allows Google Fonts and Horizon by default", () => {
    const csp = buildContentSecurityPolicy();
    assert.match(csp, /fonts\.googleapis\.com/);
    assert.match(csp, /fonts\.gstatic\.com/);
    assert.match(csp, /horizon\.stellar\.org/);
    assert.match(csp, /object-src 'none'/);
    assert.match(csp, /frame-ancestors 'self'/);
  });

  it("handles null / undefined options without throwing", () => {
    assert.equal(
      buildContentSecurityPolicy(null),
      buildContentSecurityPolicy(undefined),
    );
    assert.equal(
      buildContentSecurityPolicy(undefined),
      buildContentSecurityPolicy(),
    );
  });

  it("ignores empty extraConnectSrc and nullish entries", () => {
    const base = buildContentSecurityPolicy();
    assert.equal(buildContentSecurityPolicy({ extraConnectSrc: [] }), base);
    assert.equal(
      buildContentSecurityPolicy({
        extraConnectSrc: ["", "  ", null, undefined],
      }),
      base,
    );
  });

  it("appends valid extra connect-src origins", () => {
    const csp = buildContentSecurityPolicy({
      extraConnectSrc: ["https://example.com"],
    });
    assert.match(csp, /https:\/\/example\.com/);
  });
});

describe("getSecurityHeaderValue", () => {
  it("returns value for case-insensitive match", () => {
    assert.equal(
      getSecurityHeaderValue(SECURITY_HEADERS, "x-content-type-options"),
      "nosniff",
    );
    assert.equal(
      getSecurityHeaderValue(SECURITY_HEADERS, "X-Frame-Options"),
      "DENY",
    );
  });

  it("returns null for missing, empty, or null names", () => {
    assert.equal(getSecurityHeaderValue(SECURITY_HEADERS, null), null);
    assert.equal(getSecurityHeaderValue(SECURITY_HEADERS, undefined), null);
    assert.equal(getSecurityHeaderValue(SECURITY_HEADERS, ""), null);
    assert.equal(getSecurityHeaderValue(SECURITY_HEADERS, "   "), null);
    assert.equal(getSecurityHeaderValue(SECURITY_HEADERS, "Not-A-Header"), null);
  });

  it("returns null for empty or non-array headers (edge cases)", () => {
    assert.equal(getSecurityHeaderValue([], "X-Frame-Options"), null);
    assert.equal(getSecurityHeaderValue(null, "X-Frame-Options"), null);
    assert.equal(getSecurityHeaderValue(undefined, "X-Frame-Options"), null);
  });
});

describe("getNextSecurityHeadersConfig", () => {
  it("covers all paths with the shared header list", () => {
    const config = getNextSecurityHeadersConfig();
    assert.equal(config.length, 1);
    assert.equal(config[0].source, "/:path*");
    assert.equal(config[0].headers, SECURITY_HEADERS);
  });
});
