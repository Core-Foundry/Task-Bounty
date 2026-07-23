# ADR-0004: Frontend Framework Selection

- **Status:** Accepted
- **Date:** 2025-02-15
- **Author(s):** TaskBounty Core Team

## Context

TaskBounty needs a web frontend for users to browse tasks, connect their Stellar wallet, create bounties, submit work, and review submissions. We needed to choose a JavaScript framework and supporting libraries.

## Decision Drivers

- Strong TypeScript support for type-safe contract interaction
- Server-side rendering capability for fast initial page loads and SEO
- Compatible with `@creit.tech/stellar-wallets-kit` for wallet connections
- Active ecosystem with good component library options
- Team familiarity

## Options Considered

### Option A: Create React App (CRA) or Vite + React SPA

Plain React SPA without server rendering.

- **Pros:** Simple setup; widely understood
- **Cons:** No SSR/SSG; poor SEO for public task board; CRA is deprecated; slower cold starts

### Option B: Next.js (App Router)

React framework with built-in SSR, SSG, and API routes.

- **Pros:** File-based routing; SSR for task board pages; excellent TypeScript support; large ecosystem; Vercel deployment is trivial
- **Cons:** App Router is relatively new; some learning curve for server vs. client component boundaries

### Option C: SvelteKit

Svelte-based full-stack framework.

- **Pros:** Excellent performance; simple reactivity model
- **Cons:** Smaller ecosystem; fewer Stellar/Web3 component examples; less team familiarity

## Decision

**Chosen option: Option B — Next.js 16 with App Router**, because it provides SSR for the public task board (important for discoverability), has first-class TypeScript support, integrates cleanly with TanStack Query for contract data fetching, and Vercel deployment requires no additional configuration.

## Consequences

### Positive

- Task board pages can be server-rendered for fast loads and SEO
- App Router's layout system makes it easy to share wallet context across dashboard pages
- TanStack React Query handles caching and refetching of contract state cleanly
- Radix UI + Tailwind CSS gives a consistent, accessible component foundation

### Negative / Trade-offs

- Server and client component boundary requires care when using browser-only APIs (e.g. wallet kit)
- Next.js major versions move quickly; keeping up requires periodic upgrades

### Neutral

- The frontend is stateless with respect to the blockchain; all persistent state lives in the Soroban contract

## Links

- [Next.js documentation](https://nextjs.org/docs)
- [Stellar Wallets Kit](https://github.com/Creit-Tech/Stellar-Wallets-Kit)
- [TanStack Query](https://tanstack.com/query/latest)
