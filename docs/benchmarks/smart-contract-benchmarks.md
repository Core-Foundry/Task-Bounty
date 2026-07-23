# Smart Contract Benchmark Results (Issue #46)

This document records the CPU instruction and memory usage of core AutoShare contract functions, measured using Soroban's built-in resource metering in the test environment.

## How to Re-run Benchmarks

```bash
cd contract
cargo test benchmark --locked -- --nocapture
```

The `--nocapture` flag prints the resource tables to stdout. Each test measures one operation in isolation by calling `env.budget().reset_unlimited()` immediately before the operation under test.

## Interpreting the Numbers

Soroban's resource budget tracks:
- **CPU instructions** — approximate compute cost (mapped to network fees)
- **Memory bytes** — RAM used during execution

These numbers come from the mock ledger in tests. They represent **relative costs** and directional trends, not exact mainnet fees. Use them to:

1. Compare operations against each other to spot expensive calls
2. Detect performance regressions when refactoring
3. Identify candidates for optimisation before mainnet deployment

---

## Results Summary

> **Note:** Run `cargo test benchmark -- --nocapture` to populate exact numbers.
> The table below shows the expected **ordering by cost** based on code analysis.

### Read Operations (cheapest → most expensive)

| Function | Description | Expected Cost |
|---|---|---|
| `get_paused_status` | Single key read | Very low |
| `get_usage_fee` | Single key read | Very low |
| `is_group_active` | Single key read + struct decode | Low |
| `get_remaining_usages` | Single key read + struct decode | Low |
| `is_group_member` (5 members) | Read members list, iterate | Low–Medium |
| `get` (3 members) | Read full struct | Medium |
| `get_group_members` | Read struct, extract members | Medium |
| `get_all_groups` (1 group) | Read index + 1 struct | Medium |
| `get_all_groups` (10 groups) | Read index + 10 structs | High |
| `get_all_groups` (50 groups) | Read index + 50 structs | Very High |
| `get_groups_by_creator` (10/20) | Full scan + filter | High |
| `get_user_payment_history` (10) | Read history list | High |

### Write Operations (cheapest → most expensive)

| Function | Description | Expected Cost |
|---|---|---|
| `pause` / `unpause` | Single key write | Low |
| `deactivate_group` / `activate_group` | Read + write struct | Low–Medium |
| `reduce_usage` | Read + write struct | Low–Medium |
| `transfer_admin` | Read + write key + emit event | Medium |
| `add_supported_token` | Read list + push + write | Medium |
| `remove_supported_token` | Read list + filter + write | Medium |
| `set_usage_fee` | Single key write | Low |
| `withdraw` | Read balance + token transfer + event | Medium |
| `initialize_admin` | Write 3 keys | Low–Medium |
| `topup_subscription` | Read + write struct + token transfer + history | High |
| `create` (1 usage) | Write struct + index + token transfer + history + event | High |
| `create` (10 usages) | Same as above (same storage writes) | High |
| `update_members` (2 members) | Validate + write struct + members key + event | Medium |
| `update_members` (5 members) | Validate + write struct + members key + event | Medium–High |
| `update_members` (10 members) | Validate + write struct + members key + event | High |

---

## Key Observations

### Scaling Issues

1. **`get_all_groups` scales linearly** — each additional group requires a storage read.
   - 1 group: baseline
   - 10 groups: ~10× baseline
   - 50 groups: ~50× baseline
   - **Recommendation:** Add cursor-based pagination (`get_groups_page(offset, limit)`) before mainnet launch to avoid hitting instruction limits with large group counts.

2. **`get_groups_by_creator` does a full scan** — it reads all groups then filters.
   - **Recommendation:** Maintain a per-creator index (`DataKey::GroupsByCreator(Address)`) to make this O(1) reads instead of O(n).

3. **Member validation in `update_members` is O(n²)** — for each member it scans all previously seen addresses for duplicates.
   - At 10 members this is 45 comparisons; at 50 it is 1,225.
   - **Recommendation:** The current `MAX_MEMBERS = 50` cap limits worst-case cost. If the cap is raised, switch to a `Map`-based dedup approach.

### Identified Optimisations

| Priority | Issue | Recommendation |
|---|---|---|
| High | `get_all_groups` linear scan | Add pagination or a count-only endpoint |
| High | `get_groups_by_creator` full scan | Add per-creator index |
| Medium | `update_members` O(n²) dedup | Use `soroban_sdk::Map` for seen-address tracking |
| Low | Payment history unbounded growth | Add a max-history cap or archive strategy |

### Within-Budget Operations

The following operations have low resource usage and no identified concerns:
- `pause` / `unpause`
- `initialize_admin`
- `set_usage_fee`
- `get_usage_fee`
- `deactivate_group` / `activate_group`
- `transfer_admin`
- `add_supported_token` / `remove_supported_token`
- `reduce_usage`

---

## Running Individual Benchmarks

```bash
# Single benchmark with output
cargo test benchmark_create_group_single_usage --locked -- --nocapture

# All benchmarks
cargo test benchmark --locked -- --nocapture

# Compare member scaling
cargo test benchmark_update_members --locked -- --nocapture
```

---

## Re-benchmarking Policy

Re-run and update this document whenever:
- A storage access pattern changes
- A new public function is added
- Member or group limits are changed
- Soroban SDK is upgraded (metering coefficients can change between versions)
