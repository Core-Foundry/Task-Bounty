# Deployment Guide for Soroban Contracts

This guide covers deployment of the AutoShare Soroban smart contract and the Next.js frontend across three environments:

- **Local development** — Rapid iteration on your machine
- **Testnet** — Staging on Stellar's test network (no real value)
- **Production (Mainnet)** — Live deployment on Stellar mainnet

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development Deployment](#local-development-deployment)
- [Testnet Deployment](#testnet-deployment)
- [Production (Mainnet) Deployment](#production-mainnet-deployment)
- [Contract Initialization](#contract-initialization)
- [Frontend Deployment](#frontend-deployment)
- [Post-Deployment Verification](#post-deployment-verification)
- [CI / CD](#ci--cd)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

The same toolchain is required for all environments.

| Tool | Version | Purpose |
|------|---------|---------|
| Rust | stable (`1.80+`) | Compiles the Soroban contract |
| `wasm32-unknown-unknown` | latest | WebAssembly compilation target |
| Stellar CLI (`stellar`) | latest stable | Build, optimize, deploy, and invoke contracts |
| Node.js | `20.9.0` or newer | Runs the Next.js frontend |
| pnpm | `10.x` | Frontend package manager |

### Installation

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# WASM target
rustup target add wasm32-unknown-unknown

# Stellar CLI
cargo install --locked stellar-cli --features opt

# Verify
rustc -V
cargo -V
stellar --version
node -v
pnpm -v
```

---

## Local Development Deployment

Local development lets you test contract changes rapidly without paying network fees or waiting for ledger close times.

### 1. Build the Contract

```bash
cd contract

# Build the contract WASM
stellar contract build
```

The build output is:
```
target/wasm32-unknown-unknown/release/hello_world.wasm
```

### 2. (Optional) Optimize the WASM

```bash
stellar contract optimize \
  --wasm target/wasm32-unknown-unknown/release/hello_world.wasm
```

### 3. Run Contract Tests

```bash
cargo test

# With output (useful for debugging)
cargo test -- --nocapture

# Run a specific test
cargo test test_create_and_get_success -- --nocapture
```

### 4. Run Local Soroban Sandbox (Deprecated Alternative)

For local integration testing without a network:

```bash
# Start a local standalone network (Soroban RPC + Frontier)
# Requires Docker
docker run --rm -it -p 8000:8000 stellar/quickstart:testing \
  --standalone --enable-soroban-rpc
```

Then configure a local network in Stellar CLI:

```bash
stellar network add local \
  --rpc-url http://localhost:8000/soroban/rpc \
  --network-passphrase "Standalone Network ; February 2017"
```

Generate and fund a local identity:

```bash
stellar keys generate local-dev --network local
```

Deploy to local:

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/hello_world.wasm \
  --source local-dev \
  --network local
```

### 5. Run the Frontend Locally

```bash
cd frontend
pnpm install   # first time only
pnpm dev
```

The frontend starts at [http://localhost:3000](http://localhost:3000).

> **Note:** The frontend currently targets the Stellar **PUBLIC** network by default
> (`WalletNetwork.PUBLIC` in `frontend/src/hooks/stellar-wallets-kit.ts`).
> To test against testnet or local, update this constant.

---

## Testnet Deployment

Testnet is the recommended staging environment. It mirrors mainnet functionality
but uses test XLM with no real value.

### 1. Generate a Deployer Key

```bash
stellar keys generate testnet-deployer --network testnet
```

### 2. Fund the Deployer with Test XLM

```bash
stellar keys fund testnet-deployer --network testnet
```

Verify the balance:

```bash
stellar keys balance testnet-deployer --network testnet
```

Expected output:
```
10000.0000000 XLM
```

### 3. Build and Optimize the Contract

```bash
cd contract

# Build
stellar contract build

# Optimize (reduces WASM size for cheaper deployment)
stellar contract optimize \
  --wasm target/wasm32-unknown-unknown/release/hello_world.wasm
```

### 4. Deploy the Contract

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/hello_world.wasm \
  --source testnet-deployer \
  --network testnet
```

On success, the CLI prints the contract ID:

```
Contract deployed: CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4
```

**Save this contract ID immediately.** You will need it for initialization and
frontend configuration.

```bash
export CONTRACT_ID="C...your-contract-id-here"
```

### 5. Generate Additional Test Identities

Create identities you will use for contract interaction (admin, creators, etc.):

```bash
stellar keys generate testnet-admin --network testnet
stellar keys fund testnet-admin --network testnet

stellar keys generate testnet-creator --network testnet
stellar keys fund testnet-creator --network testnet
```

### 6. Initialize the Contract

See [Contract Initialization](#contract-initialization) for the complete set of
initialization commands. At minimum, you must call:

```bash
# Initialize admin
stellar contract invoke \
  --id $CONTRACT_ID \
  --source testnet-admin \
  --network testnet \
  -- \
  initialize_admin \
  --admin $(stellar keys address testnet-admin)

# Add a supported payment token (e.g., USDC on testnet)
stellar contract invoke \
  --id $CONTRACT_ID \
  --source testnet-admin \
  --network testnet \
  -- \
  add_supported_token \
  --token <TOKEN_CONTRACT_ADDRESS> \
  --admin $(stellar keys address testnet-admin)
```

### 7. Configure the Frontend for Testnet

Edit `frontend/src/hooks/stellar-wallets-kit.ts`:

```typescript
// Change from:
network: WalletNetwork.PUBLIC,
// To:
network: WalletNetwork.TESTNET,
```

Edit `frontend/src/lib/stellar.ts`:

```typescript
// Change from:
const HORIZON_URL = "https://horizon.stellar.org";
// To:
const HORIZON_URL = "https://horizon-testnet.stellar.org";
```

> **Production note:** In a real application, these values should be read from
> environment variables (e.g., `NEXT_PUBLIC_STELLAR_NETWORK`) so the same build
> can target different networks without code changes.

### 8. Test End-to-End

```bash
# Start the frontend
cd frontend
pnpm dev
```

1. Open `http://localhost:3000`
2. Connect your wallet (Freighter should be on testnet)
3. Verify the wallet address appears in the navbar
4. Check the health endpoint:
   ```bash
   curl http://localhost:3000/api/health
   ```

### 9. Deploy the Frontend (Testnet)

See [Frontend Deployment](#frontend-deployment) for Vercel and self-hosted options.

---

## Production (Mainnet) Deployment

> **⚠️ IMPORTANT: Security first**
>
> Before deploying to mainnet:
> 1. Complete a **professional security audit** of the contract
> 2. Conduct internal code review following the focus areas in [CONTRIBUTING.md](./CONTRIBUTING.md)
> 3. Test the entire workflow on testnet with realistic scenarios
> 4. Set up monitoring and alerting
> 5. Have an incident response plan
>
> **Never use a private key stored in plaintext for mainnet operations.**
> Use a hardware wallet or secure key management service.

### Pre-Deployment Checklist

- [ ] Professional security audit completed
- [ ] All `cargo clippy` warnings resolved (`cargo clippy -- -D warnings`)
- [ ] All tests passing (`cargo test`)
- [ ] Contract initialized on testnet and workflow verified
- [ ] Frontend tested against testnet deployment
- [ ] Emergency admin operations tested (pause, unpause, transfer admin)
- [ ] Withdraw function tested (admin can recover tokens)
- [ ] Monitoring and alerting configured
- [ ] Rollback plan documented

### 1. Generate Mainnet Deployer Key

Use a hardware wallet or a cold-stored key:

```bash
# If using a Ledger or similar hardware wallet:
# Follow the hardware wallet setup guide for Stellar

# If using a software key (less secure — use with caution):
stellar keys generate mainnet-deployer --network mainnet
```

> **Security recommendation:** For mainnet, use `stellar keys add` with a
> hardware wallet instead of `stellar keys generate`. Never store mainnet
> private keys in plaintext.

### 2. Fund the Deployer Address

Transfer real XLM to the deployer's public key. The deployer needs:

- **Minimum balance:** 2.5 XLM (contract ledger entry)
- **Deployment fee:** ~0.0001 XLM (negligible)
- **Reserve buffer:** At least 10–20 XLM for initialization calls

### 3. Build and Optimize the Contract

The release profile in `contract/Cargo.toml` is already optimized for
deployment (LTO, symbol stripping, panic=abort):

```bash
cd contract

# Build with release optimizations
stellar contract build

# Optimize the WASM binary
stellar contract optimize \
  --wasm target/wasm32-unknown-unknown/release/hello_world.wasm
```

### 4. Deploy the Contract

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/hello_world.wasm \
  --source mainnet-deployer \
  --network mainnet
```

Save the contract ID:

```bash
export CONTRACT_ID="C...mainnet-contract-id"
```

### 5. Initialize the Contract

Follow [Contract Initialization](#contract-initialization), replacing the
network flag with `--network mainnet` and using mainnet identities.

### 6. Configure the Frontend for Mainnet

The frontend is already configured for mainnet by default:

- `frontend/src/hooks/stellar-wallets-kit.ts`: `WalletNetwork.PUBLIC`
- `frontend/src/lib/stellar.ts`: `https://horizon.stellar.org`

If you changed these for testnet, revert the changes.

### 7. Deploy the Frontend

See [Frontend Deployment](#frontend-deployment).

---

## Contract Initialization

After deploying the contract to any network (testnet or mainnet), you must
initialize it before use.

### `initialize_admin`

Sets the contract admin and initializes default values (usage fee = 10,
empty supported tokens list). **This can only be called once.**

```bash
ADMIN_ADDR=$(stellar keys address <YOUR_ADMIN_KEY>)

stellar contract invoke \
  --id $CONTRACT_ID \
  --source <YOUR_ADMIN_KEY> \
  --network <testnet|mainnet> \
  -- \
  initialize_admin \
  --admin $ADMIN_ADDR
```

### `add_supported_token`

Adds a token contract that the AutoShare system accepts for payments.
Only the admin can call this.

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source <YOUR_ADMIN_KEY> \
  --network <testnet|mainnet> \
  -- \
  add_supported_token \
  --token <TOKEN_CONTRACT_ADDRESS> \
  --admin $ADMIN_ADDR
```

**Common token addresses on Stellar:**

| Network | Token | Contract Address |
|---------|-------|-----------------|
| Testnet | USDC | `CBIELTK6ZH6JGRAZ7AE2T6NGKYUFZ5YSAVQR5NSK3YDKG2LWNPGTKYOT` |
| Testnet | XLM (native) | Native — use SAC wrapper |
| Mainnet | USDC | `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` |
| Mainnet | XLM (native) | Native — use SAC wrapper |

### `set_usage_fee`

Sets the per-usage fee in the payment token's smallest unit. Only the admin
can call this.

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source <YOUR_ADMIN_KEY> \
  --network <testnet|mainnet> \
  -- \
  set_usage_fee \
  --fee 10 \
  --admin $ADMIN_ADDR
```

### Complete Initialization Script Example

```bash
#!/usr/bin/env bash
# save as scripts/init-contract.sh and make executable

set -euo pipefail

CONTRACT_ID="${1:?Usage: $0 <contract-id> <network> <admin-key>}"
NETWORK="${2:?}"
ADMIN_KEY="${3:?}"
ADMIN_ADDR=$(stellar keys address "$ADMIN_KEY")

echo "=== Initializing contract $CONTRACT_ID on $NETWORK ==="

# 1. Initialize admin
echo ">> Setting admin to $ADMIN_ADDR ..."
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$ADMIN_KEY" \
  --network "$NETWORK" \
  -- \
  initialize_admin \
  --admin "$ADMIN_ADDR"

# 2. Add supported tokens
echo ">> Adding supported tokens ..."
for TOKEN in "$@"; do
  echo "   - Adding $TOKEN ..."
  stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source "$ADMIN_KEY" \
    --network "$NETWORK" \
    -- \
    add_supported_token \
    --token "$TOKEN" \
    --admin "$ADMIN_ADDR"
done

# 3. Set usage fee
echo ">> Setting usage fee to 10 ..."
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$ADMIN_KEY" \
  --network "$NETWORK" \
  -- \
  set_usage_fee \
  --fee 10 \
  --admin "$ADMIN_ADDR"

echo "=== Initialization complete ==="
```

Usage:

```bash
chmod +x scripts/init-contract.sh
./scripts/init-contract.sh \
  "$CONTRACT_ID" \
  testnet \
  testnet-admin \
  <TOKEN_ADDRESS_1> <TOKEN_ADDRESS_2>
```

---

## Frontend Deployment

The frontend is a Next.js 16 application. It can be deployed to Vercel
(recommended) or self-hosted.

### Building for Production

```bash
cd frontend

# Install dependencies (first time or after dependency changes)
pnpm install

# Run linting
pnpm lint

# Run tests
pnpm test

# Build for production
pnpm build

# Start production server locally (for testing)
pnpm start
```

### Environment Variables

Currently, the frontend reads Stellar network configuration directly from
source code. Before deploying to production, you may want to refactor these
into environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_STELLAR_NETWORK` | Wallet network | `PUBLIC` or `TESTNET` |
| `NEXT_PUBLIC_HORIZON_URL` | Horizon endpoint | `https://horizon.stellar.org` |
| `NEXT_PUBLIC_CONTRACT_ID` | Deployed contract address | `C...` |

### Deploy to Vercel

**Prerequisites:** A [Vercel](https://vercel.com) account and the Vercel CLI.

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from the frontend directory
cd frontend
vercel --prod
```

Vercel automatically detects Next.js and provides:

- Automatic SSL/TLS certificates
- Global CDN
- Preview deployments for pull requests
- Environment variable management
- Serverless function support (for API routes like `/api/health`)

**Vercel configuration (`vercel.json`):**

```json
{
  "framework": "nextjs",
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "installCommand": "pnpm install"
}
```

### Self-Hosted Deployment

For self-hosted deployments (Docker, VPS, or dedicated server):

```bash
cd frontend

# Build
pnpm build

# Start the Node.js server
pnpm start
```

**Dockerfile example:**

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.26.1 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3000
CMD ["pnpm", "start"]
```

Build and run:

```bash
docker build -t taskbounty-frontend ./frontend
docker run -p 3000:3000 taskbounty-frontend
```

### HTTP Security Headers

The production frontend includes recommended security headers (CSP, HSTS,
`X-Frame-Options`, etc.). Verify them before deploying:

```bash
cd frontend
pnpm test:security-headers

# Or from repo root:
./scripts/test-security-headers.sh
```

See [SECURITY_HEADERS.md](./SECURITY_HEADERS.md) for the full list.

---

## Post-Deployment Verification

After deploying the contract and frontend, run through this checklist to
confirm everything works.

### Contract Verification

```bash
# 1. Read contract admin
stellar contract invoke \
  --id $CONTRACT_ID \
  --network <testnet|mainnet> \
  --source <any-key> \
  -- \
  get_admin

# 2. Read pause status (should be false)
stellar contract invoke \
  --id $CONTRACT_ID \
  --network <testnet|mainnet> \
  --source <any-key> \
  -- \
  get_paused_status

# 3. List supported tokens
stellar contract invoke \
  --id $CONTRACT_ID \
  --network <testnet|mainnet> \
  --source <any-key> \
  -- \
  get_supported_tokens

# 4. Read usage fee
stellar contract invoke \
  --id $CONTRACT_ID \
  --network <testnet|mainnet> \
  --source <any-key> \
  -- \
  get_usage_fee

# 5. Get all groups (should be empty initially)
stellar contract invoke \
  --id $CONTRACT_ID \
  --network <testnet|mainnet> \
  --source <any-key> \
  -- \
  get_all_groups
```

### Frontend Verification

```bash
# 1. Health check
curl https://<your-frontend-domain>/api/health
# Expected: {"status":"ok","service":"taskbounty-frontend",...}

# 2. Check HTTP security headers
curl -I https://<your-frontend-domain>
# Verify: Content-Security-Policy, Strict-Transport-Security, etc.

# 3. Manual wallet connection test
# Open https://<your-frontend-domain> in a browser
# Click CONNECT WALLET
# Approve in Freighter or supported wallet
# Confirm address appears in navbar
```

### End-to-End Test Flow

1. **Admin prepares the contract**
   - ✅ Admin initialized
   - ✅ Supported tokens added
   - ✅ Usage fee configured

2. **Creator creates an AutoShare group**
   - Connect wallet (as creator)
   - Create a group through the frontend (or via CLI)
   - Verify the group appears in the group list

3. **Creator manages the group**
   - Add members with percentage splits
   - Top up subscription with additional usages
   - Deactivate and reactivate the group

4. **Admin maintains the contract**
   - Withdraw tokens if needed
   - Pause/unpause the contract in emergencies
   - Transfer admin to a new address

---

## CI / CD

### GitHub Actions — Testnet Deployment

```yaml
# .github/workflows/deploy-testnet.yml
name: Deploy to Testnet

on:
  push:
    branches: [main]
    paths:
      - "contract/**"

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: testnet

    steps:
      - uses: actions/checkout@v4

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: wasm32-unknown-unknown

      - name: Install Stellar CLI
        run: cargo install --locked stellar-cli --features opt

      - name: Build contract
        working-directory: ./contract
        run: stellar contract build

      - name: Optimize contract
        working-directory: ./contract
        run: |
          stellar contract optimize \
            --wasm target/wasm32-unknown-unknown/release/hello_world.wasm

      - name: Deploy to testnet
        working-directory: ./contract
        run: |
          stellar contract deploy \
            --wasm target/wasm32-unknown-unknown/release/hello_world.wasm \
            --source "${{ secrets.TESTNET_DEPLOYER_KEY }}" \
            --network testnet
```

### GitHub Actions — Frontend Deployment to Vercel

```yaml
# .github/workflows/deploy-frontend.yml
name: Deploy Frontend to Vercel

on:
  push:
    branches: [main]
    paths:
      - "frontend/**"

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10

      - name: Install dependencies
        working-directory: ./frontend
        run: pnpm install --frozen-lockfile

      - name: Lint and test
        working-directory: ./frontend
        run: |
          pnpm lint
          pnpm test

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend
          vercel-args: "--prod"
```

---

## Troubleshooting

### Deployment Issues

| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| `stellar contract deploy` fails with insufficient balance | Deployer doesn't have enough XLM | Fund the deployer address (needs min 2.5 XLM) |
| `initialize_admin` panics | Called more than once | `initialize_admin` is one-time; it cannot be called again |
| `add_supported_token` fails with `Unauthorized` | Caller is not the contract admin | Verify the admin address matches `get_admin` |
| Contract invoke fails with `ContractPaused` | Contract is paused | Call `unpause` with the admin key |
| Contract invoke fails with `NotFound` | Wrong contract ID | Double-check `$CONTRACT_ID` |

### Build Issues

| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| `stellar contract build` fails | Missing WASM target | `rustup target add wasm32-unknown-unknown` |
| `cargo test` hangs on first run | Compiling dependencies | Normal for first run; let it finish |
| `pnpm build` fails | Old Node.js version | Upgrade to Node.js 20.9+ |
| Linter errors in CI | Code formatting issues | Run `cargo fmt --all` and `cd frontend && pnpm lint` |

### Frontend Issues

| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| Wallet modal opens but no connection | Wrong network in wallet kit | Confirm `WalletNetwork.PUBLIC` vs `TESTNET` matches wallet |
| Health endpoint not responding | Server not running | `cd frontend && pnpm dev` or `pnpm start` |
| Wallet address not showing after connect | RPC endpoint mismatch | Verify Horizon URL matches the wallet's network |

For more detailed troubleshooting, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

---

## Related Documentation

- [SETUP.md](./SETUP.md) — Local development setup
- [CONTRACT_API.md](./CONTRACT_API.md) — Contract method reference
- [SMART_CONTRACT_EVENTS.md](./SMART_CONTRACT_EVENTS.md) — Event reference
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Contribution guidelines
- [SECURITY_HEADERS.md](./SECURITY_HEADERS.md) — Frontend security headers
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) — Common issues and fixes

