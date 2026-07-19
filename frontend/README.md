This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## HTTP security headers

Production responses include recommended security headers (CSP, HSTS, `X-Frame-Options`, and others). Configuration lives in [`security-headers.mjs`](./security-headers.mjs) and is wired through [`next.config.ts`](./next.config.ts).

```bash
pnpm test:security-headers
# full build + live curl check from repo root:
../scripts/test-security-headers.sh
```

See [`../SECURITY_HEADERS.md`](../SECURITY_HEADERS.md) for the full list and CSP compatibility notes.

## Task submission file validation

The frontend now exposes a server-side validation endpoint for uploaded task submission files:

```
POST /api/task-submissions/validate
```

Accepted uploads are restricted to a small allow-list of safe formats (`.pdf`, `.zip`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.txt`, `.md`, `.json`). Validation checks file count, individual file size, combined payload size, suspicious filenames, declared MIME type, and the file signature/content where possible before accepting the upload.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Health Check

The app exposes a health check endpoint for monitoring application status and service availability:

```
GET /api/health
```

Example response (`200 OK`, `Cache-Control: no-store`):

```json
{
  "status": "ok",
  "service": "taskbounty-frontend",
  "timestamp": "2026-07-16T21:00:00.000Z",
  "uptime": 42,
  "environment": "production"
}
```

| Field | Description |
| --- | --- |
| `status` | `"ok"` when the app is able to serve requests |
| `service` | Service identifier (`taskbounty-frontend`) |
| `timestamp` | ISO-8601 time the report was generated |
| `uptime` | Seconds the Node.js process has been running |
| `environment` | Runtime environment (`development`, `production`, `test`) |

The endpoint is always server-rendered (never cached), so it reflects the live process. It can be wired into load balancers, uptime monitors, or container orchestration probes.

## Running Tests

Unit tests are written with [Vitest](https://vitest.dev):

```bash
pnpm test
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
