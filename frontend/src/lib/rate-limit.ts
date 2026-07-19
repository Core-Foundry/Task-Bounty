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
  return process.env.API_RATE_LIMIT_ENABLED === "true";
}

export function enforceRateLimit(request: Request) {
  if (!isEnabled()) {
    return null;
  }

  const windowMs = parsePositiveInt(
    process.env[RATE_LIMIT_WINDOW_MS_ENV],
    DEFAULT_WINDOW_MS,
  );
  const maxRequests = parsePositiveInt(
    process.env[RATE_LIMIT_MAX_REQUESTS_ENV],
    DEFAULT_LIMIT,
  );

  const now = Date.now();
  const key = getClientKey(request);
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const nextEntry = { count: 1, resetAt: now + windowMs };
    store.set(key, nextEntry);
    return null;
  }

  if (existing.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return new NextResponse(
      JSON.stringify({
        ok: false,
        error: "Too many requests. Please try again later.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfterSeconds),
          "X-Rate-Limit-Limit": String(maxRequests),
          "X-Rate-Limit-Remaining": "0",
        },
      },
    );
  }

  store.set(key, {
    count: existing.count + 1,
    resetAt: existing.resetAt,
  });

  return null;
}
