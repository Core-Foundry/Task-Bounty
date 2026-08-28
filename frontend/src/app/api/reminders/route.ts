import { NextRequest, NextResponse } from "next/server";
import {
  getReminderSettings,
  updateReminderSettings,
  getPendingReminders,
  type ReminderTiming,
  VALID_TIMINGS,
} from "@/lib/deadline-reminder";

/**
 * GET /api/reminders?userId=<wallet>
 * Get the user's reminder settings and pending reminders.
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

  const settings = getReminderSettings(userId);
  const pending = getPendingReminders(userId);

  return NextResponse.json({ settings, pendingReminders: pending });
}

/**
 * PATCH /api/reminders
 * Body: { userId, enabled?, timings? }
 * Update reminder settings.
 */
export async function PATCH(request: NextRequest) {
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
  if (!userId) {
    return NextResponse.json(
      { error: "userId is required." },
      { status: 400 },
    );
  }

  const updates: { enabled?: boolean; timings?: ReminderTiming[] } = {};

  if (typeof body.enabled === "boolean") {
    updates.enabled = body.enabled;
  }

  if (Array.isArray(body.timings)) {
    const timings = body.timings.map(String) as ReminderTiming[];
    const invalid = timings.filter((t) => !VALID_TIMINGS.includes(t));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Invalid timings: ${invalid.join(", ")}. Valid: ${VALID_TIMINGS.join(", ")}` },
        { status: 400 },
      );
    }
    updates.timings = timings;
  }

  const result = updateReminderSettings(userId, updates);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ settings: result.settings });
}
