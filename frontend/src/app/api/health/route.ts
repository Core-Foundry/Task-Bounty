import { NextResponse } from "next/server";

import { buildHealthReport } from "@/lib/health";

// Health must always reflect the live process, never a cached/static response.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(buildHealthReport(), {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
