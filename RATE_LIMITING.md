# Rate Limiting

TaskBounty's API uses an in-process sliding-window rate limiter to protect public
endpoints from abuse while keeping the experience smooth for normal users.

---

## Endpoints covered

| Method | Path | Notes |
|--------|------|-------|
| `GET`  | `/api/health` | Health check |
| `GET`  | `/api/tasks/:taskId` | Fetch a single task |
| `POST` | `/api/tasks` | Create a task |
| `POST` | `/api/tasks/:taskId/submissions` | Submit work for a task |
| `POST` | `/api/task-submissions/validate` | Validate a submission upload |
| `GET`  | `/api/dashboard/stats` | Dashboard overview statistics |

---

## Default limits

| Setting | Default | Description |
|---------|---------|-------------|
| Max requests | **60** | Requests allowed per window per client |
| Window length | **60 000 ms** (1 minute) | Rolling window duration |

Limits are **per client IP** (resolved from `X-Forwarded-For`, then `X-Real-IP`,
then `"unknown"` as a catch-all).

---

## Configuration

All limits are controlled through environment variables so they can be tuned per
deployment without rebuilding the application.

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `API_RATE_LIMIT_ENABLED` | `"true"` / anything else | disabled | Must be `"true"` to activate enforcement |
| `API_RATE_LIMIT_MAX_REQUESTS` | positive integer | `60` | Max requests per window |
| `API_RATE_LIMIT_WINDOW_MS` | positive integer | `60000` | Window length in milliseconds |

Set these in `.env.local` (local dev) or in your deployment environment:

```dotenv
API_RATE_LIMIT_ENABLED=true
API_RATE_LIMIT_MAX_REQUESTS=60
API_RATE_LIMIT_WINDOW_MS=60000
```

When `API_RATE_LIMIT_ENABLED` is absent or not `"true"`, the middleware is **bypassed**
but the informational response headers are still returned (see below).

---

## Response headers

Every response from a rate-limited endpoint includes the following headers:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | The configured maximum number of requests per window |
| `X-RateLimit-Remaining` | Requests remaining in the current window for this client |
| `X-RateLimit-Reset` | Unix timestamp (seconds) at which the current window expires |

When a request is **blocked** (HTTP 429), two additional headers are set:

| Header | Description |
|--------|-------------|
| `Retry-After` | Seconds until the window resets and the client may retry |
| `X-RateLimit-Remaining` | Always `"0"` |

---

## HTTP 429 response

When the limit is exceeded the API returns a `429 Too Many Requests` with a JSON
body:

```json
{
  "ok": false,
  "error": "Too many requests. Please try again later."
}
```

Clients should respect the `Retry-After` header and back off accordingly.

---

## Implementation notes

- The limiter is **in-process** — each Next.js worker process maintains its own
  counter map. In a multi-process or multi-instance deployment (e.g. behind a load
  balancer) each instance enforces limits independently. For stricter global
  enforcement consider a shared store such as Redis.
- The limiter uses a **fixed window** strategy: a new window starts the first time
  a client is seen, and resets after `API_RATE_LIMIT_WINDOW_MS` milliseconds from
  that first request.
- Stale entries (windows that have already expired) are evicted lazily when a new
  request from the same client arrives; there is no background cleanup task.

---

## Adjusting limits for a specific environment

**Development** — leave `API_RATE_LIMIT_ENABLED` unset (or set to `false`) so the
limiter does not interfere with rapid local iteration.

**Staging / Preview** — enable with generous limits to catch integration issues:
```dotenv
API_RATE_LIMIT_ENABLED=true
API_RATE_LIMIT_MAX_REQUESTS=200
API_RATE_LIMIT_WINDOW_MS=60000
```

**Production** — tune according to expected traffic patterns. The defaults (60 req / 60 s)
are a conservative starting point suitable for most public API use cases.
