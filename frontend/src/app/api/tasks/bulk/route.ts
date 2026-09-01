import { checkRateLimit } from "@/lib/rate-limit";
import { buildNoStoreJson } from "@/lib/api-response";
import { validateBulkRows, insertValidRows } from "@/lib/bulk-task-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Step 1: Rate limit check
  const { response: rateLimitResponse, headers: rateLimitHeaders } =
    checkRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Step 2: Content-Type check
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return buildNoStoreJson(
      { ok: false, error: "Content-Type must be application/json." },
      415,
      rateLimitHeaders,
    );
  }

  // Step 3: JSON parse
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return buildNoStoreJson(
      { ok: false, error: "Request body must be valid JSON." },
      400,
      rateLimitHeaders,
    );
  }

  // Step 4: Array check
  if (!Array.isArray(body)) {
    return buildNoStoreJson(
      { ok: false, error: "Request body must be a JSON array." },
      400,
      rateLimitHeaders,
    );
  }

  const rows = body as unknown[];

  // Step 5: Empty check
  if (rows.length === 0) {
    return buildNoStoreJson(
      { ok: false, error: "Batch must contain at least 1 row." },
      400,
      rateLimitHeaders,
    );
  }

  // Step 6: Size limit check
  if (rows.length > 100) {
    return buildNoStoreJson(
      { ok: false, error: "Batch size exceeds the maximum of 100 rows." },
      400,
      rateLimitHeaders,
    );
  }

  // Step 7: Non-object element scan
  for (let i = 0; i < rows.length; i++) {
    const el = rows[i];
    if (el === null || typeof el !== "object" || Array.isArray(el)) {
      return buildNoStoreJson(
        { ok: false, error: `Row ${i} is not a valid object.` },
        400,
        rateLimitHeaders,
      );
    }
  }

  // Step 8: Validate rows (capture now once)
  const now = new Date();
  const validationResult = validateBulkRows(rows, now);

  // Step 9: Insert valid rows
  const insertionResult = insertValidRows(validationResult.validRows, now);

  // Step 10: Build response
  const allErrors = [...validationResult.errors, ...insertionResult.errors];
  const totalProcessed = rows.length;
  const successCount = insertionResult.successCount;
  const errorCount = allErrors.length;

  return buildNoStoreJson(
    { totalProcessed, successCount, errorCount, errors: allErrors },
    200,
    rateLimitHeaders,
  );
}
