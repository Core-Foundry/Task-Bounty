/**
 * Recommended HTTP security headers for the TaskBounty Next.js frontend.
 * Kept as plain ESM so unit tests and next.config can share one source of truth.
 */

/** @typedef {{ key: string; value: string }} SecurityHeader */

/**
 * Build a Content-Security-Policy compatible with Next.js App Router,
 * Google Fonts (@import in globals.css), and Stellar Horizon fetches.
 *
 * @param {{ extraConnectSrc?: string[] } | null | undefined} options
 * @returns {string}
 */
export function buildContentSecurityPolicy(options) {
  const extras = Array.isArray(options?.extraConnectSrc)
    ? options.extraConnectSrc.filter(
        (origin) => typeof origin === "string" && origin.trim().length > 0,
      )
    : [];

  const connectSrc = [
    "'self'",
    "https://horizon.stellar.org",
    "https://*.stellar.org",
    ...extras,
  ].join(" ");

  const directives = [
    "default-src 'self'",
    // Next.js may emit inline scripts; wallet kit bundles stay on 'self'
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    // Tailwind / Next inject inline styles; Google Fonts CSS is loaded via @import
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    `connect-src ${connectSrc}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ];

  return directives.join("; ");
}

/**
 * Look up a configured header value by name (case-insensitive).
 * Returns null for missing/empty names or unknown headers.
 *
 * @param {SecurityHeader[]} headers
 * @param {string | null | undefined} name
 * @returns {string | null}
 */
export function getSecurityHeaderValue(headers, name) {
  if (name == null || typeof name !== "string" || name.trim() === "") {
    return null;
  }
  if (!Array.isArray(headers) || headers.length === 0) {
    return null;
  }
  const needle = name.trim().toLowerCase();
  const match = headers.find(
    (h) => typeof h?.key === "string" && h.key.toLowerCase() === needle,
  );
  return match?.value ?? null;
}

/** @type {SecurityHeader[]} */
export const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: buildContentSecurityPolicy(),
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "geolocation=(), microphone=(), camera=()",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
];

/** Header names that must always be present (used by tests). */
export const REQUIRED_SECURITY_HEADER_NAMES = SECURITY_HEADERS.map(
  (h) => h.key,
);

/**
 * Next.js `headers()` config entry covering all routes.
 * @returns {{ source: string; headers: SecurityHeader[] }[]}
 */
export function getNextSecurityHeadersConfig() {
  return [
    {
      source: "/:path*",
      headers: SECURITY_HEADERS,
    },
  ];
}
