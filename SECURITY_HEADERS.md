# HTTP Security Headers

TaskBounty's Next.js frontend sets recommended HTTP security headers on every response to reduce exposure to common web attacks (clickjacking, MIME sniffing, XSS via CSP, downgrade attacks, and overly permissive browser features).

> **Issue reference:** [#82 — Add Security Headers to Backend Responses](https://github.com/your-org/Task-Bounty/issues/82)

## Acceptance overview

| Criterion | How it is met |
|-----------|----------------|
| Headers configured | [`frontend/security-headers.mjs`](./frontend/security-headers.mjs) applied via [`frontend/next.config.ts`](./frontend/next.config.ts) `headers()` |
| `X-Powered-By` removed | `poweredByHeader: false` in [`frontend/next.config.ts`](./frontend/next.config.ts) |
| Compatibility verified | CSP allows Google Fonts + Stellar Horizon; integration script builds and curls a live Next.js server |
| Documentation updated | This guide + links from [`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`README.md`](./README.md) |

## Headers applied

| Header | Value | Why |
|--------|-------|-----|
| `Content-Security-Policy` | see [CSP section](#csp-compatibility-notes) | Restricts which origins can load scripts, styles, fonts, and make network requests; blocks plugins via `object-src 'none'` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Enforces HTTPS for 2 years, covers sub-domains, and opts the domain into browser preload lists — prevents protocol-downgrade attacks |
| `X-Content-Type-Options` | `nosniff` | Stops browsers MIME-sniffing responses away from the declared `Content-Type`, which can turn text into executable scripts |
| `X-Frame-Options` | `DENY` | Prevents the page from being embedded in any `<iframe>` or `<frame>`, blocking clickjacking entirely |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Sends full referrer on same-origin requests, only the origin on cross-origin HTTPS requests, and nothing on HTTP — limits credential/path leakage |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` | Disables browser APIs the app does not use, shrinking the attack surface if a dependency is compromised |
| `X-DNS-Prefetch-Control` | `on` | Enables DNS prefetch for performance without weakening other controls |
| `X-Powered-By` (removed) | *(header suppressed)* | `poweredByHeader: false` in Next.js config prevents framework fingerprinting via the `X-Powered-By: Next.js` header |

### CSP compatibility notes

The policy is intentionally compatible with the current frontend:

- **Google Fonts** — `globals.css` imports CSS from `fonts.googleapis.com` (font files from `fonts.gstatic.com`)
- **Stellar Horizon** — `src/lib/stellar.ts` fetches `https://horizon.stellar.org`
- **Next.js / Tailwind** — `'unsafe-inline'` (and `'unsafe-eval'` for scripts) remain allowed so App Router and tooling keep working without nonce wiring

Tighten further only after introducing nonces/hashes and verifying wallet-kit flows.

### How to adjust CSP for a new feature

All CSP logic lives in `buildContentSecurityPolicy()` inside [`frontend/security-headers.mjs`](./frontend/security-headers.mjs).

**Add a new external origin to `connect-src`** (e.g. a new API):

```js
// security-headers.mjs — inside buildContentSecurityPolicy()
const connectSrc = [
  "'self'",
  "https://horizon.stellar.org",
  "https://*.stellar.org",
  "https://your-new-api.example.com", // ← add here
].join(" ");
```

Or pass it as an option (useful for environment-specific overrides):

```js
buildContentSecurityPolicy({ extraConnectSrc: ["https://your-new-api.example.com"] })
```

**Allow a new font/style origin** — add it to the relevant directive array at the bottom of `buildContentSecurityPolicy()`.

**Add a nonce** — replace `'unsafe-inline'` in `script-src` / `style-src` with `'nonce-${nonce}'` and generate a fresh nonce per request in `middleware.ts`.

After any CSP change, run the unit tests:

```bash
cd frontend
pnpm test:security-headers   # node:test runner
pnpm test                    # vitest
```

## Configuration

**Source of truth:** [`frontend/security-headers.mjs`](./frontend/security-headers.mjs)

**Wired in:** [`frontend/next.config.ts`](./frontend/next.config.ts)

```ts
const nextConfig: NextConfig = {
  // Suppress X-Powered-By: Next.js to prevent framework fingerprinting.
  poweredByHeader: false,

  async headers() {
    return getNextSecurityHeadersConfig();
  },
};
```

All routes use `source: "/:path*"`.

## Local verification

```bash
# Unit tests (Node built-in test runner — no extra deps)
cd frontend
pnpm test:security-headers

# Vitest tests (includes security-header integration assertions)
pnpm test

# Full integration: unit tests + production build + live header check
chmod +x scripts/test-security-headers.sh
./scripts/test-security-headers.sh
```

Optional: override the ephemeral server port:

```bash
SECURITY_HEADERS_TEST_PORT=3020 ./scripts/test-security-headers.sh
```

### Manual check

```bash
cd frontend
pnpm build && pnpm start
# in another terminal:
curl -sI http://localhost:3000 | grep -iE 'content-security-policy|strict-transport|x-frame|x-content-type|referrer-policy|permissions-policy|x-powered-by'
```

## CI relationship

Frontend CI ([`.github/workflows/frontend-ci.yml`](./.github/workflows/frontend-ci.yml)) already runs `pnpm build`. Because headers live in `next.config.ts`, a successful build loads the same config production uses. Run `./scripts/test-security-headers.sh` locally before opening a PR that changes header policy.

## Related files

| File | Purpose |
|------|---------|
| [`frontend/security-headers.mjs`](./frontend/security-headers.mjs) | Single source of truth for header definitions and `buildContentSecurityPolicy()` |
| [`frontend/next.config.ts`](./frontend/next.config.ts) | Wires headers globally and sets `poweredByHeader: false` |
| [`frontend/security-headers.test.mjs`](./frontend/security-headers.test.mjs) | Node `node:test` unit tests for the config module |
| [`frontend/src/lib/security-headers.test.ts`](./frontend/src/lib/security-headers.test.ts) | Vitest integration tests asserting #82 header values via the API route layer |
| [`scripts/test-security-headers.sh`](./scripts/test-security-headers.sh) | End-to-end shell script: build + start + curl |

## References

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [Next.js `headers` configuration](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers)
- [MDN: Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy)
- [MDN: X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options)
- [GitHub issue #82](https://github.com/your-org/Task-Bounty/issues/82)
