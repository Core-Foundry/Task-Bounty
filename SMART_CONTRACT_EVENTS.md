# Smart Contract Events

This document lists the smart contract events emitted by the contracts in this
repository, what each event means, and the shape of the payload off-chain
indexers should expect.

## Soroban Event Conventions

The active Soroban contract under `contract/contracts/hello-world` uses typed
events from `soroban_sdk::contractevent`.

- Fields marked with `#[topic]` are event topics and should be used for
  filtering/indexing.
- Non-topic fields are event data.
- Events declared with `data_format = "single-value"` encode non-topic fields as
  a single value. In this contract, that single value is the remaining non-topic
  field.
- Empty event structs publish no custom data beyond their event identity.

## AutoShare Contract Events

Source: `contract/contracts/hello-world/src/base/events.rs`

### AutoshareCreated

Emitted when a creator creates a new AutoShare group and pays for its initial
usage allocation.

Emitted by:
- `create`

Payload:

| Field | Type | Indexed topic | Description |
|---|---|---:|---|
| `creator` | `Address` | Yes | Account that created and paid for the AutoShare group. |
| `id` | `BytesN<32>` | No | Unique group identifier. |

Example:

```rust
AutoshareCreated {
    creator: creator.clone(),
    id: id.clone(),
}.publish(&env);
```

Example decoded event:

```text
event: AutoshareCreated
topics: creator = G...
data: id = 0x7f3a...c021
```

### AutoshareUpdated

Emitted when a group creator replaces the member list and the new member
percentages pass validation.

Emitted by:
- `update_members`

Payload:

| Field | Type | Indexed topic | Description |
|---|---|---:|---|
| `updater` | `Address` | Yes | Group creator that updated the member allocation. |
| `id` | `BytesN<32>` | No | Group identifier that was updated. |

Example:

```rust
AutoshareUpdated {
    updater: caller.clone(),
    id: id.clone(),
}.publish(&env);
```

Example decoded event:

```text
event: AutoshareUpdated
topics: updater = G...
data: id = 0x7f3a...c021
```

### GroupDeactivated

Emitted when a group creator marks an active AutoShare group as inactive.

Emitted by:
- `deactivate_group`

Payload:

| Field | Type | Indexed topic | Description |
|---|---|---:|---|
| `creator` | `Address` | Yes | Group creator that deactivated the group. |
| `id` | `BytesN<32>` | No | Group identifier that was deactivated. |

Example:

```rust
GroupDeactivated {
    creator: caller.clone(),
    id: id.clone(),
}.publish(&env);
```

Example decoded event:

```text
event: GroupDeactivated
topics: creator = G...
data: id = 0x7f3a...c021
```

### GroupActivated

Emitted when a group creator reactivates an inactive AutoShare group.

Emitted by:
- `activate_group`

Payload:

| Field | Type | Indexed topic | Description |
|---|---|---:|---|
| `creator` | `Address` | Yes | Group creator that reactivated the group. |
| `id` | `BytesN<32>` | No | Group identifier that was reactivated. |

Example:

```rust
GroupActivated {
    creator: caller.clone(),
    id: id.clone(),
}.publish(&env);
```

Example decoded event:

```text
event: GroupActivated
topics: creator = G...
data: id = 0x7f3a...c021
```

### AdminTransferred

Emitted when the current admin transfers administrative control to a new admin.

Emitted by:
- `transfer_admin`

Payload:

| Field | Type | Indexed topic | Description |
|---|---|---:|---|
| `old_admin` | `Address` | Yes | Admin account that authorized the transfer. |
| `new_admin` | `Address` | No | Account receiving admin rights. |

Example:

```rust
AdminTransferred {
    old_admin: current_admin.clone(),
    new_admin: new_admin.clone(),
}.publish(&env);
```

Example decoded event:

```text
event: AdminTransferred
topics: old_admin = G...
data: new_admin = G...
```

### ContractPaused

Emitted when the admin pauses state-changing user operations.

Emitted by:
- `pause`

Payload:

| Field | Type | Indexed topic | Description |
|---|---|---:|---|
| _none_ | _none_ | No | This event has no custom fields. |

Example:

```rust
ContractPaused {}.publish(&env);
```

Example decoded event:

```text
event: ContractPaused
topics: none
data: none
```

### ContractUnpaused

Emitted when the admin resumes state-changing user operations after a pause.

Emitted by:
- `unpause`

Payload:

| Field | Type | Indexed topic | Description |
|---|---|---:|---|
| _none_ | _none_ | No | This event has no custom fields. |

Example:

```rust
ContractUnpaused {}.publish(&env);
```

Example decoded event:

```text
event: ContractUnpaused
topics: none
data: none
```

### Withdrawal

Emitted when the admin withdraws tokens from the contract balance to a
recipient.

Emitted by:
- `withdraw`

Payload:

| Field | Type | Indexed topic | Description |
|---|---|---:|---|
| `token` | `Address` | Yes | Token contract address being withdrawn. |
| `recipient` | `Address` | Yes | Account receiving the withdrawn tokens. |
| `amount` | `i128` | No | Amount withdrawn in the token's smallest unit. |

Example:

```rust
Withdrawal {
    token: token.clone(),
    recipient: recipient.clone(),
    amount,
}.publish(&env);
```

Example decoded event:

```text
event: Withdrawal
topics: token = C..., recipient = G...
data: amount = 10000000
```

## TaskBounty Reference Events

The reference TaskBounty implementation under `Documents/Task Bounty/src` emits
events through `env.events().publish(...)` with two symbol topics and tuple
payloads.

### TaskCreated

Emitted when a new bounty task is created and its reward is escrowed.

Topics:

```rust
(symbol_short!("task"), symbol_short!("created"))
```

Payload:

| Position | Field | Type | Description |
|---:|---|---|---|
| 0 | `task_id` | `u64` | New task identifier. |
| 1 | `poster` | `Address` | Task creator. |
| 2 | `title` | `String` | Task title. |
| 3 | `reward` | `i128` | Escrowed reward amount. |
| 4 | `deadline` | `u64` | Unix timestamp when submissions expire. |

Example:

```text
topics: ("task", "created")
data: (1, G..., "Build DEX interface", 1000000000, 1780000000)
```

### WorkSubmitted

Emitted when a contributor submits work for an open task.

Topics:

```rust
(symbol_short!("work"), symbol_short!("submit"))
```

Payload:

| Position | Field | Type | Description |
|---:|---|---|---|
| 0 | `task_id` | `u64` | Task receiving the submission. |
| 1 | `submission_id` | `u64` | New submission identifier. |
| 2 | `contributor` | `Address` | Account that submitted the work. |
| 3 | `work_url` | `String` | Link to submitted work. |

Example:

```text
topics: ("work", "submit")
data: (1, 1, G..., "ipfs://QmXxxx...")
```

### SubmissionApproved

Emitted when the poster approves a submission and the reward is paid to the
contributor.

Topics:

```rust
(symbol_short!("sub"), symbol_short!("approved"))
```

Payload:

| Position | Field | Type | Description |
|---:|---|---|---|
| 0 | `task_id` | `u64` | Approved task identifier. |
| 1 | `submission_id` | `u64` | Approved submission identifier. |
| 2 | `contributor` | `Address` | Contributor receiving the reward. |
| 3 | `reward` | `i128` | Reward amount paid. |

Example:

```text
topics: ("sub", "approved")
data: (1, 1, G..., 1000000000)
```

### SubmissionRejected

Emitted when the poster rejects a pending submission.

Topics:

```rust
(symbol_short!("sub"), symbol_short!("rejected"))
```

Payload:

| Position | Field | Type | Description |
|---:|---|---|---|
| 0 | `task_id` | `u64` | Task identifier. |
| 1 | `submission_id` | `u64` | Rejected submission identifier. |
| 2 | `contributor` | `Address` | Contributor whose submission was rejected. |

Example:

```text
topics: ("sub", "rejected")
data: (1, 1, G...)
```

### TaskCancelled

Emitted when a poster cancels a task and the escrowed reward is refunded.

Topics:

```rust
(symbol_short!("task"), symbol_short!("cancel"))
```

Payload:

| Position | Field | Type | Description |
|---:|---|---|---|
| 0 | `task_id` | `u64` | Cancelled task identifier. |
| 1 | `poster` | `Address` | Poster receiving the refund. |

Example:

```text
topics: ("task", "cancel")
data: (1, G...)
```

### DisputeRaised

Emitted when the poster or contributor opens a dispute for a submission.

Topics:

```rust
(symbol_short!("dispute"), symbol_short!("raised"))
```

Payload:

| Position | Field | Type | Description |
|---:|---|---|---|
| 0 | `task_id` | `u64` | Disputed task identifier. |
| 1 | `submission_id` | `u64` | Disputed submission identifier. |
| 2 | `raiser` | `Address` | Poster or contributor that raised the dispute. |
| 3 | `reason` | `String` | Human-readable dispute reason. |

Example:

```text
topics: ("dispute", "raised")
data: (1, 1, G..., "Work meets all stated requirements")
```

