import { NextRequest, NextResponse } from "next/server";
import {
  addBookmark,
  listBookmarks,
  removeBookmarkByTask,
  resetBookmarkStore,
} from "@/lib/bookmark-store";

/**
 * GET /api/bookmarks?userId=<wallet>
 * List all bookmarks for a user.
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

  const result = listBookmarks(userId);
  return NextResponse.json(result);
}

/**
 * POST /api/bookmarks
 * Body: { userId, taskId, action?: "add" | "remove" | "toggle" }
 * Default action is "add".
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
  const taskId = String(body.taskId ?? "").trim();
  const action = String(body.action ?? "add") as "add" | "remove" | "toggle";

  if (!userId || !taskId) {
    return NextResponse.json(
      { error: "userId and taskId are required." },
      { status: 400 },
    );
  }

  if (action === "remove") {
    const result = removeBookmarkByTask(userId, taskId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ bookmarked: false });
  }

  // default: add
  const result = addBookmark(userId, taskId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ bookmarked: true, bookmark: result.bookmark });
}

/**
 * DELETE /api/bookmarks?userId=<wallet>&taskId=<taskId>
 * Remove a bookmark by user+task pair.
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") ?? "";
  const taskId = searchParams.get("taskId") ?? "";

  if (!userId.trim() || !taskId.trim()) {
    return NextResponse.json(
      { error: "userId and taskId are required." },
      { status: 400 },
    );
  }

  const result = removeBookmarkByTask(userId, taskId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ bookmarked: false });
}
