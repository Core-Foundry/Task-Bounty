# TaskBounty Contract API Reference

This document covers every public method, type, error, and event in the TaskBounty Soroban smart contract.

## Table of Contents

- [Types](#types)
  - [Task](#task)
  - [Submission](#submission)
  - [Dispute](#dispute)
  - [TaskStatus](#taskstatus)
  - [SubmissionStatus](#submissionstatus)
  - [Error](#error)
- [Methods](#methods)
  - [initialize](#initialize)
  - [create_task](#create_task)
  - [submit_work](#submit_work)
  - [approve_submission](#approve_submission)
  - [reject_submission](#reject_submission)
  - [cancel_task](#cancel_task)
  - [raise_dispute](#raise_dispute)
  - [get_task](#get_task)
  - [get_submission](#get_submission)
  - [get_task_submissions](#get_task_submissions)
  - [get_total_tasks](#get_total_tasks)
  - [get_total_submissions](#get_total_submissions)
  - [has_submitted](#has_submitted)
- [Events](#events)
- [CLI Examples](#cli-examples)
- [Rust Client Examples](#rust-client-examples)

---

## Types

### Task

```rust
pub struct Task {
    pub id: u64,                  // Auto-assigned task ID (starts at 1)
    pub poster: Address,          // Account that created the task
    pub title: String,            // Short task title
    pub description: String,      // Full task requirements
    pub token: Address,           // Token contract address used for reward
    pub reward: i128,             // Reward amount in token's smallest unit (7 decimals for XLM)
    pub deadline: u64,            // Unix timestamp — task expires after this
    pub max_submissions: u32,     // Maximum concurrent submissions allowed
    pub submission_count: u32,    // Number of submissions received so far
    pub status: TaskStatus,       // Current task state
    pub created_at: u64,          // Unix timestamp when task was created
}
```

### Submission

```rust
pub struct Submission {
    pub id: u64,                  // Auto-assigned submission ID (starts at 1)
    pub task_id: u64,             // ID of the task this submission is for
    pub contributor: Address,     // Account that submitted the work
    pub work_url: String,         // URL to the work (IPFS, Arweave, GitHub, etc.)
    pub description: String,      // Description of the work done
    pub submitted_at: u64,        // Unix timestamp when submitted
    pub status: SubmissionStatus, // Current submission state
}
```

### Dispute

```rust
pub struct Dispute {
    pub id: u64,          // Auto-assigned dispute ID
    pub task_id: u64,     // ID of the disputed task
    pub submission_id: u64, // ID of the disputed submission
    pub raiser: Address,  // Account that raised the dispute (poster or contributor)
    pub reason: String,   // Reason for the dispute
    pub created_at: u64,  // Unix timestamp when dispute was created
}
```

### TaskStatus

```rust
pub enum TaskStatus {
    Open,        // Task created, accepting submissions
    InProgress,  // At least one submission received
    Completed,   // A submission was approved and reward paid out
    Cancelled,   // Task cancelled by poster, reward refunded
    Disputed,    // An active dispute is open on this task
}
```

State transitions:

```
Open → InProgress   (first submit_work)
InProgress → Completed  (approve_submission)
InProgress → Cancelled  (cancel_task, if no approved submissions)
Open / InProgress → Disputed  (raise_dispute)
Open / InProgress → Cancelled  (cancel_task)
```

### SubmissionStatus

```rust
pub enum SubmissionStatus {
    Pending,   // Awaiting review by poster
    Approved,  // Approved; reward transferred to contributor
    Rejected,  // Rejected by poster
}
```

### Error

All errors are returned as `u32` panic codes via `panic_with_error!`.

| Code | Name | When thrown |
|------|------|-------------|
| 1 | `TaskNotFound` | Task ID does not exist |
| 2 | `SubmissionNotFound` | Submission ID does not exist |
| 3 | `Unauthorized` | Caller is not the expected account (e.g. poster) |
| 4 | `TaskExpired` | Task deadline has passed |
| 5 | `InvalidTaskStatus` | Operation not allowed in current task state |
| 6 | `InvalidSubmissionStatus` | Operation not allowed in current submission state |
| 7 | `InsufficientReward` | Reward below minimum (0.1 XLM / 1,000,000 stroops) |
| 8 | `InvalidDeadline` | Deadline is in the past or more than 365 days away |
| 9 | `InvalidMaxSubmissions` | `max_submissions` is 0 |
| 10 | `AlreadySubmitted` | Contributor already submitted to this task |
| 11 | `MaxSubmissionsReached` | Task has reached its submission cap |
| 12 | `PaymentFailed` | Token transfer failed |
| 13 | `DisputeAlreadyExists` | A dispute already exists for this submission |

---

## Methods

### initialize

One-time setup. Must be called once after deployment before any other function.

```rust
pub fn initialize(env: Env, dispute_resolver: Address, admin: Address)
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `dispute_resolver` | `Address` | Address of the DisputeResolver contract |
| `admin` | `Address` | Address of the contract administrator |

**Auth required:** None (one-time setup)

**Errors:** Panics if called more than once.

---

### create_task

Creates a new task and escrows the reward into the contract.

```rust
pub fn create_task(
    env: Env,
    poster: Address,
    title: String,
    description: String,
    token: Address,
    reward: i128,
    deadline: u64,
    max_submissions: u32,
) -> u64
```

**Parameters:**

| Name | Type | Constraints | Description |
|------|------|-------------|-------------|
| `poster` | `Address` | Must sign the tx | Task creator |
| `title` | `String` | — | Short task title |
| `description` | `String` | — | Full task requirements |
| `token` | `Address` | Valid SAC or XLM token | Token used for reward |
| `reward` | `i128` | ≥ 1,000,000 (0.1 XLM) | Amount in token's smallest unit |
| `deadline` | `u64` | `now < deadline ≤ now + 365 days` | Unix timestamp |
| `max_submissions` | `u32` | ≥ 1 | Max concurrent submissions |

**Returns:** `u64` — the new task ID.

**Auth required:** `poster.require_auth()`

**Side effects:**
- Transfers `reward` from `poster` to contract (escrow)
- Emits `TaskCreated` event

**Errors:** `InsufficientReward`, `InvalidDeadline`, `InvalidMaxSubmissions`

---

### submit_work

Submits work for a task. Each contributor may submit once per task.

```rust
pub fn submit_work(
    env: Env,
    task_id: u64,
    contributor: Address,
    work_url: String,
    description: String,
) -> u64
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `task_id` | `u64` | ID of the target task |
| `contributor` | `Address` | Account submitting the work |
| `work_url` | `String` | URL to the work (IPFS, Arweave, GitHub, etc.) |
| `description` | `String` | Description of what was done |

**Returns:** `u64` — the new submission ID.

**Auth required:** `contributor.require_auth()`

**Side effects:**
- Moves task status from `Open` → `InProgress` on first submission
- Increments `task.submission_count`
- Emits `WorkSubmitted` event

**Errors:** `TaskNotFound`, `InvalidTaskStatus`, `TaskExpired`, `AlreadySubmitted`, `MaxSubmissionsReached`

---

### approve_submission

Approves a pending submission and immediately transfers the reward to the contributor.

```rust
pub fn approve_submission(
    env: Env,
    task_id: u64,
    submission_id: u64,
    poster: Address,
)
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `task_id` | `u64` | ID of the task |
| `submission_id` | `u64` | ID of the submission to approve |
| `poster` | `Address` | Task poster (must match `task.poster`) |

**Auth required:** `poster.require_auth()`

**Side effects:**
- Sets submission status → `Approved`
- Sets task status → `Completed`
- Transfers `task.reward` from contract to `submission.contributor`
- Emits `SubmissionApproved` event

**Errors:** `TaskNotFound`, `SubmissionNotFound`, `Unauthorized`, `InvalidSubmissionStatus`, `InvalidTaskStatus`

**Note:** Cannot approve if there is an active dispute on that submission.

---

### reject_submission

Rejects a pending submission. The task stays open for further submissions.

```rust
pub fn reject_submission(
    env: Env,
    task_id: u64,
    submission_id: u64,
    poster: Address,
    reason: String,
)
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `task_id` | `u64` | ID of the task |
| `submission_id` | `u64` | ID of the submission to reject |
| `poster` | `Address` | Task poster (must match `task.poster`) |
| `reason` | `String` | Reason for rejection |

**Auth required:** `poster.require_auth()`

**Side effects:**
- Sets submission status → `Rejected`
- Emits `SubmissionRejected` event

**Errors:** `TaskNotFound`, `SubmissionNotFound`, `Unauthorized`, `InvalidSubmissionStatus`

---

### cancel_task

Cancels a task and refunds the escrowed reward to the poster.

```rust
pub fn cancel_task(env: Env, task_id: u64, poster: Address)
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `task_id` | `u64` | ID of the task to cancel |
| `poster` | `Address` | Task poster (must match `task.poster`) |

**Auth required:** `poster.require_auth()`

**Side effects:**
- Sets task status → `Cancelled`
- Transfers `task.reward` from contract back to `poster`
- Emits `TaskCancelled` event

**Errors:** `TaskNotFound`, `Unauthorized`, `InvalidTaskStatus`

**Note:** Cannot cancel a task that is already `Completed` or `Cancelled`. Also blocked if any submission has been approved.

---

### raise_dispute

Raises a dispute on a pending or rejected submission. Either the poster or contributor may raise a dispute.

```rust
pub fn raise_dispute(
    env: Env,
    task_id: u64,
    submission_id: u64,
    raiser: Address,
    reason: String,
)
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `task_id` | `u64` | ID of the task |
| `submission_id` | `u64` | ID of the submission in dispute |
| `raiser` | `Address` | Account raising the dispute (poster or contributor) |
| `reason` | `String` | Reason for the dispute |

**Auth required:** `raiser.require_auth()`

**Side effects:**
- Sets task status → `Disputed`
- Creates and stores a `Dispute` record
- Emits `DisputeRaised` event

**Errors:** `TaskNotFound`, `SubmissionNotFound`, `Unauthorized`, `InvalidSubmissionStatus`, `DisputeAlreadyExists`

---

### get_task

Returns full task details.

```rust
pub fn get_task(env: Env, task_id: u64) -> Task
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `task_id` | `u64` | ID of the task |

**Returns:** `Task` struct.

**Errors:** Panics with `TaskNotFound` if not found.

---

### get_submission

Returns full submission details.

```rust
pub fn get_submission(env: Env, submission_id: u64) -> Submission
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `submission_id` | `u64` | ID of the submission |

**Returns:** `Submission` struct.

**Errors:** Panics with `SubmissionNotFound` if not found.

---

### get_task_submissions

Returns all submission IDs for a given task.

```rust
pub fn get_task_submissions(env: Env, task_id: u64) -> Vec<u64>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `task_id` | `u64` | ID of the task |

**Returns:** `Vec<u64>` — list of submission IDs. Empty if no submissions.

---

### get_total_tasks

Returns the total number of tasks ever created.

```rust
pub fn get_total_tasks(env: Env) -> u64
```

**Returns:** `u64` — task counter value.

---

### get_total_submissions

Returns the total number of submissions ever created.

```rust
pub fn get_total_submissions(env: Env) -> u64
```

**Returns:** `u64` — submission counter value.

---

### has_submitted

Checks whether a contributor has already submitted to a given task.

```rust
pub fn has_submitted(env: Env, task_id: u64, contributor: Address) -> bool
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `task_id` | `u64` | ID of the task |
| `contributor` | `Address` | Address to check |

**Returns:** `bool` — `true` if contributor has an existing submission for this task.

---

## Events

All events are emitted with two-symbol topics and a tuple payload.

### TaskCreated

Emitted when a new task is created.

- **Topics:** `("task", "created")`
- **Data:** `(task_id: u64, poster: Address, title: String, reward: i128, deadline: u64)`

### WorkSubmitted

Emitted when a contributor submits work.

- **Topics:** `("work", "submit")`
- **Data:** `(task_id: u64, submission_id: u64, contributor: Address, work_url: String)`

### SubmissionApproved

Emitted when a submission is approved and reward is paid.

- **Topics:** `("sub", "approved")`
- **Data:** `(task_id: u64, submission_id: u64, contributor: Address, reward: i128)`

### SubmissionRejected

Emitted when a submission is rejected.

- **Topics:** `("sub", "rejected")`
- **Data:** `(task_id: u64, submission_id: u64, contributor: Address)`

### TaskCancelled

Emitted when a task is cancelled and reward refunded.

- **Topics:** `("task", "cancel")`
- **Data:** `(task_id: u64, poster: Address)`

### DisputeRaised

Emitted when a dispute is opened.

- **Topics:** `("dispute", "raised")`
- **Data:** `(task_id: u64, submission_id: u64, raiser: Address, reason: String)`

---

## CLI Examples

Replace `<CONTRACT_ID>`, `<KEY>`, `<ADDRESS>` with your values.

```bash
# Initialize
stellar contract invoke --id <CONTRACT_ID> --source <KEY> --network testnet \
  -- initialize \
  --dispute_resolver <DISPUTE_RESOLVER_ADDRESS> \
  --admin <ADMIN_ADDRESS>

# Create a task (100 XLM = 1_000_000_000 stroops, deadline ~30 days from now)
stellar contract invoke --id <CONTRACT_ID> --source <KEY> --network testnet \
  -- create_task \
  --poster <POSTER_ADDRESS> \
  --title "Build a DEX interface" \
  --description "Create a React frontend for Stellar DEX with swap UI" \
  --token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC \
  --reward 1000000000 \
  --deadline 1780000000 \
  --max_submissions 3

# Submit work
stellar contract invoke --id <CONTRACT_ID> --source <KEY> --network testnet \
  -- submit_work \
  --task_id 1 \
  --contributor <CONTRIBUTOR_ADDRESS> \
  --work_url "ipfs://QmXxxx..." \
  --description "Completed DEX UI with all required swap features"

# Approve submission
stellar contract invoke --id <CONTRACT_ID> --source <KEY> --network testnet \
  -- approve_submission \
  --task_id 1 \
  --submission_id 1 \
  --poster <POSTER_ADDRESS>

# Reject submission
stellar contract invoke --id <CONTRACT_ID> --source <KEY> --network testnet \
  -- reject_submission \
  --task_id 1 \
  --submission_id 1 \
  --poster <POSTER_ADDRESS> \
  --reason "Missing mobile responsive layout"

# Cancel task
stellar contract invoke --id <CONTRACT_ID> --source <KEY> --network testnet \
  -- cancel_task \
  --task_id 1 \
  --poster <POSTER_ADDRESS>

# Raise dispute
stellar contract invoke --id <CONTRACT_ID> --source <KEY> --network testnet \
  -- raise_dispute \
  --task_id 1 \
  --submission_id 1 \
  --raiser <CONTRIBUTOR_ADDRESS> \
  --reason "Work meets all stated requirements, rejection was unjustified"

# Read task
stellar contract invoke --id <CONTRACT_ID> --source <KEY> --network testnet \
  -- get_task --task_id 1

# Read submission
stellar contract invoke --id <CONTRACT_ID> --source <KEY> --network testnet \
  -- get_submission --submission_id 1

# List submission IDs for a task
stellar contract invoke --id <CONTRACT_ID> --source <KEY> --network testnet \
  -- get_task_submissions --task_id 1

# Check if contributor has submitted
stellar contract invoke --id <CONTRACT_ID> --source <KEY> --network testnet \
  -- has_submitted --task_id 1 --contributor <CONTRIBUTOR_ADDRESS>
```

---

## Rust Client Examples

```rust
use soroban_sdk::{Address, Env, String};

let client = TaskBountyContractClient::new(&env, &contract_id);

// Initialize
client.initialize(&dispute_resolver, &admin);

// Create a task — reward is in stroops (1 XLM = 10_000_000 stroops)
let task_id = client.create_task(
    &poster,
    &String::from_str(&env, "Build DEX interface"),
    &String::from_str(&env, "Create a React frontend for Stellar DEX"),
    &xlm_token,
    &1_000_000_000_i128,  // 100 XLM
    &(env.ledger().timestamp() + 2_592_000),  // 30 days
    &3_u32,
);

// Submit work
let submission_id = client.submit_work(
    &task_id,
    &contributor,
    &String::from_str(&env, "ipfs://QmXxxx..."),
    &String::from_str(&env, "Completed all requirements"),
);

// Approve and pay
client.approve_submission(&task_id, &submission_id, &poster);

// Reject
client.reject_submission(
    &task_id,
    &submission_id,
    &poster,
    &String::from_str(&env, "Needs responsive design fixes"),
);

// Cancel
client.cancel_task(&task_id, &poster);

// Dispute
client.raise_dispute(
    &task_id,
    &submission_id,
    &contributor,
    &String::from_str(&env, "Work fully meets requirements"),
);

// Read
let task = client.get_task(&task_id);
let submission = client.get_submission(&submission_id);
let submissions: Vec<u64> = client.get_task_submissions(&task_id);
let total = client.get_total_tasks();
let already_submitted: bool = client.has_submitted(&task_id, &contributor);
```

---

## Token Decimals

Stellar tokens use **7 decimal places**. To express an amount in "whole" tokens, multiply by `10_000_000`.

| Human amount | Stroop value |
|---|---|
| 0.1 XLM (minimum reward) | `1_000_000` |
| 1 XLM | `10_000_000` |
| 100 XLM | `1_000_000_000` |
| 1,000 XLM | `10_000_000_000` |
