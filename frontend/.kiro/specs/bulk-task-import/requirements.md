# Requirements Document

## Introduction

The Bulk Task Import feature adds a `POST /api/tasks/bulk` endpoint that accepts a JSON array of task objects, validates every row individually against the existing task schema, and inserts only the valid rows into the in-memory store. Rather than failing on the first error, the endpoint collects all validation failures and returns them alongside the insertion results. This lets callers fix every problem in a single round-trip instead of submitting repeatedly.

## Glossary

- **Bulk_Endpoint**: The `POST /api/tasks/bulk` route handler that processes a batch of task rows.
- **Row**: A single JSON object within the input array, representing one task to be created.
- **Row_Index**: The zero-based position of a Row within the input array.
- **Validator**: The per-row validation logic that applies `taskSchema` and `CreateTaskInput` rules to a Row.
- **Valid_Record**: A Row that passes all validation checks and is eligible for insertion.
- **Invalid_Record**: A Row that fails one or more validation checks and is excluded from insertion.
- **Bulk_Import_Result**: The JSON response object returned by the Bulk_Endpoint.
- **Batch**: The full set of Rows submitted in a single request to the Bulk_Endpoint.
- **taskSchema**: The existing Zod schema in `src/lib/taskValidation.ts` that validates `title`, `description`, `tokenAddress`, `reward`, `deadline`, and `maxSubmissions`.
- **CreateTaskInput**: The existing TypeScript type in `src/types/task-workflow.ts` that additionally requires a `poster` field.
- **Rate_Limiter**: The existing `checkRateLimit()` helper in `src/lib/rate-limit.ts`.
- **Task_Store**: The in-memory `Map<string, TaskRecord>` maintained by `src/lib/task-workflow.ts`.
- **Absent**: A field is absent when its key is missing from the Row object, or its value is `null` or `undefined`.

## Requirements

### Requirement 1: Accepted Input Shape

**User Story:** As an API consumer, I want to POST a JSON array of task objects to a single endpoint, so that I can create many tasks in one request without calling the single-task endpoint repeatedly.

#### Acceptance Criteria

1. THE Bulk_Endpoint SHALL accept a request body that is a JSON array where every element is a non-null JSON object (not a string, number, boolean, null, or nested array).
2. WHEN the request body is not valid JSON, THE Bulk_Endpoint SHALL return HTTP 400 with `{ "ok": false, "error": "Request body must be valid JSON." }`.
3. WHEN the request body is valid JSON but is not an array, THE Bulk_Endpoint SHALL return HTTP 400 with `{ "ok": false, "error": "Request body must be a JSON array." }`.
4. WHEN the request body is an empty array, THE Bulk_Endpoint SHALL return HTTP 400 with `{ "ok": false, "error": "Batch must contain at least 1 row." }` and SHALL NOT insert any records into the Task_Store.
5. WHEN the array contains more than 100 elements, THE Bulk_Endpoint SHALL return HTTP 400 with `{ "ok": false, "error": "Batch size exceeds the maximum of 100 rows." }` and SHALL NOT insert any records.
6. Structural checks SHALL be evaluated in priority order: empty array and oversized array are checked before non-object element checks. WHEN any element in the array is not a non-null JSON object (and structural size checks pass), THE Bulk_Endpoint SHALL return HTTP 400 identifying the zero-based index of the first offending element (e.g., `{ "ok": false, "error": "Row 3 is not a valid object." }`).
7. THE Bulk_Endpoint SHALL assign each valid array element a Row_Index equal to its zero-based position in the input array.
8. WHEN the request does not include a `Content-Type: application/json` header, THE Bulk_Endpoint SHALL return HTTP 415 with `{ "ok": false, "error": "Content-Type must be application/json." }`.

---

### Requirement 2: Per-Row Field Validation

**User Story:** As an API consumer, I want each row validated against the same rules as the single-task endpoint, so that the bulk import enforces the same data quality constraints.

#### Acceptance Criteria

1. THE Validator SHALL evaluate each Row's fields as follows: `title`, `description`, `tokenAddress`, `reward`, `deadline`, and `maxSubmissions` are governed by `taskSchema`; `poster` is governed by the `CreateTaskInput` rules in `validateCreateTaskInput`. A field is absent when its key is missing, or its value is `null` or `undefined`. String coercion via `z.coerce` means numeric strings are accepted where a number is expected.
2. WHEN a Row's `title` is absent, or its string value (after trimming) is shorter than 5 characters, THE Validator SHALL produce the message `"title: Title must be at least 5 characters"`. WHEN a Row's `title` exceeds 100 characters, THE Validator SHALL produce the message `"title: Title must be at most 100 characters"`.
3. WHEN a Row's `description` is absent or shorter than 10 characters, THE Validator SHALL produce the message `"description: Description must be at least 10 characters"`.
4. WHEN a Row's `tokenAddress` is absent or not exactly 56 characters long, THE Validator SHALL produce the message `"tokenAddress: Token address must be exactly 56 characters"`. WHEN a Row's `tokenAddress` is 56 characters but does not start with the character `'G'`, THE Validator SHALL produce the message `"tokenAddress: Token address must start with 'G'"`.
5. WHEN a Row's `reward` is absent, zero, negative, or not a positive integer (including after coercion from string), or represents a value less than `1,000,000` stroops (the `MIN_TASK_REWARD` constant), THE Validator SHALL produce the message `"reward: Reward must be strictly greater than zero"`.
6. WHEN a Row's `deadline` is absent or not parseable as an ISO 8601 date string or Unix timestamp, THE Validator SHALL produce the message `"deadline: Deadline must be in the future"`. WHEN a Row's `deadline` is parseable but represents a date-time not strictly in the future at the moment of processing, THE Validator SHALL produce the message `"deadline: Deadline must be in the future"`. WHEN a Row's `deadline` is parseable and in the future but represents a date more than 365 days from the time of processing, THE Validator SHALL produce the message `"deadline: Deadline cannot be more than 365 days from now"` (the too-far-in-future message takes precedence over the future check when both conditions apply).
7. WHEN a Row's `maxSubmissions` is absent or not an integer greater than or equal to 1, THE Validator SHALL produce the message `"maxSubmissions: Max submissions must be at least 1"`.
8. WHEN a Row's `poster` field is absent or is an empty string after trimming whitespace, THE Validator SHALL produce the message `"poster: Poster address is required"`.
9. WHEN a Row contains multiple invalid fields, THE Validator SHALL produce one error message per invalid field and SHALL NOT stop evaluation at the first failing field.

---

### Requirement 3: Error Aggregation Behavior

**User Story:** As an API consumer, I want to receive every validation error from every row in a single response, so that I can fix all problems at once instead of resubmitting multiple times.

#### Acceptance Criteria

1. THE Bulk_Endpoint SHALL evaluate every Row in the Batch regardless of whether earlier Rows have failed validation.
2. THE Bulk_Endpoint SHALL collect all per-row validation failures across all Rows before constructing the response.
3. WHEN a Row fails validation, THE Bulk_Endpoint SHALL record an entry `{ "rowIndex": <zero-based Row_Index>, "message": <field error messages joined by "; "> }` in the `errors` array of the Bulk_Import_Result.
4. THE Bulk_Endpoint SHALL return HTTP 200 when the Batch passes structural validation (non-empty array within size limits, all elements are objects) even if every Row fails per-row field validation; HTTP 4xx responses are reserved for structural/batch-level errors and rate limit violations.
5. WHEN all Rows in the Batch are invalid, THE Bulk_Endpoint SHALL return HTTP 200 with `successCount: 0` and an `errors` array containing one entry per invalid Row.
6. WHEN a Batch contains a mix of valid and invalid Rows, THE Bulk_Endpoint SHALL set `successCount` to the count of Rows that pass validation and were inserted, and `errorCount` to the count of Rows that failed validation.

---

### Requirement 4: Insertion Behavior

**User Story:** As an API consumer, I want valid rows to be saved even when some rows are invalid, so that a single bad record does not block the rest of the batch.

#### Acceptance Criteria

1. THE Bulk_Endpoint SHALL call `createTask()` for each Valid_Record only after the Validator has evaluated every Row in the Batch.
2. THE Bulk_Endpoint SHALL NOT call `createTask()` for any Invalid_Record.
3. WHEN all Rows pass validation, THE Bulk_Endpoint SHALL insert all Rows into the Task_Store and return `successCount` equal to the total number of Rows.
4. WHEN a Batch contains a mix of valid and invalid Rows, THE Bulk_Endpoint SHALL insert only the Valid_Records into the Task_Store and report each Invalid_Record in the `errors` array.
5. WHEN all Rows fail validation, THE Bulk_Endpoint SHALL insert zero records into the Task_Store and return `successCount: 0`.
6. WHEN a Batch contains a mix of valid and invalid Rows, THE Bulk_Endpoint SHALL insert all Valid_Records into the Task_Store (not just attempt them), so that the Task_Store contains exactly the Valid_Records from that Batch after the response is returned.
7. THE Bulk_Endpoint SHALL complete insertion of all Valid_Records before returning the response; no partial set of Valid_Records may be left un-inserted when the response is sent.

---

### Requirement 5: Response Shape Contract

**User Story:** As an API consumer, I want a structured response that tells me exactly how many rows succeeded, how many failed, and the details of each failure, so that I can process results programmatically.

#### Acceptance Criteria

1. THE Bulk_Endpoint SHALL return a JSON object with the fields `totalProcessed`, `successCount`, `errorCount`, and `errors` on every HTTP 200 response.
2. THE Bulk_Endpoint SHALL set `totalProcessed` to the total number of Rows in the input array.
3. THE Bulk_Endpoint SHALL set `successCount` to the number of Rows that passed validation AND were successfully written to the Task_Store.
4. THE Bulk_Endpoint SHALL set `errorCount` to the number of Rows that failed validation OR whose Task_Store write failed; `errorCount` SHALL equal the length of the `errors` array.
5. THE Bulk_Endpoint SHALL set `errors` to an array of objects each containing `rowIndex` (integer, zero-based, matching the Row's position in the input array) and `message` (a non-empty string of 1–500 characters); the length of `errors` SHALL equal `errorCount` and SHALL NOT exceed `totalProcessed`.
6. THE Bulk_Endpoint SHALL set the `Cache-Control` response header to `no-store` on all responses.
7. THE Bulk_Endpoint SHALL include the rate-limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) on every response (both 200 and 4xx non-429 responses).
8. FOR ALL input arrays that pass structural validation (non-empty, within size limits, all elements are objects), `successCount + errorCount` SHALL equal `totalProcessed`.

---

### Requirement 6: Batch Size Limits

**User Story:** As a platform operator, I want a hard cap on how many rows a single bulk request may contain, so that one large request cannot exhaust server memory or starve other requests.

#### Acceptance Criteria

1. IF a Batch contains more than 100 Rows, THEN THE Bulk_Endpoint SHALL return HTTP 400 with `{ "ok": false, "error": "Batch size exceeds the maximum of 100 rows." }` and SHALL NOT insert any records into the Task_Store.
2. IF a Batch contains zero Rows (empty array), THEN THE Bulk_Endpoint SHALL return HTTP 400 with `{ "ok": false, "error": "Batch must contain at least 1 row." }` and SHALL NOT insert any records.
3. Both size-limit checks SHALL be performed before any per-row validation begins.

---

### Requirement 7: Rate Limiting

**User Story:** As a platform operator, I want the bulk endpoint to enforce the same rate-limiting policy as all other task API routes, so that bulk imports cannot be used to bypass per-IP request limits.

#### Acceptance Criteria

1. WHEN the Bulk_Endpoint receives a request, it SHALL call `checkRateLimit(request)` before attempting to parse the request body.
2. WHEN `checkRateLimit` returns a non-null response object, THE Bulk_Endpoint SHALL return that response object immediately and SHALL NOT read or parse the request body.
3. WHEN `checkRateLimit` returns a null response (request is allowed), THE Bulk_Endpoint SHALL attach all rate-limit headers from `checkRateLimit`'s `headers` result to its own response before returning.
4. WHEN the bulk endpoint's per-IP request count equals the per-IP request count enforced on `POST /api/tasks` (same `API_RATE_LIMIT_MAX_REQUESTS` and `API_RATE_LIMIT_WINDOW_MS` environment variables), the Bulk_Endpoint SHALL block the request with HTTP 429 in the same manner as `POST /api/tasks`.

---

### Requirement 8: Test Coverage

**User Story:** As a developer, I want automated tests for the three canonical bulk-import scenarios, so that regressions in the validation pipeline or insertion logic are caught before deployment.

#### Acceptance Criteria

1. WHEN a Batch of N valid Rows (N ≥ 1) is submitted to the Bulk_Endpoint against an isolated Task_Store containing zero pre-existing tasks, THE Bulk_Endpoint SHALL return `successCount` equal to N, `totalProcessed` equal to N, an `errors` array of length zero, and the Task_Store SHALL contain exactly N tasks afterward.
2. WHEN a Batch containing at least one Valid_Record and at least one Invalid_Record is submitted to the Bulk_Endpoint, THE Bulk_Endpoint SHALL return `successCount` equal to the number of Valid_Records, `errorCount` equal to the number of Invalid_Records, and the `errors` array SHALL contain one entry per Invalid_Record where each entry's `rowIndex` equals that row's zero-based position in the submitted Batch array; the Task_Store SHALL contain exactly the Valid_Records and no Invalid_Records.
3. WHEN a Batch of N Rows where every Row is invalid is submitted to the Bulk_Endpoint against an isolated Task_Store containing zero pre-existing tasks, THE Bulk_Endpoint SHALL return `successCount: 0`, `errorCount` equal to N, an `errors` array of length N, and the Task_Store SHALL contain zero tasks afterward.
4. WHEN a Batch of N valid Rows is submitted and succeeds, and then the same N Rows are submitted again as a second Batch, THE second submission SHALL also return `successCount` equal to N with no errors, confirming that the bulk import does not impose uniqueness constraints between independent submissions.
5. FOR ALL successful HTTP 200 responses from THE Bulk_Endpoint, `successCount + errorCount` SHALL equal `totalProcessed` and the length of `errors` SHALL equal `errorCount`.
