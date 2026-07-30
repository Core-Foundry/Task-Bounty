# Task Endpoints API Documentation

This document covers every task-related endpoint in the TaskBounty platform — both the
**Next.js REST API routes** served by the frontend and the **Soroban smart contract
methods** invoked via the Stellar RPC.

## Table of Contents

- [Base URLs](#base-urls)
- [REST API Endpoints](#rest-api-endpoints)
  - [GET /api/health](#get-apihealth)
  - [POST /api/task-submissions/validate](#post-apitask-submissionsvalidate)
- [Smart Contract Task Methods](#smart-contract-task-methods)
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
- [Data Types](#data-types)
- [Error Codes](#error-codes)
- [Events](#events)
- [Token Amounts](#token-amounts)

---

## Base URLs

| Environment | REST API base URL |
|-------------|------------------|
| Local dev   | `http://localhost:3000` |
| Production  | `https://<your-deployment-domain>` |

Smart contract calls go through the Stellar RPC:

| Network  | RPC URL |
|----------|---------|
| Testnet  | `https://soroban-testnet.stellar.org` |
| Mainnet  | `https://mainnet.stellar.validationcloud.io/v1/<key>` |

---

## REST API Endpoints

### GET /api/health

Returns the current liveness status of the frontend service. The response is never
cached and always reflects the live process.

**Request**

```
GET /api/health
```

No parameters, headers, or body required.

**Response — 200 OK**

```json
{
  "status": "ok",
  "service": "taskbounty-frontend",
  "timestamp": "2026-07-18T15:00:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | `string` | Always `"ok"` when the app can serve requests |
| `service` | `string` | Service identifier — `"taskbounty-frontend"` |
| `timestamp` | `string` | ISO-8601 timestamp when the report was generated |
| `uptime` | `number` | Seconds the Node.js process has been running (never negative) |
| `environment` | `string` | Node environment: `"development"`, `"production"`, or `"test"` |

**Sample request (curl)**

```bash
curl https://<your-domain>/api/health
```

**Sample response**

```json
{
  "status": "ok",
  "service": "taskbounty-frontend",
  "timestamp": "2026-07-18T15:00:00.000Z",
  "uptime": 7200,
  "environment": "production"
}
```

---

### POST /api/task-submissions/validate

Validates one or more task submission files uploaded as multipart form data.
Checks file count, individual file size, combined total size, filename safety,
allowed extensions, MIME type consistency, and binary content signatures.

**Request**

```
POST /api/task-submissions/validate
Content-Type: multipart/form-data
```

The request body must be `multipart/form-data`. Each file is attached as a separate
form field. Non-file fields are ignored.

**File constraints**

| Constraint | Limit |
|------------|-------|
| Maximum files per request | 5 |
| Maximum size per file | 10 MiB |
| Maximum combined size | 25 MiB |
| Maximum filename length | 120 characters |

**Allowed file types**

| Extension(s) | MIME type(s) |
|---|---|
| `.pdf` | `application/pdf` |
| `.zip` | `application/zip`, `application/x-zip-compressed` |
| `.png` | `image/png` |
| `.jpg`, `.jpeg` | `image/jpeg` |
| `.webp` | `image/webp` |
| `.txt` | `text/plain` |
| `.md`, `.markdown` | `text/markdown`, `text/plain` |
| `.json` | `application/json`, `text/json`, `text/plain` |

**Response — 200 OK** (all files pass validation)

```json
{
  "ok": true,
  "files": [
    {
      "name": "submission.pdf",
      "size": 8192,
      "extension": "pdf",
      "kind": "pdf",
      "providedMimeType": "application/pdf",
      "detectedMimeType": "application/pdf"
    }
  ],
  "totalSize": 8192,
  "limits": {
    "maxFiles": 5,
    "maxFileSizeBytes": 10485760,
    "maxTotalSizeBytes": 26214400
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `ok` | `boolean` | `true` on success |
| `files` | `array` | Validated file metadata (one entry per file) |
| `files[].name` | `string` | Normalized filename |
| `files[].size` | `number` | File size in bytes |
| `files[].extension` | `string` | Lowercase extension without the dot |
| `files[].kind` | `string` | Detected file kind (`pdf`, `zip`, `png`, etc.) |
| `files[].providedMimeType` | `string` | MIME type declared by the browser |
| `files[].detectedMimeType` | `string` | Canonical MIME type detected from content |
| `totalSize` | `number` | Combined size of all files in bytes |
| `limits` | `object` | Active upload limits echoed back to the client |

**Error response format (JSON)**

All REST API endpoints in this project return JSON with the following top-level fields:

- `ok` (boolean): `true` for success, `false` for errors
- `error` (string): short human-readable summary
- `details` (string[]): optional list of validation-specific messages
- `limits` (object): optional object describing relevant request limits

This format is currently implemented for:
- `POST /api/task-submissions/validate`

---

**Response — 400 Bad Request** (invalid input)

When one or more file validation checks fail (extension blocked, MIME/content mismatch, empty file, invalid filename, etc.).

```json
{
  "ok": false,
  "error": "File name contains invalid characters. Please rename your file.",
  "details": [
    "File name contains invalid characters. Please rename your file."
  ],
  "limits": {
    "maxFiles": 5,
    "maxFileSizeBytes": 10485760,
    "maxTotalSizeBytes": 26214400
  }
}
```

**Response — 400 Bad Request** (malformed body)

When the server cannot parse the request body as `multipart/form-data`.

```json
{
  "ok": false,
  "error": "Please upload files using a valid form."
}
```

**Response — 413 Content Too Large** (size limits exceeded)

When file-count limits, per-file limits, or total combined size limits are exceeded.

```json
{
  "ok": false,
  "error": "Total file size too large. Max combined size: 25 MB.",
  "details": [
    "Total file size too large. Max combined size: 25 MB."
  ],
  "limits": {
    "maxFiles": 5,
    "maxFileSizeBytes": 10485760,
    "maxTotalSizeBytes": 26214400
  }
}
```

**Sample request (curl)**

```bash
curl -X POST https://<your-domain>/api/task-submissions/validate \
  -F "file=@./submission.pdf" \
  -F "file=@./proof.png"
```

**Sample request (JavaScript fetch)**

```js
const formData = new FormData();
formData.append("file", pdfFile);
formData.append("file", proofImage);

const response = await fetch("/api/task-submissions/validate", {
  method: "POST",
  body: formData,
});

const result = await response.json();

if (result.ok) {
  console.log("Files accepted:", result.files);
} else {
  console.error("Validation failed:", result.details);
}
```

---

## Smart Contract Task Methods

All contract methods are invoked via the Stellar RPC using the `stellar contract invoke`
CLI or a Soroban SDK client. Replace `<CONTRACT_ID>` and `<KEY>` with your values.

---

### create_task

Creates a new task and escrows the reward into the contract.

**Signature**

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

**Parameters**

| Name | Type | Required | Constraints | Description |
|------|------|----------|-------------|-------------|
| `poster` | `Address` | Yes | Must sign the transaction | Task creator |
| `title` | `String` | Yes | — | Short task title |
| `description` | `String` | Yes | — | Full task requirements |
| `token` | `Address` | Yes | Valid SAC or XLM token address | Token used for the reward |
| `reward` | `i128` | Yes | ≥ 1,000,000 stroops (0.1 XLM) | Reward amount in token's smallest unit |
| `deadline` | `u64` | Yes | `now < deadline ≤ now + 365 days` | Unix timestamp when task expires |
| `max_submissions` | `u32` | Yes | ≥ 1 | Maximum concurrent submissions allowed |

**Returns:** `u64` — the new task ID.

**Auth required:** `poster.require_auth()`

**Side effects**
- Transfers `reward` from `poster` to contract (escrow)
- Emits `TaskCreated` event

**Errors:** `InsufficientReward`, `InvalidDeadline`, `InvalidMaxSubmissions`

**CLI example**

```bash
stellar contract invoke --id <CONTRACT_ID> --source <KEY> --network testnet \
  -- create_task \
  --poster GABCDE...XYZ \
  --title "Build a DEX interface" \
  --description "Create a React frontend for Stellar DEX with swap UI" \
  --token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC \
  --reward 1000000000 \
  --deadline 1780000000 \
  --max_submissions 3
```

**Rust client example**

```rust
let task_id = client.create_task(
    &poster,
    &String::from_str(&env, "Build a DEX interface"),
    &String::from_str(&env, "Create a React frontend for Stellar DEX with swap UI"),
    &xlm_token,
    &1_000_000_000_i128,   // 100 XLM
    &(env.ledger().timestamp() + 2_592_000),  // 30 days from now
    &3_u32,
);
```

---

### submit_work

Submits work for an open task. Each contributor may submit once per task.

**Signature**

```rust
pub fn submit_work(
    env: Env,
    task_id: u64,
    contributor: Address,
    work_url: String,
    description: String,
) -> u64
```

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `task_id` | `u64` | Yes | ID of the target task |
| `contributor` | `Address` | Yes | Account submitting the work |
| `work_url` | `String` | Yes | URL to the work (IPFS, Arweave, GitHub, etc.) |
| `description` | `String` | Yes | Summary of the work done |

**Returns:** `u64` — the new submission ID.

**Auth required:** `contributor.require_auth()`

**Side effects**
- Moves task status `Open` → `InProgress` on the first submission
- Increments `task.submission_count`
- Emits `WorkSubmitted` event

**Errors:** `TaskNotFound`, `InvalidTaskStatus`, `TaskExpired`, `AlreadySubmitted`, `MaxSubmissionsReached`

**CLI example**

```bash
stellar contract invoke --id <CONTRACT_ID> --source <KEY> --network testnet \
  -- submit_work \
  --task_id 1 \
  --contributor GABCDE...XYZ \
  --work_url "ipfs://QmXxxx..." \
  --description "Completed DEX UI with all required swap features"
```

**Rust client example**

```rust
let submission_id = client.submit_work(
    &task_id,
    &contributor,
    &String::from_str(&env, "ipfs://QmXxxx..."),
    &String::from_str(&env, "Completed all requirements"),
);
```

---

### approve_submission

Approves a pending submission and immediately transfers the escrowed reward to the contributor.

**Signature**

```rust
pub fn approve_submission(
    env: Env,
    task_id: u64,
    submission_id: u64,
    poster: Address,
)
```

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `task_id` | `u64` | Yes | ID of the task |
| `submission_id` | `u64` | Yes | ID of the submission to approve |
| `poster` | `Address` | Yes | Task poster — must match `task.poster` |

**Auth required:** `poster.require_auth()`

**Side effects**
- Sets submission status → `Approved`
- Sets task status → `Completed`
- Transfers `task.reward` from contract to `submission.contributor`
- Emits `SubmissionApproved` event

**Errors:** `TaskNotFound`, `SubmissionNotFound`, `Unauthorized`, `InvalidSubmissionStatus`, `InvalidTaskStatus`

> Cannot approve if there is an active dispute on that submission.

**CLI example**

```bash
stellar contract invoke --id <CONTRACT_ID> --source <KEY> --network testnet \
  -- approve_submission \
  --task_id 1 \
  --submission_id 1 \
  --poster GABCDE...XYZ
```

**Rust client example**

```rust
client.approve_submission(&task_id, &submission_id, &poster);
```

---

### reject_submission

Rejects a pending submission. The task remains open for further submissions.

**Signature**

```rust
pub fn reject_submission(
    env: Env,
    task_id: u64,
    submission_id: u64,
    poster: Address,
    reason: String,
)
```

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `task_id` | `u64` | Yes | ID of the task |
| `submission_id` | `u64` | Yes | ID of the submission to reject |
| `poster` | `Address` | Yes | Task poster — must match `task.poster` |
| `reason` | `String` | Yes | Human-readable reason for rejection |

**Auth required:** `poster.require_auth()`

**Side effects**
- Sets submission status → `Rejected`
- Emits `SubmissionRejected` event

**Errors:** `TaskNotFound`, `SubmissionNotFound`, `Unauthorized`, `InvalidSubmissionStatus`

**CLI example**

```bash
stellar contract invoke --id <CONTRACT_ID> --source <KEY> --network testnet \
  -- reject_submission \
  --task_id 1 \
  --submission_id 1 \
  --poster GABCDE...XYZ \
  --reason "Missing mobile responsive layout"
```

**Rust client example**

```rust
client.reject_submission(
    &task_id,
    &submission_id,
    &poster,
    &String::from_str(&env, "Missing mobile responsive layout"),
);
```

---

### cancel_task

Cancels a task and refunds the escrowed reward to the poster.

**Signature**

```rust
pub fn cancel_task(env: Env, task_id: u64, poster: Address)
```

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `task_id` | `u64` | Yes | ID of the task to cancel |
| `poster` | `Address` | Yes | Task poster — must match `task.poster` |

**Auth required:** `poster.require_auth()`

**Side effects**
- Sets task status → `Cancelled`
- Transfers `task.reward` from contract back to `poster`
- Emits `TaskCancelled` event

**Errors:** `TaskNotFound`, `Unauthorized`, `InvalidTaskStatus`

> Cannot cancel a task that is already `Completed` or `Cancelled`, or one that has an approved submission.

**CLI example**

```bash
stellar contract invoke --id <CONTRACT_ID> --source <KEY> --network testnet \
  -- cancel_task \
  --task_id 1 \
  --poster GABCDE...XYZ
```

**Rust client example**

```rust
client.cancel_task(&task_id, &poster);
```

---

### raise_dispute

Raises a dispute on a pending or rejected submission. Either the poster or contributor may raise a dispute.

**Signature**

```rust
pub fn raise_dispute(
    env: Env,
    task_id: u64,
    submission_id: u64,
    raiser: Address,
    reason: String,
)
```

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `task_id` | `u64` | Yes | ID of the task |
| `submission_id` | `u64` | Yes | ID of the submission in dispute |
| `raiser` | `Address` | Yes | Account raising the dispute (poster or contributor) |
| `reason` | `String` | Yes | Reason for the dispute |

**Auth required:** `raiser.require_auth()`

**Side effects**
- Sets task status → `Disputed`
- Creates and stores a `Dispute` record
- Emits `DisputeRaised` event

**Errors:** `TaskNotFound`, `SubmissionNotFound`, `Unauthorized`, `InvalidSubmissionStatus`, `DisputeAlreadyExists`

**CLI example**

```bash
stellar contract invoke --id <CONTRACT_ID> --source <KEY> --network testnet \
  -- raise_dispute \
  --task_id 1 \
  --submission_id 1 \
  --raiser GABCDE...XYZ \
  --reason "Work meets all stated requirements, rejection was unjustified"
```

**Rust client example**

```rust
client.raise_dispute(
    &task_id,
    &submission_id,
    &contributor,
    &String::from_str(&env, "Work meets all stated requirements"),
);
```

---

### get_task

Returns full details for a single task.

**Signature**

```rust
pub fn get_task(env: Env, task_id: u64) -> Task
```

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `task_id` | `u64` | Yes | ID of the task |

**Returns:** [`Task`](#task) struct.

**Errors:** `TaskNotFound`

**CLI example**

```bash
stellar contract invoke --id <CONTRACT_ID> --source <KEY> --network testnet \
  -- get_task --task_id 1
```

**Rust client example**

```rust
let task: Task = client.get_task(&task_id);
println!("{} — reward: {} stroops", task.title, task.reward);
```

---

### get_submission

Returns full details for a single submission.

**Signature**

```rust
pub fn get_submission(env: Env, submission_id: u64) -> Submission
```

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `submission_id` | `u64` | Yes | ID of the submission |

**Returns:** [`Submission`](#submission) struct.

**Errors:** `SubmissionNotFound`

**CLI example**

```bash
stellar contract invoke --id <CONTRACT_ID> --source <KEY> --network testnet \
  -- get_submission --submission_id 1
```

**Rust client example**

```rust
let sub: Submission = client.get_submission(&submission_id);
println!("Work URL: {}", sub.work_url);
```

---

### get_task_submissions

Returns all submission IDs for a given task.

**Signature**

```rust
pub fn get_task_submissions(env: Env, task_id: u64) -> Vec<u64>
```

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `task_id` | `u64` | Yes | ID of the task |

**Returns:** `Vec<u64>` — list of submission IDs. Empty if none exist.

**CLI example**

```bash
stellar contract invoke --id <CONTRACT_ID> --source <KEY> --network testnet \
  -- get_task_submissions --task_id 1
```

**Rust client example**

```rust
let ids: Vec<u64> = client.get_task_submissions(&task_id);
for id in ids.iter() {
    let sub = client.get_submission(id);
    // process each submission
}
```

---

### get_total_tasks

Returns the total number of tasks ever created.

**Signature**

```rust
pub fn get_total_tasks(env: Env) -> u64
```

**Returns:** `u64` — the task counter value.

**CLI example**

```bash
stellar contract invoke --id <CONTRACT_ID> --source <KEY> --network testnet \
  -- get_total_tasks
```

---

### get_total_submissions

Returns the total number of submissions ever created.

**Signature**

```rust
pub fn get_total_submissions(env: Env) -> u64
```

**Returns:** `u64` — the submission counter value.

**CLI example**

```bash
stellar contract invoke --id <CONTRACT_ID> --source <KEY> --network testnet \
  -- get_total_submissions
```

---

### has_submitted

Checks whether a contributor has already submitted to a given task.

**Signature**

```rust
pub fn has_submitted(env: Env, task_id: u64, contributor: Address) -> bool
```

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `task_id` | `u64` | Yes | ID of the task |
| `contributor` | `Address` | Yes | Address to check |

**Returns:** `bool` — `true` if the contributor has an existing submission for this task.

**CLI example**

```bash
stellar contract invoke --id <CONTRACT_ID> --source <KEY> --network testnet \
  -- has_submitted --task_id 1 --contributor GABCDE...XYZ
```

**Rust client example**

```rust
let already: bool = client.has_submitted(&task_id, &contributor);
```

---

## Data Types

### Task

```rust
pub struct Task {
    pub id: u64,               // Auto-assigned task ID (starts at 1)
    pub poster: Address,       // Account that created the task
    pub title: String,         // Short task title
    pub description: String,   // Full task requirements
    pub token: Address,        // Token contract used for reward
    pub reward: i128,          // Reward in token's smallest unit (7 decimals for XLM)
    pub deadline: u64,         // Unix timestamp — task expires after this
    pub max_submissions: u32,  // Maximum concurrent submissions allowed
    pub submission_count: u32, // Submissions received so far
    pub status: TaskStatus,    // Current task state
    pub created_at: u64,       // Unix timestamp when task was created
}
```

### Submission

```rust
pub struct Submission {
    pub id: u64,                  // Auto-assigned submission ID (starts at 1)
    pub task_id: u64,             // ID of the parent task
    pub contributor: Address,     // Account that submitted the work
    pub work_url: String,         // URL to the work (IPFS, Arweave, GitHub, etc.)
    pub description: String,      // Description of the work done
    pub submitted_at: u64,        // Unix timestamp when submitted
    pub status: SubmissionStatus, // Current submission state
}
```

### TaskStatus

```rust
pub enum TaskStatus {
    Open,        // Accepting submissions
    InProgress,  // At least one submission received
    Completed,   // Submission approved and reward paid out
    Cancelled,   // Cancelled by poster, reward refunded
    Disputed,    // An active dispute is open
}
```

**State transitions**

```
Open        → InProgress   (first submit_work call)
InProgress  → Completed    (approve_submission)
Open /
InProgress  → Cancelled    (cancel_task)
Open /
InProgress  → Disputed     (raise_dispute)
```

### SubmissionStatus

```rust
pub enum SubmissionStatus {
    Pending,   // Awaiting review
    Approved,  // Approved; reward transferred to contributor
    Rejected,  // Rejected by poster
}
```

---

## Error Codes

All contract errors are returned as `u32` panic codes via `panic_with_error!`.

| Code | Name | When thrown |
|------|------|-------------|
| 1 | `TaskNotFound` | Task ID does not exist |
| 2 | `SubmissionNotFound` | Submission ID does not exist |
| 3 | `Unauthorized` | Caller is not the expected account |
| 4 | `TaskExpired` | Task deadline has passed |
| 5 | `InvalidTaskStatus` | Operation not allowed in current task state |
| 6 | `InvalidSubmissionStatus` | Operation not allowed in current submission state |
| 7 | `InsufficientReward` | Reward is below the minimum (0.1 XLM / 1,000,000 stroops) |
| 8 | `InvalidDeadline` | Deadline is in the past or more than 365 days away |
| 9 | `InvalidMaxSubmissions` | `max_submissions` is 0 |
| 10 | `AlreadySubmitted` | Contributor already submitted to this task |
| 11 | `MaxSubmissionsReached` | Task has reached its submission cap |
| 12 | `PaymentFailed` | Token transfer failed |
| 13 | `DisputeAlreadyExists` | A dispute already exists for this submission |

---

## Events

All contract events are emitted with two-symbol topics and a tuple payload.

| Event | Topics | Payload |
|-------|--------|---------|
| `TaskCreated` | `("task", "created")` | `(task_id, poster, title, reward, deadline)` |
| `WorkSubmitted` | `("work", "submit")` | `(task_id, submission_id, contributor, work_url)` |
| `SubmissionApproved` | `("sub", "approved")` | `(task_id, submission_id, contributor, reward)` |
| `SubmissionRejected` | `("sub", "rejected")` | `(task_id, submission_id, contributor)` |
| `TaskCancelled` | `("task", "cancel")` | `(task_id, poster)` |
| `DisputeRaised` | `("dispute", "raised")` | `(task_id, submission_id, raiser, reason)` |

For the full event reference including the active AutoShare contract events, see
[SMART_CONTRACT_EVENTS.md](./SMART_CONTRACT_EVENTS.md).

---

## Token Amounts

Stellar tokens use **7 decimal places**. Multiply a human-readable amount by
`10_000_000` to get the stroop value used in contract calls.

| Human amount | Stroop value | Notes |
|---|---|---|
| 0.1 XLM | `1_000_000` | Minimum reward |
| 1 XLM | `10_000_000` | |
| 10 XLM | `100_000_000` | |
| 100 XLM | `1_000_000_000` | |
| 1,000 XLM | `10_000_000_000` | |

For the complete contract API including the `initialize` method and dispute resolver
contract, see [CONTRACT_API.md](./CONTRACT_API.md).
