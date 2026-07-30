import { NextResponse } from "next/server";

const DEFAULT_LIMIT = 60;
const DEFAULT_WINDOW_MS = 60_000;
const RATE_LIMIT_WINDOW_MS_ENV = "API_RATE_LIMIT_WINDOW_MS";
const RATE_LIMIT_MAX_REQUESTS_ENV = "API_RATE_LIMIT_MAX_REQUESTS";
const RATE_LIMIT_ENABLED_ENV = "API_RATE_LIMIT_ENABLED";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

/**
 * The result returned by checkRateLimit, allowing callers to both detect a
 * blocked request and attach the informational headers to a successful response.
 */
export type RateLimitResult = {
  /** null when the request is allowed; a 429 NextResponse when blocked. */
  response: NextResponse | null;
  /** Headers to merge onto a successful response. */
  headers: Record<string, string>;
};

const store = new Map<string, RateLimitEntry>();

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

function isEnabled() {
  return process.env[RATE_LIMIT_ENABLED_ENV] === "true";
}

/**
 * Check the rate limit for the incoming request.
 *
 * Returns a `RateLimitResult` with:
 * - `response`: a 429 `NextResponse` if the limit is exceeded, otherwise `null`.
 * - `headers`: informational rate-limit headers to attach to successful responses.
 *
 * Example usage in a route handler:
 *
 * ```ts
 * const { response, headers } = checkRateLimit(request);
 * if (response) return response;
 * return NextResponse.json({ ok: true }, { headers });
 * ```
 *
 * Limits (configurable via env vars):
 * - `API_RATE_LIMIT_MAX_REQUESTS` — max requests per window (default 60)
 * - `API_RATE_LIMIT_WINDOW_MS`   — window length in ms (default 60 000)
 * - `API_RATE_LIMIT_ENABLED`     — must be `"true"` to activate enforcement
 */
export function checkRateLimit(request: Request): RateLimitResult {
  const windowMs = parsePositiveInt(
    process.env[RATE_LIMIT_WINDOW_MS_ENV],
    DEFAULT_WINDOW_MS,
  );
  const maxRequests = parsePositiveInt(
    process.env[RATE_LIMIT_MAX_REQUESTS_ENV],
    DEFAULT_LIMIT,
  );

  // When rate limiting is disabled, still return the informational headers so
  // clients can see the configured limits without enforcement.
  if (!isEnabled()) {
    return {
      response: null,
      headers: {
        "X-RateLimit-Limit": String(maxRequests),
        "X-RateLimit-Remaining": String(maxRequests),
        "X-RateLimit-Reset": String(Math.ceil((Date.now() + windowMs) / 1000)),
      },
    };
  }

  const now = Date.now();
  const key = getClientKey(request);
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const nextEntry = { count: 1, resetAt: now + windowMs };
    store.set(key, nextEntry);
    const remaining = maxRequests - 1;
    return {
      response: null,
      headers: {
        "X-RateLimit-Limit": String(maxRequests),
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset": String(Math.ceil(nextEntry.resetAt / 1000)),
      },
    };
  }

  if (existing.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return {
      response: new NextResponse(
        JSON.stringify({
          ok: false,
          error: "Too many requests. Please try again later.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfterSeconds),
            "X-RateLimit-Limit": String(maxRequests),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(existing.resetAt / 1000)),
          },
        },
      ),
      headers: {},
    };
  }

  store.set(key, {
    count: existing.count + 1,
    resetAt: existing.resetAt,
  });

  const remaining = maxRequests - (existing.count + 1);
  return {
    response: null,
    headers: {
      "X-RateLimit-Limit": String(maxRequests),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(Math.ceil(existing.resetAt / 1000)),
    },
  };
}

/**
 * Legacy helper retained for backward compatibility with existing route handlers
 * that only check for a blocked response and do not need the informational headers.
 *
 * Prefer `checkRateLimit` for new routes so callers can forward the
 * `X-RateLimit-Remaining` header to clients.
 */
export function enforceRateLimit(request: Request): NextResponse | null {
  return checkRateLimit(request).response;
}
