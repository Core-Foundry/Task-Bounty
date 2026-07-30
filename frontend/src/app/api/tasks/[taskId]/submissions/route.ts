import {
  extractTaskSubmissionFiles,
  MAX_TASK_SUBMISSION_FILES,
  MAX_TASK_SUBMISSION_FILE_SIZE_BYTES,
  MAX_TASK_SUBMISSION_TOTAL_SIZE_BYTES,
  validateTaskSubmissionFiles,
} from "@/lib/task-submission-files";
import { submitTaskWork } from "@/lib/task-workflow";
import { buildNoStoreJson } from "@/lib/api-response";
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
    return buildNoStoreJson(
      {
        ok: false,
        error: "Please submit work using a valid multipart form.",
      },
      400,
      rateLimitHeaders,
    );
  }

  const contributor = String(formData.get("contributor") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const workUrl = String(formData.get("workUrl") ?? "").trim();

  const files = extractTaskSubmissionFiles(formData);
  const validation = await validateTaskSubmissionFiles(files);

  if (!validation.ok) {
    return buildNoStoreJson(
      {
        ok: false,
        error: "Invalid task submission upload.",
        details: validation.errors,
        limits: {
          maxFiles: MAX_TASK_SUBMISSION_FILES,
          maxFileSizeBytes: MAX_TASK_SUBMISSION_FILE_SIZE_BYTES,
          maxTotalSizeBytes: MAX_TASK_SUBMISSION_TOTAL_SIZE_BYTES,
        },
      },
      validation.status,
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
    return buildNoStoreJson(
      {
        ok: false,
        error: result.error,
        details: result.details,
      },
      result.status,
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
