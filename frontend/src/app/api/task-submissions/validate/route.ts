import { NextResponse } from "next/server";

import {
  extractTaskSubmissionFiles,
  MAX_TASK_SUBMISSION_FILES,
  MAX_TASK_SUBMISSION_FILE_SIZE_BYTES,
  MAX_TASK_SUBMISSION_TOTAL_SIZE_BYTES,
  validateTaskSubmissionFiles,
} from "@/lib/task-submission-files";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildNoStoreJson(
  body: unknown,
  status: number,
  extraHeaders: Record<string, string> = {},
) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...extraHeaders },
  });
}

export async function POST(request: Request) {
  const { response: rateLimitResponse, headers: rateLimitHeaders } =
    checkRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return buildNoStoreJson(
      {
        ok: false,
        error: "Please upload files using a valid form.",
      },
      400,
      rateLimitHeaders,
    );
  }

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

  return buildNoStoreJson(
    {
      ok: true,
      files: validation.files,
      totalSize: validation.totalSize,
      limits: {
        maxFiles: MAX_TASK_SUBMISSION_FILES,
        maxFileSizeBytes: MAX_TASK_SUBMISSION_FILE_SIZE_BYTES,
        maxTotalSizeBytes: MAX_TASK_SUBMISSION_TOTAL_SIZE_BYTES,
      },
    },
    200,
    rateLimitHeaders,
  );
}
