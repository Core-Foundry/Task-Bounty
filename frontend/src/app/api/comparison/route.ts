import { NextRequest, NextResponse } from "next/server";
import {
  createComparison,
  getComparison,
  addToComparison,
  removeFromComparison,
  clearComparison,
} from "@/lib/grant-comparison";

/**
 * GET /api/comparison?userId=<wallet>
 * Get the user's current comparison set.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") ?? "";

  if (!userId.trim()) {
    return NextResponse.json(
      { error: "userId query parameter is required." },
      { status: 400 },
    );
  }

  const comparison = getComparison(userId);
  return NextResponse.json({ comparison });
}

/**
 * POST /api/comparison
 * Body: { userId, taskIds?, taskId?, action? }
 *
 * Actions:
 * - "create" (default): create/replace comparison with taskIds array
 * - "add": add taskId to comparison
 * - "remove": remove taskId from comparison
 * - "clear": clear comparison set
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const userId = String(body.userId ?? "").trim();
  const action = String(body.action ?? "create");

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required." },
      { status: 400 },
    );
  }

  if (action === "clear") {
    clearComparison(userId);
    return NextResponse.json({ comparison: null });
  }

  if (action === "add" || action === "remove") {
    const taskId = String(body.taskId ?? "").trim();
    if (!taskId) {
      return NextResponse.json(
        { error: "taskId is required for add/remove actions." },
        { status: 400 },
      );
    }

    const result =
      action === "add"
        ? addToComparison(userId, taskId)
        : removeFromComparison(userId, taskId);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ comparison: result.comparison });
  }

  // default: create
  const taskIds = Array.isArray(body.taskIds)
    ? body.taskIds.map(String)
    : [];

  const result = createComparison(userId, taskIds);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ comparison: result.comparison });
}
