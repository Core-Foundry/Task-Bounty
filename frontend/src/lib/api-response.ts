import { NextResponse } from "next/server";

export const TASK_API_RUNTIME = "nodejs";
export const TASK_API_DYNAMIC = "force-dynamic";

export function buildNoStoreJson(
  body: unknown,
  status: number,
  extraHeaders: Record<string, string> = {},
) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...extraHeaders },
  });
}

/**
 * Standardized error response format for all API endpoints
 */
export interface ApiErrorResponse {
  ok: false;
  error: string;
  code?: string;
  details?: string[];
  limits?: Record<string, unknown>;
}

/**
 * Builds a standardized error response
 */
export function buildErrorResponse(
  error: string,
  status: number = 500,
  code?: string,
  details?: string[],
  limits?: Record<string, unknown>,
  extraHeaders: Record<string, string> = {},
): NextResponse {
  const body: ApiErrorResponse = {
    ok: false,
    error,
  };

  if (code) body.code = code;
  if (details) body.details = details;
  if (limits) body.limits = limits;

  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...extraHeaders },
  });
}
