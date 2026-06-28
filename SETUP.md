# TaskBounty — Local Development Setup

This guide covers everything needed to build, test, and run TaskBounty locally.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Repository Setup](#repository-setup)
- [Smart Contract Development](#smart-contract-development)
- [Frontend Development](#frontend-development)
- [Testing](#testing)
- [Deploying to Testnet](#deploying-to-testnet)
- [IDE Configuration](#ide-configuration)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required

| Tool | Version | Install |
|------|---------|---------|
| Rust | stable (≥ 1.74) | [rustup.rs](https://rustup.rs) |
| wasm32 target | — | `rustup target add wasm32-unknown-unknown` |
| Stellar CLI | ≥ 21.0 | `cargo install --locked stellar-cli --features opt` |
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org) |
| pnpm | ≥ 8 | `npm install -g pnpm` |

### Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Add WebAssembly compile target
rustup target add wasm32-unknown-unknown
```

### Install Stellar CLI

```bash
cargo install --locked stellar-cli --features opt

# Verify
stellar --version
```

---

## Repository Setup

```bash
git clone https://github.com/<org>/Task-Bounty.git
cd Task-Bounty
```

---

## Smart Contract Development

The contract lives in `contract/contracts/hello-world/src/`.

### Build

```bash
cd contract
stellar contract build
```

Output: `target/wasm32-unknown-unknown/release/hello_world.wasm`

### Build optimized (for deployment)

```bash
stellar contract optimize \
  --wasm target/wasm32-unknown-unknown/release/hello_world.wasm
```

### Project structure

```
contract/contracts/hello-world/src/
├── lib.rs          # Public contract API & entry points
├── types.rs        # Task, Submission, Dispute, Error enums/structs
├── storage.rs      # Storage key helpers (get/set wrappers)
├── task.rs         # create_task, cancel_task logic
├── submission.rs   # submit_work, approve_submission, reject_submission
├── dispute.rs      # raise_dispute logic
├── events.rs       # Event emission helpers
└── test.rs         # Integration tests
```

---

## Frontend Development

The frontend is a Next.js app in `frontend/`.

```bash
cd frontend
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Copy the example env file:

```bash
cp "Documents/Task Bounty/.env.example" frontend/.env.local
```

Key variables:

```env
NEXT_PUBLIC_CONTRACT_ID=       # Deployed contract address
NEXT_PUBLIC_NETWORK=testnet    # testnet or mainnet
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
```

### Build for production

```bash
pnpm build
```

---

## Testing

### Contract tests

```bash
cd contract
cargo test                        # Run all tests
cargo test -- --nocapture         # With stdout output
cargo test test_create_task       # Single test by name
cargo test -- --test-threads=1    # Serial (for debugging)
```

Tests are in `contract/contracts/hello-world/src/test.rs` and use the Soroban test environment (`soroban_sdk::testutils`).

### Frontend linting

```bash
cd frontend
pnpm lint
```

---

## Deploying to Testnet

### 1. Generate a test identity

```bash
stellar keys generate dev-account --network testnet
```

### 2. Fund with test XLM

```bash
stellar keys fund dev-account --network testnet
# Or: curl https://friendbot.stellar.org?addr=<PUBLIC_KEY>
```

### 3. Deploy

```bash
cd contract
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/hello_world.wasm \
  --source dev-account \
  --network testnet
```

Save the returned contract ID.

### 4. Initialize

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source dev-account \
  --network testnet \
  -- \
  initialize \
  --dispute_resolver <DISPUTE_RESOLVER_ADDRESS> \
  --admin <ADMIN_ADDRESS>
```

### 5. Invoke a function

```bash
# Create a task
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source dev-account \
  --network testnet \
  -- \
  create_task \
  --poster <POSTER_ADDRESS> \
  --title "Build something" \
  --description "Full description here" \
  --token <TOKEN_ADDRESS> \
  --reward 1000000000 \
  --deadline 1780000000 \
  --max_submissions 3

# Read a task
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source dev-account \
  --network testnet \
  -- \
  get_task \
  --task_id 1
```

### Generate TypeScript bindings

```bash
stellar contract bindings typescript \
  --contract-id <CONTRACT_ID> \
  --network testnet \
  --output-dir frontend/src/lib/contract-bindings
```

---

## IDE Configuration

### VS Code

Recommended extensions:
- `rust-lang.rust-analyzer`
- `vadimcn.vscode-lldb`
- `bungcip.better-toml`

The project already has `.vscode/settings.json`. If you need to add Rust analyzer settings:

```json
{
  "rust-analyzer.cargo.target": "wasm32-unknown-unknown",
  "rust-analyzer.checkOnSave.allTargets": false
}
```

---

## Troubleshooting

### `stellar: command not found`

Stellar CLI is not in PATH after `cargo install`.

```bash
export PATH="$HOME/.cargo/bin:$PATH"
# Add to ~/.bashrc or ~/.zshrc to persist
```

### `error: linker 'rust-lld' not found` or WASM target error

WebAssembly target is missing.

```bash
rustup target add wasm32-unknown-unknown
```

### `error[E0463]: can't find crate for 'std'`

You're compiling for WASM without the `no_std` attribute, or the target wasn't added.

```bash
rustup target add wasm32-unknown-unknown
cargo build --target wasm32-unknown-unknown --release
```

### Build fails after dependency update

```bash
cd contract
cargo clean
stellar contract build
```

### `insufficient balance` when invoking

Your test account needs XLM.

```bash
stellar keys fund dev-account --network testnet
```

### Tests fail with `HostError` or `Vm error`

Run with `--nocapture` to see the panic message:

```bash
cargo test -- --nocapture 2>&1 | head -50
```

### `pnpm install` fails

Ensure you're using Node.js 18+ and pnpm 8+:

```bash
node --version   # should be >= 18
pnpm --version   # should be >= 8
```

---

## Useful Commands Reference

```bash
# Contract
stellar contract build                        # Build
cargo test                                    # Test
cargo clippy -- -D warnings                   # Lint
cargo fmt                                     # Format
stellar contract inspect --wasm <WASM_FILE>   # Inspect ABI

# Network
stellar keys generate <name> --network testnet
stellar keys fund <name> --network testnet
stellar contract deploy --wasm <FILE> --source <KEY> --network testnet
stellar contract invoke --id <ID> --source <KEY> --network testnet -- <FN> <ARGS>

# Frontend
pnpm dev      # Dev server
pnpm build    # Production build
pnpm lint     # Lint
```
