"use client";

import { useCallback, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Known notification categories. Add more here as the platform grows. */
export type NotificationCategory =
  | "task_updates"
  | "submission_activity"
  | "payments"
  | "disputes"
  | "platform_announcements";

/** Map of category → enabled state. */
export type NotificationPreferences = Record<NotificationCategory, boolean>;

/** Return value of the hook. */
export interface UseNotificationPreferencesReturn {
  /** Current preferences object. */
  preferences: NotificationPreferences;
  /** True while preferences are being loaded from storage. */
  isLoading: boolean;
  /**
   * Toggle a single category on or off.
   * The updated preferences are persisted to localStorage automatically.
   */
  toggle: (category: NotificationCategory) => void;
  /**
   * Replace all preferences at once.
   * Useful for "enable all" / "disable all" bulk actions.
   */
  setAll: (enabled: boolean) => void;
  /**
   * Explicitly overwrite preferences.
   * Merges the supplied partial map over the current state.
   */
  update: (partial: Partial<NotificationPreferences>) => void;
  /**
   * Reset to the factory defaults and remove the stored entry.
   */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** localStorage key used to persist preferences. */
export const NOTIFICATION_PREFS_KEY = "notificationPreferences";

/** All known categories in display order. */
export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  "task_updates",
  "submission_activity",
  "payments",
  "disputes",
  "platform_announcements",
];

/** Human-readable labels for each category. */
export const NOTIFICATION_CATEGORY_LABELS: Record<
  NotificationCategory,
  { label: string; description: string }
> = {
  task_updates: {
    label: "Task updates",
    description: "When a task you are watching changes status.",
  },
  submission_activity: {
    label: "Submission activity",
    description:
      "When a submission is approved, rejected, or receives a comment.",
  },
  payments: {
    label: "Payments",
    description: "Bounty payouts, escrow releases, and refunds.",
  },
  disputes: {
    label: "Disputes",
    description: "Dispute raised, evidence submitted, or resolved.",
  },
  platform_announcements: {
    label: "Platform announcements",
    description: "Product updates and maintenance windows.",
  },
};

/** Default preferences — all categories enabled. */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  task_updates: true,
  submission_activity: true,
  payments: true,
  disputes: true,
  platform_announcements: true,
};

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

function loadFromStorage(): NotificationPreferences | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    // Merge stored values over defaults so new categories get their default
    // value even when they are absent from an older stored preference object.
    const merged: NotificationPreferences = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
    };

    for (const cat of NOTIFICATION_CATEGORIES) {
      const val = (parsed as Record<string, unknown>)[cat];
      if (typeof val === "boolean") {
        merged[cat] = val;
      }
    }

    return merged;
  } catch {
    return null;
  }
}

function saveToStorage(prefs: NotificationPreferences): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Storage quota exceeded or access denied — silently ignore.
  }
}

function removeFromStorage(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(NOTIFICATION_PREFS_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages notification preferences with automatic localStorage persistence.
 *
 * Preferences survive page refreshes and are lazily loaded on mount so they
 * are safe to use in SSR/SSG projects (loading begins in `useEffect`).
 *
 * @example
 * ```tsx
 * const { preferences, toggle, isLoading } = useNotificationPreferences();
 *
 * if (isLoading) return <Spinner />;
 *
 * return (
 *   <Switch
 *     checked={preferences.payments}
 *     onCheckedChange={() => toggle("payments")}
 *   />
 * );
 * ```
 */
export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES,
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load persisted preferences on mount (client-side only).
  useEffect(() => {
    const stored = loadFromStorage();
    if (stored) {
      setPreferences(stored);
    }
    setIsLoading(false);
  }, []);

  const toggle = useCallback((category: NotificationCategory) => {
    setPreferences((prev) => {
      const updated: NotificationPreferences = {
        ...prev,
        [category]: !prev[category],
      };
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const setAll = useCallback((enabled: boolean) => {
    setPreferences((prev) => {
      const updated = { ...prev } as NotificationPreferences;
      for (const cat of NOTIFICATION_CATEGORIES) {
        updated[cat] = enabled;
      }
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const update = useCallback(
    (partial: Partial<NotificationPreferences>) => {
      setPreferences((prev) => {
        const updated: NotificationPreferences = { ...prev, ...partial };
        saveToStorage(updated);
        return updated;
      });
    },
    [],
  );

  const reset = useCallback(() => {
    removeFromStorage();
    setPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES });
  }, []);

  return { preferences, isLoading, toggle, setAll, update, reset };
}
