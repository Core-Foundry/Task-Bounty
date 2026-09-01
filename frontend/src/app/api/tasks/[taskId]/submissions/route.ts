import {
  extractTaskSubmissionFiles,
  MAX_TASK_SUBMISSION_FILES,
  MAX_TASK_SUBMISSION_FILE_SIZE_BYTES,
  MAX_TASK_SUBMISSION_TOTAL_SIZE_BYTES,
  validateTaskSubmissionFiles,
} from "@/lib/task-submission-files";
import { submitTaskWork } from "@/lib/task-workflow";
import { buildErrorResponse, buildNoStoreJson } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ taskId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { response: rateLimitResponse, headers: rateLimitHeaders } =
    checkRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { taskId } = await context.params;

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return buildErrorResponse(
      "Please submit work using a valid multipart form.",
      400,
      "INVALID_FORM_DATA",
      undefined,
      undefined,
      rateLimitHeaders,
    );
  }

  const contributor = String(formData.get("contributor") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const workUrl = String(formData.get("workUrl") ?? "").trim();

  const files = extractTaskSubmissionFiles(formData);
  const validation = await validateTaskSubmissionFiles(files);

  if (!validation.ok) {
    return buildErrorResponse(
      "Invalid task submission upload.",
      validation.status,
      "FILE_VALIDATION_FAILED",
      validation.errors,
      {
        maxFiles: MAX_TASK_SUBMISSION_FILES,
        maxFileSizeBytes: MAX_TASK_SUBMISSION_FILE_SIZE_BYTES,
        maxTotalSizeBytes: MAX_TASK_SUBMISSION_TOTAL_SIZE_BYTES,
      },
      rateLimitHeaders,
    );
  }

  const result = submitTaskWork(
    {
      taskId,
      contributor,
      description,
      workUrl: workUrl || undefined,
    },
    validation.files,
  );

  if (!result.ok) {
    return buildErrorResponse(
      result.error,
      result.status,
      "SUBMISSION_FAILED",
      result.details,
      undefined,
      rateLimitHeaders,
    );
  }

  return buildNoStoreJson(
    {
      ok: true,
      task: result.task,
      submission: result.submission,
    },
    201,
    rateLimitHeaders,
  );
}
