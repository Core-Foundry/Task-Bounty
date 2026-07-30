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
