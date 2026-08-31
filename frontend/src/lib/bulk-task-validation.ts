import type { CreateTaskInput } from "@/types/task-workflow";
import { taskSchema } from "@/lib/taskValidation";
import { createTask, MAX_TASK_DEADLINE_OFFSET_SECONDS } from "@/lib/task-workflow";

export interface BulkRowError {
  rowIndex: number;
  message: string;
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

export function validateBulkRows(rows: unknown[], now: Date = new Date()): BulkValidationResult {
  const validRows: Array<{ index: number; input: CreateTaskInput }> = [];
  const errors: BulkRowError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const messages: string[] = [];

    // Step 1: Run taskSchema.safeParse to validate title, description, tokenAddress,
    // reward, deadline, maxSubmissions
    const parseResult = taskSchema.safeParse(row);

    if (!parseResult.success) {
      // Extract Zod error messages formatted as "fieldName: Zod message"
      for (const issue of parseResult.error.issues) {
        const fieldName = String(issue.path[0]);
        messages.push(`${fieldName}: ${issue.message}`);
      }
    }

    // Step 2: After safeParse, check the 365-day upper bound manually
    // This applies whether safeParse succeeded or failed (if deadline parsed successfully)
    if (parseResult.success) {
      const parsedDate = parseResult.data.deadline;
      if (parsedDate.getTime() > now.getTime() + MAX_TASK_DEADLINE_OFFSET_SECONDS * 1000) {
        // Replace any existing "Deadline must be in the future" error with the 365-day error
        // (365-day takes priority per requirement 2.6)
        const futureErrIdx = messages.findIndex((m) => m === "deadline: Deadline must be in the future");
        if (futureErrIdx !== -1) {
          messages.splice(futureErrIdx, 1);
        }
        messages.push("deadline: Deadline cannot be more than 365 days from now");
      }
    } else {
      // safeParse failed — check if the deadline field parsed as a date but is > 365 days
      // We do a partial check: try to coerce the deadline value independently
      const rowRecord = row as Record<string, unknown>;
      const rawDeadline = rowRecord.deadline;
      if (rawDeadline !== undefined && rawDeadline !== null) {
        const coerced = new Date(rawDeadline as string | number);
        if (!isNaN(coerced.getTime()) && coerced.getTime() > now.getTime() + MAX_TASK_DEADLINE_OFFSET_SECONDS * 1000) {
          // The deadline is parseable and > 365 days from now.
          // Remove "Deadline must be in the future" if present (365-day takes priority)
          const futureErrIdx = messages.findIndex((m) => m === "deadline: Deadline must be in the future");
          if (futureErrIdx !== -1) {
            messages.splice(futureErrIdx, 1);
            messages.push("deadline: Deadline cannot be more than 365 days from now");
          }
        }
      }
    }

    // Step 3: Check poster separately
    const rowRecord = row as Record<string, unknown>;
    const posterValue = rowRecord.poster;
    if (posterValue === undefined || posterValue === null || String(posterValue).trim() === "") {
      messages.push("poster: Poster address is required");
    }

    // Step 4: Collect results
    if (messages.length > 0) {
      errors.push({ rowIndex: i, message: messages.join("; ") });
    } else {
      // parseResult.success must be true here since messages is empty
      // (safeParse only adds to messages on failure, and poster is valid)
      const data = (parseResult as Extract<typeof parseResult, { success: true }>).data;
      const input: CreateTaskInput = {
        poster: String(posterValue).trim(),
        title: data.title,
        description: data.description,
        reward: data.reward,
        deadline: Math.floor(data.deadline.getTime() / 1000),
        maxSubmissions: data.maxSubmissions,
      };
      validRows.push({ index: i, input });
    }
  }

  return { validRows, errors };
}

export function insertValidRows(
  validRows: Array<{ index: number; input: CreateTaskInput }>,
  now?: Date,
): BulkImportResult {
  let successCount = 0;
  let errorCount = 0;
  const errors: BulkRowError[] = [];

  for (const entry of validRows) {
    const result = createTask(entry.input, now ?? new Date());
    if (result.ok) {
      successCount++;
    } else {
      errorCount++;
      errors.push({ rowIndex: entry.index, message: result.error });
    }
  }

  return {
    totalProcessed: validRows.length,
    successCount,
    errorCount,
    errors,
  };
}
