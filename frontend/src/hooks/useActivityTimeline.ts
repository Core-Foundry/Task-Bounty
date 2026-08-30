"use client";

import { useState, useEffect, useCallback } from "react";
import type { ActivityRecord, ActivityType } from "@/types/activity";

export interface UseActivityTimelineOptions {
  userId: string | null;
  type?: ActivityType;
  pollInterval?: number;
}

export function useActivityTimeline({
  userId,
  type,
  pollInterval = 10000,
}: UseActivityTimelineOptions) {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!userId) {
      setActivities([]);
      setTotal(0);
      setIsLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({ userId });
      if (type) {
        params.append("type", type);
      }

      const res = await fetch(`/api/activities?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load activities (${res.status})`);
      }

      const data = (await res.json()) as {
        ok: boolean;
        activities: ActivityRecord[];
        total: number;
      };

      if (data.ok) {
        setActivities(data.activities);
        setTotal(data.total);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity timeline");
    } finally {
      setIsLoading(false);
    }
  }, [userId, type]);

  useEffect(() => {
    setIsLoading(true);
    void fetchActivities();

    if (pollInterval > 0 && userId) {
      const interval = setInterval(fetchActivities, pollInterval);
      return () => clearInterval(interval);
    }
  }, [fetchActivities, pollInterval, userId]);

  const addActivity = async (
    activityType: ActivityType,
    title: string,
    description: string,
    metadata?: Record<string, unknown>,
  ) => {
    if (!userId) return null;

    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          type: activityType,
          title,
          description,
          metadata,
        }),
      });

      if (!res.ok) throw new Error("Failed to record activity");

      const data = (await res.json()) as { ok: boolean; activity: ActivityRecord };
      if (data.ok) {
        setActivities((prev) => [data.activity, ...prev]);
        setTotal((prev) => prev + 1);
        return data.activity;
      }
    } catch (err) {
      console.error("Error adding activity:", err);
    }
    return null;
  };

  return {
    activities,
    total,
    isLoading,
    error,
    refetch: fetchActivities,
    addActivity,
  };
}
