# Implementation Plan: Bulk Task Import

## Overview

Implement a `POST /api/tasks/bulk` endpoint in three discrete steps: first build the validation and insertion service in `src/lib/bulk-task-validation.ts`, then wire it into a Next.js route handler at `src/app/api/tasks/bulk/route.ts`, and finally cover both with unit and property-based tests in `src/lib/bulk-task-validation.test.ts`. Each step builds directly on the previous one and re-uses only existing helpers (`taskSchema`, `createTask`, `checkRateLimit`, `buildNoStoreJson`, `resetTaskWorkflowStore`). No new runtime dependencies are needed; `fast-check` is added as a dev-only dependency before the test task.

---

## Tasks

- [x] 1. Create validation and insertion service (`src/lib/bulk-task-validation.ts`)
  - [x] 1.1 Define and export the three shared types
    - Export `BulkRowError { rowIndex: number; message: string }`.
    - Export `BulkValidationResult { validRows: Array<{ index: number; input: CreateTaskInput }>; errors: BulkRowError[] }`.
    - Export `BulkImportResult { totalProcessed: number; successCount: number; errorCount: number; errors: BulkRowError[] }`.
    - Import `CreateTaskInput` from `@/types/task-workflow`.
    - _Requirements: 5.1, 5.5_

  - [x] 1.2 Implement `validateBulkRows(rows: unknown[], now?: Date): BulkValidationResult`
    - Iterate **every** row — no early exit.
    - For each row `i`: call `taskSchema.safeParse(row)` and extract Zod issues formatted as `"fieldName: Zod message"` by reading `issue.path[0]` and `issue.message`.
    - After `safeParse`, when the parsed deadline is valid, compare against `now` (defaulting to `new Date()`) to enforce the 365-day upper bound: if `parsedDeadline.getTime() > now.getTime() + 365 * 24 * 60 * 60 * 1000`, replace any existing deadline message with `"deadline: Deadline cannot be more than 365 days from now"`.
    - Check `poster` separately: if `(row as any).poster` is absent or trims to `""`, append `"poster: Poster address is required"`.
    - Collect all messages; if any exist push `{ rowIndex: i, message: messages.join("; ") }` to `errors`; otherwise push `{ index: i, input: { ...validatedFields, poster, deadline: parsedDeadlineAsUnixSeconds } }` to `validRows`.
    - Return `{ validRows, errors }`.
    - _Requirements: 2.1–2.9, 3.1–3.3_

  - [x] 1.3 Implement `insertValidRows(validRows: Array<{ index: number; input: CreateTaskInput }>, now?: Date): BulkImportResult`
    - Iterate every entry in `validRows`.
    - Call `createTask(entry.input, now)` for each.
    - If `ok: true`, increment `successCount`.
    - If `ok: false` (defensive path), increment `errorCount` and push `{ rowIndex: entry.index, message: result.error }` to `errors`.
    - Return `BulkImportResult` with `totalProcessed: validRows.length`, `successCount`, `errorCount`, `errors`.
    - Import `createTask` from `@/lib/task-workflow`.
    - _Requirements: 4.1–4.7_

- [x] 2. Create route handler (`src/app/api/tasks/bulk/route.ts`)
  - [x] 2.1 Scaffold module exports and import dependencies
    - `export const runtime = "nodejs"` and `export const dynamic = "force-dynamic"`.
    - Import `checkRateLimit` from `@/lib/rate-limit`, `buildNoStoreJson` from `@/lib/api-response`, `validateBulkRows` and `insertValidRows` from `@/lib/bulk-task-validation`.
    - _Requirements: 7.1, 7.3_

  - [x] 2.2 Implement the `POST` handler with ordered structural checks
    - **Step 1** — call `checkRateLimit(request)`; if `response` is non-null, return it immediately (HTTP 429). _Requirements: 7.1–7.4_
    - **Step 2** — read `Content-Type` header; if it does not include `"application/json"`, return `buildNoStoreJson({ ok: false, error: "Content-Type must be application/json." }, 415, rateLimitHeaders)`. _Requirements: 1.8_
    - **Step 3** — `await request.json()` inside try/catch; on throw return `buildNoStoreJson({ ok: false, error: "Request body must be valid JSON." }, 400, rateLimitHeaders)`. _Requirements: 1.2_
    - **Step 4** — `Array.isArray(body)` guard; if false return `buildNoStoreJson({ ok: false, error: "Request body must be a JSON array." }, 400, rateLimitHeaders)`. _Requirements: 1.3_
    - **Step 5** — `body.length === 0` guard; return `buildNoStoreJson({ ok: false, error: "Batch must contain at least 1 row." }, 400, rateLimitHeaders)`. _Requirements: 1.4, 6.2_
    - **Step 6** — `body.length > 100` guard; return `buildNoStoreJson({ ok: false, error: "Batch size exceeds the maximum of 100 rows." }, 400, rateLimitHeaders)`. _Requirements: 1.5, 6.1_
    - **Step 7** — scan for first non-null-object element; return `buildNoStoreJson({ ok: false, error: \`Row ${i} is not a valid object.\` }, 400, rateLimitHeaders)` on first hit. _Requirements: 1.1, 1.6_
    - **Step 8** — call `validateBulkRows(body, new Date())`.
    - **Step 9** — call `insertValidRows(validRows, new Date())`.
    - **Step 10** — merge `validationResult.errors` and `insertionResult.errors`, compute `totalProcessed = body.length`, `successCount = insertionResult.successCount`, `errorCount = mergedErrors.length`, return `buildNoStoreJson({ totalProcessed, successCount, errorCount, errors: mergedErrors }, 200, rateLimitHeaders)`. _Requirements: 3.4, 5.1–5.8_
    - Set `Cache-Control: no-store` via `buildNoStoreJson`. _Requirements: 5.6_
    - Attach rate-limit headers to all non-429 responses. _Requirements: 5.7_

- [~] 3. Checkpoint — verify route handler compiles and imports resolve
  - Ensure `pnpm build` (or `tsc --noEmit`) passes with no type errors across the two new files before adding tests.

- [x] 4. Add `fast-check` dev dependency and write tests (`src/lib/bulk-task-validation.test.ts`)
  - [x] 4.1 Install `fast-check` and scaffold test file
    - Run `pnpm add -D fast-check@3` to add the property-testing library.
    - Create `src/lib/bulk-task-validation.test.ts` with top-level imports: `vitest` (`describe`, `it`, `expect`, `beforeEach`), `fast-check` (`fc`), `resetTaskWorkflowStore` from `@/lib/task-workflow`, `validateBulkRows` and `insertValidRows` from `@/lib/bulk-task-validation`, and the exported `POST` handler from `@/app/api/tasks/bulk/route`.
    - Define `buildValidRow(overrides?, now?)` helper that returns a minimally valid row object (title ≥ 5 chars, description ≥ 10 chars, 56-char `G…` tokenAddress, reward = 1_000_000, deadline as Unix-second timestamp 1 day in future, maxSubmissions = 1, non-blank poster).
    - Define `buildInvalidRow(invalidFields)` helper that starts from a valid row and applies the specified invalid field values.
    - _Requirements: 8.1–8.5_

  - [x] 4.2 Write Suite 1 — 100% valid payload (unit tests)
    - `beforeEach`: `resetTaskWorkflowStore()`.
    - Test: submit 3 fully valid rows through `validateBulkRows` then `insertValidRows`; assert `successCount === 3`, `errors.length === 0`, and `tasks` store contains 3 entries (verify by calling `createTask` result count or checking store via repeated `getTask` calls).
    - _Requirements: 8.1, 4.3_

  - [x] 4.3 Write Suite 2 — mixed payload (unit tests)
    - `beforeEach`: `resetTaskWorkflowStore()`.
    - Build 5 rows: indices 0, 2, 4 valid; indices 1, 3 invalid (e.g., blank title and negative reward respectively).
    - Assert `successCount === 3`, `errorCount === 2`, `errors[0].rowIndex === 1`, `errors[1].rowIndex === 3`, store contains exactly 3 tasks.
    - _Requirements: 8.2, 3.6, 4.4_

  - [x] 4.4 Write Suite 3 — 100% invalid payload (unit tests)
    - `beforeEach`: `resetTaskWorkflowStore()`.
    - Build 3 rows each failing at least one field.
    - Assert `successCount === 0`, `errors.length === 3`, store is empty (call `createTask` for a sentinel valid row afterward to confirm `nextTaskId` is 1, meaning no prior insertions occurred).
    - _Requirements: 8.3, 3.5, 4.5_

  - [x] 4.5 Write Suite 4 — structural validation (unit tests against POST handler)
    - `beforeEach`: `resetTaskWorkflowStore()`.
    - Test empty array `[]`: call `POST` with valid headers, assert HTTP 400, body `{ ok: false, error: "Batch must contain at least 1 row." }`.
    - Test 101-element array: assert HTTP 400, body `{ ok: false, error: "Batch size exceeds the maximum of 100 rows." }`.
    - Test non-object element at index 2 (e.g., `[validRow, validRow, "oops", validRow]`): assert HTTP 400, body `{ ok: false, error: "Row 2 is not a valid object." }`.
    - Test invalid JSON body: simulate by building a `Request` with `body: "not-json"` and correct `Content-Type`; assert HTTP 400, `error: "Request body must be valid JSON."`.
    - Test wrong Content-Type (`text/plain`): assert HTTP 415, `error: "Content-Type must be application/json."`.
    - _Requirements: 1.2–1.8, 6.1–6.2_

  - [ ]* 4.6 Write property test for Property 1 — Conservation Invariant
    - **Property 1: Conservation Invariant — `successCount + errorCount === totalProcessed` and `errors.length === errorCount`**
    - **Validates: Requirements 5.8, 8.5**
    - Use `fc.array(fc.boolean(), { minLength: 1, maxLength: 100 })` to generate a boolean mask; map each `true` → valid row, `false` → invalid row. Call `validateBulkRows` + `insertValidRows`, merge errors, assert conservation invariant holds for each generated batch.
    - Tag: `// Feature: bulk-task-import, Property 1: Conservation Invariant`

  - [ ]* 4.7 Write property test for Property 2 — All-Valid Batch Completeness
    - **Property 2: All-Valid Batch Completeness — all-valid batch of N rows produces `successCount === N`, `errors === []`**
    - **Validates: Requirements 4.3, 8.1**
    - Use `fc.integer({ min: 1, max: 100 })` for N, generate N valid rows, assert `successCount === N` and `errors.length === 0`.
    - Tag: `// Feature: bulk-task-import, Property 2: All-Valid Batch Completeness`

  - [ ]* 4.8 Write property test for Property 3 — All-Invalid Batch Isolation
    - **Property 3: All-Invalid Batch Isolation — all-invalid batch produces `successCount === 0`, store empty**
    - **Validates: Requirements 3.5, 4.5, 8.3**
    - Generate N all-invalid rows (blank title), assert `successCount === 0`, `errors.length === N`, store empty.
    - Tag: `// Feature: bulk-task-import, Property 3: All-Invalid Batch Isolation`

  - [ ]* 4.9 Write property test for Property 5 — Row Index Fidelity
    - **Property 5: Row Index Fidelity — every error entry's `rowIndex` matches the zero-based position of its invalid row**
    - **Validates: Requirements 1.7, 3.3, 5.5**
    - Use `fc.array(fc.boolean(), { minLength: 1, maxLength: 100 })` to determine valid/invalid positions; after calling the pipeline, assert that for every `false` position `j`, `errors` contains an entry with `rowIndex === j`, and no entry has a `rowIndex` matching a valid row's position.
    - Tag: `// Feature: bulk-task-import, Property 5: Row Index Fidelity`

  - [ ]* 4.10 Write property test for Property 8 — Repeated Submission Non-Uniqueness
    - **Property 8: Repeated Submission Non-Uniqueness — submitting the same valid batch twice both return `successCount === N`**
    - **Validates: Requirements 8.4**
    - Generate N valid rows, submit once (assert `successCount === N`), submit same rows again (assert `successCount === N`, `errors === []`), confirming no uniqueness constraint.
    - Tag: `// Feature: bulk-task-import, Property 8: Repeated Submission Non-Uniqueness`

  - [ ]* 4.11 Write property test for Property 9 — First Non-Object Index Reporting
    - **Property 9: First Non-Object Index Reporting — HTTP 400 identifies the first non-null-object index**
    - **Validates: Requirements 1.6**
    - Use `fc.integer({ min: 0, max: 9 })` to pick index `i` in a 10-element array; insert a string at that index; assert HTTP 400 with `error: \`Row ${i} is not a valid object.\``.
    - Tag: `// Feature: bulk-task-import, Property 9: First Non-Object Index Reporting`

- [x] 5. Final checkpoint — run full test suite
  - Run `pnpm test` (which executes `vitest run`) and ensure all tests pass, including existing tests.
  - Ensure all tests pass; ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; the unit tests in 4.2–4.5 are the priority.
- `fast-check` is only needed if property tests (4.6–4.11) are included; install it before starting task 4.1 if property tests are desired.
- The `now` parameter on `validateBulkRows` and `insertValidRows` allows test suites to freeze time, ensuring deadline comparisons are deterministic.
- `buildNoStoreJson` already sets `Cache-Control: no-store`, satisfying Requirement 5.6 with no extra code.
- The route handler must pass `new Date()` once per request invocation (not once per row) so all rows in a batch share the same reference time.
- The `taskSchema` deadline refine compares against `Date.now()` at parse-time, which is fine for production but makes tests brittle; the 365-day upper-bound check in `validateBulkRows` is done manually after `safeParse` to allow time injection.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["2.1"] },
    { "id": 4, "tasks": ["2.2"] },
    { "id": 5, "tasks": ["4.1"] },
    { "id": 6, "tasks": ["4.2", "4.3", "4.4", "4.5"] },
    { "id": 7, "tasks": ["4.6", "4.7", "4.8", "4.9", "4.10", "4.11"] }
  ]
}
```
