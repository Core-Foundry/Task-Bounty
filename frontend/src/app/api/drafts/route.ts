import { NextRequest, NextResponse } from "next/server";
import {
  saveDraft,
  getDraft,
  listDrafts,
  deleteDraftByTask,
  getLastSavedAt,
  MAX_FORM_DATA_SIZE,
} from "@/lib/draft-autosave";

/**
 * GET /api/drafts?userId=<wallet>&taskId=<taskId>
 *
 * - If taskId is provided: returns the single draft for that user+task pair.
 * - If taskId is omitted: returns all drafts for the user.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") ?? "";
  const taskId = searchParams.get("taskId");

  if (!userId.trim()) {
    return NextResponse.json(
      { error: "userId query parameter is required." },
      { status: 400 },
    );
  }

  if (taskId) {
    const draft = getDraft(userId, taskId);
    if (!draft) {
      return NextResponse.json(
        { error: "Draft not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({ draft });
  }

  const result = listDrafts(userId);
  return NextResponse.json(result);
}

/**
 * POST /api/drafts
 * Body: { userId, taskId, formData, autoSaved? }
 *
 * Creates or updates a draft (upsert).
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
  const formData = String(body.formData ?? "");
  const autoSaved = body.autoSaved !== false;

  if (!userId || !taskId) {
    return NextResponse.json(
      { error: "userId and taskId are required." },
      { status: 400 },
    );
  }

  if (formData.length > MAX_FORM_DATA_SIZE) {
    return NextResponse.json(
      { error: `Form data exceeds maximum size of ${MAX_FORM_DATA_SIZE} bytes.` },
      { status: 400 },
    );
  }

  const result = saveDraft({ userId, taskId, formData, autoSaved });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ draft: result.draft });
}

/**
 * DELETE /api/drafts?userId=<wallet>&taskId=<taskId>
 *
 * Removes a draft for the specified user+task pair.
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

  const result = deleteDraftByTask(userId, taskId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ deleted: true });
}
