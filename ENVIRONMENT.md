# Environment Variable Management

This document describes how Task-Bounty manages configuration and secrets so that
sensitive values are never committed or leaked to the browser.

## Acceptance checklist

- [x] `.env.example` templates updated (root + frontend + legacy docs)
- [x] Sensitive values removed from committed templates
- [x] Documentation for safe env usage (this file)

## Source of truth

| File | Purpose | Commit? |
|------|---------|---------|
| [`frontend/.env.example`](frontend/.env.example) | Active Next.js app template | Yes |
| [`.env.example`](.env.example) | Root overview / pointers | Yes |
| [`Documents/Task Bounty/.env.example`](Documents/Task%20Bounty/.env.example) | Legacy EVM reference only | Yes |
| `frontend/.env.local` / `.env` / `.env.*.local` | Real local secrets & overrides | **Never** |

## Rules

1. **Never commit secrets.** Private keys, seed phrases, deployer secrets, and
   provider API tokens must live only in gitignored files or a secret manager.
2. **Never put secrets in `NEXT_PUBLIC_*` variables.** Anything with that prefix
   is bundled into client JavaScript and is publicly readable.
3. **Use placeholders in examples.** Templates may show empty values or
   `<YOUR_API_KEY>` markers — never real credentials.
4. **Prefer workspace-local files.** Frontend config belongs in `frontend/.env.local`.
5. **Defaults must be safe.** The app boots without a local env file by using
   public Stellar defaults (Horizon mainnet URL, `PUBLIC` network).

## Frontend variables

| Variable | Public? | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_STELLAR_NETWORK` | Yes | `PUBLIC` or `TESTNET` for the wallet kit |
| `NEXT_PUBLIC_HORIZON_URL` | Yes | Horizon HTTP base URL for account reads |
| `NEXT_PUBLIC_SOROBAN_RPC_URL` | Yes | Optional Soroban RPC URL (future contract calls) |
| `NEXT_PUBLIC_CONTRACT_ID` | Yes | Optional deployed contract ID (`C...`) |
| `NODE_ENV` | Yes | Set by Next.js / Node — do not override with secrets |

Server-only secrets (if introduced later) must:

- omit the `NEXT_PUBLIC_` prefix
- be read only inside Route Handlers / Server Components / server utilities
- never be logged or returned in API responses

## Local setup

```bash
cd frontend
cp .env.example .env.local
# edit .env.local with non-secret public overrides as needed
pnpm dev
```

Confirm `.env.local` is ignored:

```bash
git check-ignore -v frontend/.env.local
```

## Contract / deploy secrets

Soroban deploy keys and network secrets belong in your shell environment or a
password manager — not in the frontend bundle:

```bash
# Example: export for a single shell session (do not commit)
export STELLAR_SECRET_KEY="S..."   # your key — never paste into git
stellar contract deploy --source-account "$STELLAR_SECRET_KEY" ...
```

The AutoShare contract workspace under `contract/` does not require a committed
`.env` file for `cargo test` / `cargo build`.

## What was removed / hardened

- Legacy `Documents/Task Bounty/.env.example` no longer embeds sample Alchemy URL
  paths that looked like filled API slots; keys are blank placeholders.
- `PRIVATE_KEY` and explorer API keys are empty in templates.
- Frontend gitignore allows committing `.env.example` while still ignoring
  `.env`, `.env.local`, and `.env.*.local`.
- Root gitignore blocks common secret env filenames repo-wide.

## Verification helpers

```bash
# Ensure example files contain no high-entropy secret-looking assignments
cd frontend && pnpm test -- src/lib/env.test.ts

# Production build must succeed with defaults (no .env.local required)
pnpm build
```

## Related docs

- [SECURITY.md](SECURITY.md) — vulnerability reporting and product security posture
- [SETUP.md](SETUP.md) — local install and run instructions
- [SECURITY_HEADERS.md](SECURITY_HEADERS.md) — HTTP header configuration
