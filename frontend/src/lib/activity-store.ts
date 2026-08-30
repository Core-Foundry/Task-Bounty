import type {
  ActivityRecord,
  ActivityType,
  CreateActivityInput,
  ListActivitiesQuery,
} from "@/types/activity";

const activities = new Map<string, ActivityRecord>();
let nextActivityId = 1;

/**
 * Record a user activity
 */
export function recordActivity(
  input: CreateActivityInput,
  now: Date = new Date(),
): ActivityRecord {
  const record: ActivityRecord = {
    id: String(nextActivityId++),
    userId: input.userId.trim(),
    type: input.type,
    title: input.title.trim(),
    description: input.description.trim(),
    timestamp: now.toISOString(),
    metadata: input.metadata,
  };

  activities.set(record.id, record);
  return record;
}

/**
 * List activities exclusively belonging to `userId`, sorted in reverse chronological order (newest first).
 */
export function listUserActivities(query: ListActivitiesQuery): {
  activities: ActivityRecord[];
  total: number;
} {
  const targetUserId = query.userId.trim();
  if (!targetUserId) {
    return { activities: [], total: 0 };
  }

  const userFiltered = Array.from(activities.values()).filter((act) => {
    // Strictly isolate activity to the user
    if (act.userId !== targetUserId) {
      return false;
    }
    if (query.type && act.type !== query.type) {
      return false;
    }
    return true;
  });

  // Sort chronologically (newest first)
  userFiltered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const total = userFiltered.length;
  const offset = query.offset && query.offset > 0 ? query.offset : 0;
  const limit = query.limit && query.limit > 0 ? query.limit : 50;

  const paginated = userFiltered.slice(offset, offset + limit);

  return {
    activities: paginated,
    total,
  };
}

/**
 * Seed initial mock activities for a user if empty (useful for default demos/dashboard)
 */
export function seedDefaultActivitiesIfEmpty(userId: string) {
  const existing = listUserActivities({ userId });
  if (existing.total > 0) return;

  const now = Date.now();
  const sampleActivities: Array<{
    type: ActivityType;
    title: string;
    description: string;
    offsetMinutes: number;
    metadata?: ActivityRecord["metadata"];
  }> = [
    {
      type: "application_submitted",
      title: "Submitted grant application",
      description: "Applied for Stellar Community Fund Round 28",
      offsetMinutes: 15,
      metadata: { grantId: "grant-scf-28", grantName: "Stellar Community Fund #28", status: "pending" },
    },
    {
      type: "grant_saved",
      title: "Saved grant opportunity",
      description: "Saved Soroban Developer Grant to watchlist",
      offsetMinutes: 120,
      metadata: { grantId: "grant-soroban-dev", grantName: "Soroban Developer Grant" },
    },
    {
      type: "account_updated",
      title: "Account profile updated",
      description: "Updated bio and primary developer skills",
      offsetMinutes: 1440,
      metadata: { updatedFields: ["bio", "skills"] },
    },
    {
      type: "submission_created",
      title: "Submitted bounty task",
      description: "Submitted work for Paymesh Smart Contract audit",
      offsetMinutes: 2880,
      metadata: { taskId: "task-1", taskTitle: "Smart Contract Audit" },
    },
  ];

  for (const sample of sampleActivities) {
    const time = new Date(now - sample.offsetMinutes * 60 * 1000);
    recordActivity(
      {
        userId,
        type: sample.type,
        title: sample.title,
        description: sample.description,
        metadata: sample.metadata,
      },
      time,
    );
  }
}

export function resetActivityStore() {
  activities.clear();
  nextActivityId = 1;
}
