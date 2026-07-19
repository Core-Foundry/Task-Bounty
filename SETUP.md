# Local Development Setup

This guide explains how to install, configure, run, test, and troubleshoot the current code in this repository.

> Important: the active application in this repo is a **Stellar/Soroban AutoShare contract + Paymesh frontend**.
> Some files under `Documents/Task Bounty/` are legacy/reference documents and are **not** the source of truth for local setup.

## Table of Contents

- [What is in this repository](#what-is-in-this-repository)
- [Prerequisites](#prerequisites)
- [Clone and prepare the repository](#clone-and-prepare-the-repository)
- [Install dependencies](#install-dependencies)
- [Configuration](#configuration)
- [Run the smart contract locally](#run-the-smart-contract-locally)
- [Run the frontend locally](#run-the-frontend-locally)
- [Testing and validation](#testing-and-validation)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

---

## What is in this repository

The repo currently contains two active workspaces:

```text
Task-Bounty/
├── contract/                    # Soroban workspace
│   ├── Cargo.toml
│   └── contracts/
│       └── hello-world/
│           └── src/
│               ├── lib.rs
│               ├── autoshare_logic.rs
│               ├── base/
│               ├── interfaces/
│               ├── mock_token.rs
│               └── tests/
├── frontend/                    # Next.js frontend
│   ├── package.json
│   └── src/
└── SETUP.md                     # This file
```

### Current behavior to be aware of

- The contract code exposes **AutoShare/Paymesh** functionality, not the older TaskBounty contract described in some legacy docs.
- The frontend currently uses the Stellar wallet kit with `WalletNetwork.PUBLIC`.
- The frontend currently reads the public Horizon endpoint directly in code.
- There is **no required `.env.local` file** for the current frontend code path.

---

## Prerequisites

Install these before running the project.

| Tool | Recommended version | Why it is needed |
| --- | --- | --- |
| Rust | stable | Builds and tests the Soroban contract |
| `wasm32-unknown-unknown` target | latest | Compiles the contract to WebAssembly |
| Stellar CLI | latest stable | Builds/optimizes/deploys Soroban contracts |
| Node.js | 20.9.0 or newer | Runs the frontend and satisfies Next.js 16 requirements |
| pnpm | 10.x | Matches the frontend package manager |
| Freighter or another supported Stellar wallet | latest | Optional, for manual frontend testing |

### Quick version checks

Run these after installation:

```bash
rustc -V
cargo -V
stellar --version
node -v
pnpm -v
```

---

## Clone and prepare the repository

If you are contributing from a fork:

```bash
git clone https://github.com/<your-username>/Task-Bounty.git
cd Task-Bounty
git remote add upstream https://github.com/Core-Foundry/Task-Bounty.git
```

If you already cloned the repository directly from GitHub, just move into it:

```bash
cd Task-Bounty
```

---

## Install dependencies

### 1. Install Rust and the WASM target

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
rustup target add wasm32-unknown-unknown
```

### 2. Install Stellar CLI

```bash
cargo install --locked stellar-cli --features opt
stellar --version
```

### 3. Install Node.js and pnpm

If you already have Node.js 20.9+ installed:

```bash
corepack enable
corepack prepare pnpm@10.26.1 --activate
pnpm -v
```

If your shell still does not expose a `pnpm` binary after activation, use `corepack pnpm` in the commands below instead.

If `corepack` is unavailable, use:

```bash
npm install -g pnpm
pnpm -v
```

### 4. Install frontend packages

```bash
cd frontend
pnpm install
cd ..
```

---

## Configuration

### Frontend configuration

The current frontend does **not** require a `.env.local` file to boot.

At the moment:

- wallet network is set in `frontend/src/hooks/stellar-wallets-kit.ts`
- Horizon endpoint is set in `frontend/src/lib/stellar.ts`

That means the old file below is **reference-only** and is not consumed by the current frontend:

```text
Documents/Task Bounty/.env.example
```

### When you may still want local configuration

You may choose to add a private `.env.local` later if you wire contract IDs, RPC URLs, or feature flags into the frontend. Until the code reads those variables, creating the file has no effect.

---

## Run the smart contract locally

From the repo root:

```bash
cd contract
```

### Build

```bash
stellar contract build
```

Expected output:

```text
target/wasm32-unknown-unknown/release/hello_world.wasm
```

### Optimize the compiled contract

```bash
stellar contract optimize \
  --wasm target/wasm32-unknown-unknown/release/hello_world.wasm
```

### Useful contract files

```text
contract/contracts/hello-world/src/
├── lib.rs                  # Public contract entry points
├── autoshare_logic.rs      # Main AutoShare business logic
├── base/errors.rs          # Custom errors
├── base/events.rs          # Event helpers
├── base/types.rs           # Shared contract types
├── interfaces/autoshare.rs # Contract interface definition
├── mock_token.rs           # Test token helper
└── tests/                  # Contract test suite
```

---

## Run the frontend locally

```bash
cd frontend
pnpm dev
```

Then open:

```text
http://localhost:3000
```
Once running, application status can be monitored via the health check endpoint at [http://localhost:3000/api/health](http://localhost:3000/api/health) (see `frontend/README.md` for the response format).

### Environment variables

### Production build

```bash
pnpm build
pnpm start
```

---

## Testing and validation

### Contract tests

```bash
cd contract
cargo test
```

Useful variations:

```bash
# Show panic/output details
cargo test -- --nocapture

# Run a single test by substring
cargo test test_initialize_with_admin -- --nocapture

# Run pause-related tests only
cargo test pause_test -- --nocapture
```

### Contract formatting and linting

```bash
cd contract
cargo fmt --all --check
cargo clippy --all-targets -- -D warnings
```

### Frontend checks
Tests are in `contract/contracts/hello-world/src/test.rs` and use the Soroban test environment (`soroban_sdk::testutils`).

### Frontend tests

```bash
cd frontend
pnpm test    # Run unit tests (Vitest)
```

Frontend unit tests live next to the code they cover (e.g. `frontend/src/lib/health.test.ts`).

### Frontend linting

```bash
cd frontend
pnpm lint
pnpm build
```

---

## Examples

### Example 1: Fresh local setup from a fork

```bash
git clone https://github.com/<your-username>/Task-Bounty.git
cd Task-Bounty
git remote add upstream https://github.com/Core-Foundry/Task-Bounty.git

rustup target add wasm32-unknown-unknown
corepack enable
corepack prepare pnpm@10.26.1 --activate

cd frontend && pnpm install && cd ..
cd contract && cargo test && cd ..
cd frontend && pnpm dev
```

### Example 2: Verify the contract before opening a PR

```bash
cd contract
cargo fmt --all --check
cargo test -- --nocapture
```

### Example 3: Verify the frontend before opening a PR

```bash
cd frontend
pnpm lint
pnpm build
```

### Example 4: Manual smoke test of the UI

1. Start the frontend with `pnpm dev`.
2. Open `http://localhost:3000`.
3. Click **CONNECT WALLET**.
4. Approve the connection in a supported Stellar wallet.
5. Confirm the connected wallet address appears in the navbar.

### Example 5: Build the deployable contract artifact

```bash
cd contract
stellar contract build
stellar contract optimize \
  --wasm target/wasm32-unknown-unknown/release/hello_world.wasm
```

---

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for a comprehensive guide to common installation and runtime issues.

---

## Recommended PR checklist

Before pushing your branch, run:

```bash
cd contract && cargo test
cd ../frontend && pnpm lint && pnpm build
```

If all of the above pass, your local setup is ready for day-to-day development.
