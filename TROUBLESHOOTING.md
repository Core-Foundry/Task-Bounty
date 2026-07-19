# Troubleshooting Guide

This guide documents frequent installation, configuration, and runtime problems when working with the TaskBounty project.

## Table of Contents
- [General Setup Issues](#general-setup-issues)
- [Contract Issues](#contract-issues)
- [Frontend Issues](#frontend-issues)

---

## General Setup Issues

### `pnpm: command not found`

**Problem**: The `pnpm` package manager is not recognized.

**Solution**:
Enable pnpm with Corepack:
```bash
corepack enable
corepack prepare pnpm@10.26.1 --activate
```

Fallback if Corepack isn't available:
```bash
npm install -g pnpm
```

---

### `stellar: command not found`

**Problem**: The Stellar CLI is not installed or not on your `PATH`.

**Solution**:
```bash
cargo install --locked stellar-cli --features opt
export PATH="$HOME/.cargo/bin:$PATH"
```

Persist the PATH change in your shell profile (e.g., `~/.bashrc`, `~/.zshrc`, `~/.profile`) if needed.

---

### `cargo: command not found`

**Problem**: Rust/Cargo is not installed or not on your PATH.

**Solution**:
Install Rust using the official installer:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

---

## Contract Issues

### Missing WASM Target Error (`can't find crate for 'core'`)

**Problem**: The `wasm32-unknown-unknown` target isn't installed.

**Solution**:
```bash
rustup target add wasm32-unknown-unknown
```

---

### Contract Build Fails

**Problem**: Compilation errors when running `stellar contract build`.

**Solution**:
1. Clean the build artifacts and rebuild:
   ```bash
   cd contract
   cargo clean
   stellar contract build
   ```

2. Check your Rust version. Ensure you're using a stable release.

---

### `cargo test` Feels Stuck on First Run

**Problem**: The first test run takes a very long time.

**Solution**:
This is normal! Soroban dependencies are large, and the first compile can take several minutes. Let it finish, and subsequent runs will be much faster.

You can run tests with output to verify progress:
```bash
cd contract
cargo test -- --nocapture
```

---

### Clippy Warnings Fail the Build

**Problem**: `cargo clippy` reports warnings as errors.

**Solution**:
Review and fix the reported issues. Clippy enforces best practices for Rust code.

---

## Frontend Issues

### `pnpm install` Fails with Engine or Lockfile Issues

**Problem**: Installation errors related to Node.js or pnpm versions.

**Solution**:
1. Check your versions:
   ```bash
   node -v  # Should be 20.9.0 or newer
   pnpm -v  # Should be 10.x
   ```

2. Clean and reinstall:
   ```bash
   cd frontend
   rm -rf node_modules .next
   pnpm install
   ```

---

### Port `3000` is Already in Use

**Problem**: Another process is using port 3000.

**Solution**:
Start Next.js on a different port:
```bash
cd frontend
pnpm dev -- --port 3001
```

Or find and stop the process using port 3000.

---

### `pnpm build` Fails with Node.js Version Error

**Problem**: Build fails because Node.js is too old.

**Solution**:
Upgrade Node.js to 20.9.0 or newer, then reinstall dependencies:
```bash
node -v
cd frontend
rm -rf node_modules .next
corepack prepare pnpm@10.26.1 --activate
corepack pnpm install
corepack pnpm build
```

---

### Wallet Modal Opens but No Account Connects

**Problem**: Wallet connection fails.

**Solution**:
Check the following:
- A supported Stellar wallet extension is installed (e.g., Freighter)
- The wallet is unlocked
- The wallet is allowed to connect to the current site
- You are testing against the same network expected by the app

Note: The current frontend initializes the wallet kit with the public network.

---

### Created `.env.local` but Nothing Changed

**Problem**: Environment variables in `.env.local` don't take effect.

**Solution**:
This is expected with the current codebase. The frontend does not yet read local environment variables for wallet network, Horizon URL, or contract IDs.

---

### Health Check Endpoint Not Responding

**Problem**: `/api/health` returns an error or times out.

**Solution**:
1. Ensure the frontend dev server is running:
   ```bash
   cd frontend
   pnpm dev
   ```

2. Check the server logs for errors.

3. Verify the endpoint path is correct (`http://localhost:3000/api/health`).
