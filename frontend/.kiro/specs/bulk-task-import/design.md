# Design Document — Bulk Task Import

## Overview

The Bulk Task Import feature adds a `POST /api/tasks/bulk` endpoint that accepts a JSON array of up to 100 task objects, validates every row individually using the existing `taskSchema` and `CreateTaskInput` rules, inserts only the valid rows into the in-memory `Task_Store`, and returns a structured `BulkImportResult` that reports success and failure counts alongside per-row error details.

### Design Goals

- **Zero duplication** — reuse `taskSchema`, `createTask()`, `checkRateLimit()`, and `buildNoStoreJson()` exactly as they exist today.
- **Full-batch feedback** — never stop at the first invalid row; collect all errors across all rows before responding.
- **Consistent HTTP semantics** — 4xx only for structural / rate-limit failures; HTTP 200 for any structurally valid batch regardless of per-row outcome.
- **Store isolation in tests** — every test suite calls `resetTaskWorkflowStore()` in `beforeEach` so the in-memory `Map` is never shared across test runs.

---

## Architecture

The feature sits entirely within the existing Next.js App Router layer and the `src/lib` utility layer. No new infrastructure, databases, queues, or external services are introduced.

```
POST /api/tasks/bulk
        │
        ▼
src/app/api/tasks/bulk/route.ts   ← New route handler
        │
        ├─ checkRateLimit()        ← src/lib/rate-limit.ts  (existing)
        ├─ Content-Type check      ← inline in route handler
        ├─ JSON parse + structural checks
        │
        ▼
src/lib/bulk-task-validation.ts   ← New validation service
        │
        ├─ validateBulkRows()
        │     └─ taskSchema.safeParse() per row  ← src/lib/taskValidation.ts (existing)
        │     └─ poster blank-check per row      ← mirrors validateCreateTaskInput
        │
        └─ insertValidRows()
              └─ createTask() per valid row      ← src/lib/task-workflow.ts (existing)
```

### Data Flow

```
Request body (unknown[])
      │
      ▼ validateBulkRows(rows, now)
┌─────────────────────────────────────────────────┐
│  For each row i:                                 │
│    safeParse(row) → ZodError → field messages    │
│    poster blank-check → poster message           │
│    all messages joined with "; "                 │
│    ──► validRows[]  OR  errors[{ rowIndex, msg}] │
└─────────────────────────────────────────────────┘
      │
      ▼ insertValidRows(validRows, now)
┌─────────────────────────────────────────────────┐
│  For each { index, input } in validRows:         │
│    createTask(input, now)                        │
│    ok  → successCount++                          │
│    !ok → errorCount++, push to errors            │
└─────────────────────────────────────────────────┘
      │
      ▼
BulkImportResult { totalProcessed, successCount, errorCount, errors }
```

---

## Components and Interfaces

### `src/lib/bulk-task-validation.ts` (new)

#### Exported Types

```typescript
export interface BulkRowError {
  rowIndex: number;   // zero-based index in the original input array
  message: string;    // field errors joined by "; "
}

export interface BulkValidationResult {
  validRows: Array<{ index: number; input: CreateTaskInput }>;
  errors: BulkRowError[];
}

export interface BulkImportResult {
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  errors: BulkRowError[];
}
```

#### `validateBulkRows(rows: unknown[], now?: Date): BulkValidationResult`

- Iterates **every** row without early exit.
- For each row:
  1. Calls `taskSchema.safeParse(row)` on the six schema fields (`title`, `description`, `tokenAddress`, `reward`, `deadline`, `maxSubmissions`).
  2. Extracts Zod error messages formatted as `"fieldName: Zod message"` from `ZodError.issues`.
  3. Checks `poster` separately: if `row.poster` trims to an empty string, appends `"poster: Poster address is required"`.
  4. If any messages were collected, pushes `{ rowIndex: i, message: messages.join("; ") }` to `errors`.
  5. Otherwise, pushes `{ index: i, input: validatedInput }` to `validRows`.
- The `now` parameter (defaults to `new Date()`) is threaded through to Zod's deadline refinement so tests can freeze time.
- Returns `{ validRows, errors }`.

**Deadline validation detail:** `taskSchema`'s `deadline` field uses `z.coerce.date()` with a `.refine()` that compares against `Date.now()`. To make this time-injectable for tests, `validateBulkRows` temporarily overrides the refinement by passing the parsed deadline against `now.getTime()` post-parse, OR by patching the schema inline with a new refinement. The simpler approach (and the one used) is to validate deadline range manually after `safeParse` succeeds for the `deadline` field — mirroring the `validateCreateTaskInput` logic in `task-workflow.ts`, which accepts `deadline` as a Unix timestamp in seconds and compares against `Math.floor(now.getTime() / 1000)`. The `taskSchema` uses `z.coerce.date()`, which accepts both ISO strings and Unix ms timestamps, so the row-level validator will accept either format; the route handler passes `new Date()` as `now`.

#### `insertValidRows(validRows: Array<{ index: number; input: CreateTaskInput }>, now?: Date): BulkImportResult`

- Iterates every valid row.
- Calls `createTask(input, now)` for each.
- If `ok: true`, increments `successCount`.
- If `ok: false` (unexpected — input was already validated, but defensive), increments `errorCount` and pushes `{ rowIndex: index, message: result.error }` to `errors`.
- Returns `BulkImportResult` with `totalProcessed = validRows.length + preExistingErrorCount` (note: the route handler computes `totalProcessed` from the original array length and merges validation errors with insertion errors).

> The route handler is responsible for combining `BulkValidationResult.errors` with any insertion errors and computing the final `totalProcessed = rows.length`.

---

### `src/app/api/tasks/bulk/route.ts` (new)

Mirrors `src/app/api/tasks/route.ts` structure exactly.

```
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

POST handler — ordered checks:
  1. checkRateLimit(request)     → 429 if blocked
  2. Content-Type header check   → 415 if not "application/json"
  3. request.json()              → 400 "Request body must be valid JSON." on throw
  4. Array.isArray(body)         → 400 "Request body must be a JSON array." if false
  5. body.length === 0           → 400 "Batch must contain at least 1 row."
  6. body.length > 100           → 400 "Batch size exceeds the maximum of 100 rows."
  7. First non-null-object scan  → 400 "Row {i} is not a valid object." (first offending index)
  8. validateBulkRows(body, new Date())
  9. insertValidRows(validRows, new Date())
 10. Merge validation errors + insertion errors
 11. Return HTTP 200 with BulkImportResult + rate-limit headers
```

**Content-Type check implementation:**

```typescript
const contentType = request.headers.get("content-type") ?? "";
if (!contentType.includes("application/json")) {
  return buildNoStoreJson(
    { ok: false, error: "Content-Type must be application/json." },
    415,
    rateLimitHeaders,
  );
}
```

**Non-object element scan:**

```typescript
for (let i = 0; i < body.length; i++) {
  const el = body[i];
  if (el === null || typeof el !== "object" || Array.isArray(el)) {
    return buildNoStoreJson(
      { ok: false, error: `Row ${i} is not a valid object.` },
      400,
      rateLimitHeaders,
    );
  }
}
```

---

### `src/lib/bulk-task-validation.test.ts` (new)

Three primary scenario suites plus structural validation tests.

```
describe("validateBulkRows + insertValidRows", () => {
  beforeEach(() => resetTaskWorkflowStore())

  describe("100% valid payload", () => { ... })
  describe("Mixed payload", () => { ... })
  describe("100% invalid payload", () => { ... })
})

describe("POST /api/tasks/bulk — structural validation", () => {
  beforeEach(() => resetTaskWorkflowStore())
  // empty array, oversized, non-object elements, bad JSON, wrong Content-Type
})

describe("Conservation invariant", () => {
  beforeEach(() => resetTaskWorkflowStore())
  // successCount + errorCount === totalProcessed for various batch compositions
})
```

---

## Data Models

### Input

The `POST /api/tasks/bulk` body is `unknown[]`. After structural validation, each element is treated as `Record<string, unknown>` and passed to `validateBulkRows`.

Each row is expected to conform to:

| Field | Type | Source schema |
|---|---|---|
| `poster` | `string` | `CreateTaskInput` / `validateCreateTaskInput` |
| `title` | `string` | `taskSchema` |
| `description` | `string` | `taskSchema` |
| `tokenAddress` | `string` | `taskSchema` |
| `reward` | `number` (coerced) | `taskSchema` |
| `deadline` | `Date` / ISO string / Unix ms (coerced) | `taskSchema` |
| `maxSubmissions` | `number` (coerced) | `taskSchema` |

### Output — `BulkImportResult`

```typescript
{
  totalProcessed: number;   // = input array length
  successCount: number;     // rows written to Task_Store
  errorCount: number;       // rows that failed validation or insertion
  errors: Array<{
    rowIndex: number;       // zero-based index in the input array
    message: string;        // "; "-joined field error strings
  }>;
}
```

**Invariants:**
- `successCount + errorCount === totalProcessed`
- `errors.length === errorCount`
- `errors.length <= totalProcessed`
- Every `rowIndex` in `errors` is a unique integer in `[0, totalProcessed)`.

### Error Message Format

Each field error is formatted as `"<fieldName>: <Zod message>"`. When a row has multiple invalid fields, the messages are joined: `"title: Title must be at least 5 characters; reward: Reward must be strictly greater than zero"`.

The `poster` error is always `"poster: Poster address is required"` (not routed through Zod).

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Conservation Invariant

*For any* structurally valid input array (non-empty, ≤ 100 elements, all non-null objects), the response SHALL satisfy `successCount + errorCount === totalProcessed` and `errors.length === errorCount`, regardless of how many rows pass or fail validation.

**Validates: Requirements 5.8, 8.5**

---

### Property 2: All-Valid Batch Completeness

*For any* batch of N rows (1 ≤ N ≤ 100) where every row satisfies all field validation rules, the endpoint SHALL return `successCount === N`, `errorCount === 0`, `errors === []`, and the Task_Store SHALL contain exactly N tasks after the request completes.

**Validates: Requirements 4.3, 8.1**

---

### Property 3: All-Invalid Batch Isolation

*For any* batch of N rows (1 ≤ N ≤ 100) where every row fails at least one field validation rule, the endpoint SHALL return `successCount === 0`, `errorCount === N`, `errors.length === N`, and the Task_Store SHALL contain zero tasks (assuming the store was empty before the request).

**Validates: Requirements 3.5, 4.5, 8.3**

---

### Property 4: Mixed Batch Accuracy

*For any* batch containing exactly `v` valid rows and `i` invalid rows (v ≥ 1, i ≥ 1, v + i ≤ 100), the endpoint SHALL return `successCount === v`, `errorCount === i`, and the `errors` array SHALL contain exactly the zero-based indices of the invalid rows with no entry for any valid row. The Task_Store SHALL contain exactly the `v` valid rows and no invalid rows.

**Validates: Requirements 3.6, 4.4, 8.2**

---

### Property 5: Row Index Fidelity

*For any* batch where row at zero-based index `i` is invalid, the corresponding entry in the `errors` array SHALL have `rowIndex === i`, regardless of how many other rows in the batch are valid or invalid and regardless of the order of valid and invalid rows.

**Validates: Requirements 1.7, 3.3, 5.5**

---

### Property 6: Multi-Field Error Completeness

*For any* row with `k` invalid fields (k ≥ 1), the `message` string for that row's error entry SHALL contain exactly `k` semicolon-separated field error sub-strings, one per invalid field, and SHALL NOT omit any failing field's error message.

**Validates: Requirements 2.9, 3.3**

---

### Property 7: Validator Field Message Correctness

*For any* row field value that violates a specific validation rule, the validator SHALL produce the exact error message specified for that rule. Specifically:
- Any `title` shorter than 5 chars → `"title: Title must be at least 5 characters"`
- Any `title` longer than 100 chars → `"title: Title must be at most 100 characters"`
- Any `description` shorter than 10 chars → `"description: Description must be at least 10 characters"`
- Any `tokenAddress` not exactly 56 chars → `"tokenAddress: Token address must be exactly 56 characters"`
- Any 56-char `tokenAddress` not starting with `'G'` → `"tokenAddress: Token address must start with 'G'"`
- Any `reward` ≤ 0 or non-positive → `"reward: Reward must be strictly greater than zero"`
- Any past or unparseable `deadline` → `"deadline: Deadline must be in the future"`
- Any `deadline` more than 365 days ahead → `"deadline: Deadline cannot be more than 365 days from now"`
- Any `maxSubmissions` < 1 → `"maxSubmissions: Max submissions must be at least 1"`
- Any blank `poster` → `"poster: Poster address is required"`

**Validates: Requirements 2.2–2.8**

---

### Property 8: Repeated Submission Non-Uniqueness

*For any* batch of N valid rows, submitting the identical batch a second time (after the first succeeds) SHALL also return `successCount === N` with no errors, confirming that the bulk endpoint imposes no uniqueness constraint between independent requests.

**Validates: Requirements 8.4**

---

### Property 9: First Non-Object Index Reporting

*For any* array where element at index `i` is not a non-null object (and the array is non-empty and ≤ 100 elements), the endpoint SHALL return HTTP 400 with an error message identifying index `i` as the first offending element, regardless of how many other non-object elements follow it.

**Validates: Requirements 1.6**

---

## Error Handling

### Route-Level Errors (HTTP 4xx)

| Condition | HTTP Status | Response body |
|---|---|---|
| Rate limit exceeded | 429 | From `checkRateLimit()` |
| Missing/wrong Content-Type | 415 | `{ ok: false, error: "Content-Type must be application/json." }` |
| Invalid JSON body | 400 | `{ ok: false, error: "Request body must be valid JSON." }` |
| Body is not an array | 400 | `{ ok: false, error: "Request body must be a JSON array." }` |
| Empty array | 400 | `{ ok: false, error: "Batch must contain at least 1 row." }` |
| Array > 100 elements | 400 | `{ ok: false, error: "Batch size exceeds the maximum of 100 rows." }` |
| Element is not a non-null object | 400 | `{ ok: false, error: "Row {i} is not a valid object." }` |

The checks are evaluated in priority order: rate-limit → Content-Type → JSON parse → array check → empty → oversized → non-object scan.

### Per-Row Validation Errors (included in HTTP 200 response)

Per-row errors are **not** HTTP errors. They are collected into the `errors` array of the `BulkImportResult` and returned with HTTP 200. Each entry has:
- `rowIndex` — the zero-based position of the failing row in the input array.
- `message` — all field error strings for that row joined with `"; "`.

### Defensive Insertion Errors

`insertValidRows` calls `createTask()`, which itself calls `validateCreateTaskInput` again. If `createTask` returns `ok: false` for a row that `validateBulkRows` accepted (theoretically impossible in normal flow since both use the same validation logic, but defensively handled), the insertion error is added to the `errors` array with the original `rowIndex`.

---

## Testing Strategy

### Dual Testing Approach

Unit tests verify specific examples, edge cases, and error conditions. Property-based tests verify universal invariants across generated inputs. Both are complementary.

**Property-Based Testing Library:** `fast-check` (to be added as a dev dependency: `pnpm add -D fast-check`). Each property test runs a minimum of **100 iterations**.

Each property test is tagged with:
```
// Feature: bulk-task-import, Property N: <property text>
```

### Unit / Integration Tests in `bulk-task-validation.test.ts`

**Suite 1 — 100% Valid Payload**
- `beforeEach`: `resetTaskWorkflowStore()`
- Build N rows of fully valid data (title ≥ 5 chars, description ≥ 10 chars, valid 56-char `G…` tokenAddress, reward ≥ 1_000_000, deadline in future but ≤ 365 days, maxSubmissions ≥ 1, non-blank poster).
- Call `validateBulkRows` then `insertValidRows`.
- Assert: `successCount === N`, `errors === []`, store size equals N.

**Suite 2 — Mixed Payload**
- `beforeEach`: `resetTaskWorkflowStore()`
- Construct a batch with specific valid rows at known indices and invalid rows at other known indices.
- Assert: `successCount === validCount`, `errorCount === invalidCount`, each error entry has the correct `rowIndex`, only valid rows exist in store.

**Suite 3 — 100% Invalid Payload**
- `beforeEach`: `resetTaskWorkflowStore()`
- Build N rows that each fail at least one field rule.
- Assert: `successCount === 0`, `errors.length === N`, each error entry exists, store size is 0.

**Structural Validation Tests**
- Empty array → 400 with correct message.
- 101-element array → 400 with correct message.
- Non-object element (e.g., string at index 2) → 400 identifying index 2.
- Invalid JSON → 400.
- Missing Content-Type → 415.

**Conservation Invariant Test**
- Submit several batch compositions (all-valid, all-invalid, mixed).
- For each: assert `successCount + errorCount === totalProcessed` and `errors.length === errorCount`.

### Property-Based Tests

Property tests are co-located in `bulk-task-validation.test.ts` using `fast-check`.

**Property 1 test** — Generate a random array length N (1–100), build N rows each randomly valid or invalid, submit, assert conservation invariant holds.

**Property 2 test** — Generate N all-valid rows (1 ≤ N ≤ 100), assert `successCount === N` and store has N tasks.

**Property 3 test** — Generate N all-invalid rows, assert `successCount === 0` and store is empty.

**Property 4 test** — Generate v valid rows and i invalid rows in a shuffled order, assert mixed-batch accuracy including rowIndex fidelity.

**Property 5 test** — For any batch where index `j` is invalid, assert `errors` contains entry with `rowIndex === j`.

**Property 6 test** — For any row with k invalid fields, assert the message contains exactly k `"; "`-delimited segments.

**Property 9 test** — Insert a non-object at random index `i` in an otherwise valid array, assert HTTP 400 mentioning index `i`.

### Test Helpers

A `buildValidRow()` helper constructs a minimally valid `CreateTaskInput`-compatible object with overrideable fields, used across all test suites to reduce repetition.

A `buildInvalidRow(invalidFields)` helper creates a row with specified fields set to invalid values (empty string for title, negative number for reward, etc.).

Both helpers accept a `now: Date` parameter to keep deadline calculations in sync with the test clock.
