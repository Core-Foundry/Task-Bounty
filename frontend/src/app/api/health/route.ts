import { NextResponse } from "next/server";

import { buildHealthReport } from "@/lib/health";
import { enforceRateLimit } from "@/lib/rate-limit";

// Health must always reflect the live process, never a cached/static response.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimitResponse = enforceRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  return NextResponse.json(buildHealthReport(), {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
