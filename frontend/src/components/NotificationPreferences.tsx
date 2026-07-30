"use client";

import React from "react";
import { Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_LABELS,
  type NotificationCategory,
  useNotificationPreferences,
} from "@/hooks/useNotificationPreferences";

// ---------------------------------------------------------------------------
// ToggleSwitch
// ---------------------------------------------------------------------------

interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  "aria-labelledby"?: string;
}

/**
 * Accessible toggle switch built from a `<button role="switch">` so no
 * additional Radix dependency is required.
 */
function ToggleSwitch({
  id,
  checked,
  onCheckedChange,
  disabled,
  "aria-labelledby": ariaLabelledby,
}: ToggleSwitchProps) {
  return (
    <button
      id={id}
      role="switch"
      type="button"
      aria-checked={checked}
      aria-labelledby={ariaLabelledby}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B63D6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0D10]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-[#5B63D6]" : "bg-[#2A2B3A]",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// NotificationPreferences
// ---------------------------------------------------------------------------

export interface NotificationPreferencesProps {
  /** Optional extra className for the outermost wrapper. */
  className?: string;
}

/**
 * Notification preferences panel.
 *
 * Renders a list of toggle switches — one per notification category — so users
 * can individually enable or disable each category. Preferences are persisted to
 * localStorage via the `useNotificationPreferences` hook and survive page refresh.
 *
 * Bulk actions ("Enable all" / "Disable all") and a "Reset to defaults" escape
 * hatch are included.
 *
 * @example
 * ```tsx
 * // Drop this anywhere in a settings page:
 * <NotificationPreferences />
 * ```
 */
export default function NotificationPreferences({
  className,
}: NotificationPreferencesProps) {
  const { preferences, isLoading, toggle, setAll, reset } =
    useNotificationPreferences();

  const allEnabled = NOTIFICATION_CATEGORIES.every(
    (cat) => preferences[cat],
  );
  const noneEnabled = NOTIFICATION_CATEGORIES.every(
    (cat) => !preferences[cat],
  );

  if (isLoading) {
    return (
      <div
        aria-label="Loading notification preferences"
        className={cn(
          "rounded-2xl border border-[#1C1D2E] bg-[#0D0D10] p-6 animate-pulse",
          className,
        )}
      >
        <div className="h-5 w-48 rounded bg-[#1C1D2E] mb-4" />
        {NOTIFICATION_CATEGORIES.map((cat) => (
          <div
            key={cat}
            className="flex items-center justify-between py-3 border-b border-[#1C1D2E] last:border-0"
          >
            <div className="h-4 w-40 rounded bg-[#1C1D2E]" />
            <div className="h-6 w-11 rounded-full bg-[#1C1D2E]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <section
      aria-label="Notification preferences"
      className={cn(
        "rounded-2xl border border-[#1C1D2E] bg-[#0D0D10] p-6",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <Bell
          className="text-[#8B92E8] shrink-0"
          size={20}
          aria-hidden="true"
        />
        <h2 className="text-white font-semibold text-base">
          Notification preferences
        </h2>
      </div>
      <p className="text-[#5A6578] text-sm mb-5 pl-8">
        Choose which notifications you want to receive.
      </p>

      {/* Category list */}
      <ul
        role="list"
        className="divide-y divide-[#1C1D2E]"
        aria-label="Notification categories"
      >
        {NOTIFICATION_CATEGORIES.map((cat: NotificationCategory) => {
          const { label, description } = NOTIFICATION_CATEGORY_LABELS[cat];
          const labelId = `notif-label-${cat}`;
          const descId = `notif-desc-${cat}`;
          const switchId = `notif-switch-${cat}`;

          return (
            <li
              key={cat}
              className="flex items-center justify-between gap-4 py-4"
            >
              <div className="flex flex-col gap-0.5">
                <span
                  id={labelId}
                  className="text-sm font-medium text-white"
                >
                  {label}
                </span>
                <span
                  id={descId}
                  className="text-xs text-[#5A6578]"
                >
                  {description}
                </span>
              </div>

              <ToggleSwitch
                id={switchId}
                checked={preferences[cat]}
                onCheckedChange={() => toggle(cat)}
                aria-labelledby={labelId}
              />
            </li>
          );
        })}
      </ul>

      {/* Bulk actions */}
      <div
        className="flex flex-wrap items-center gap-3 mt-6 pt-4 border-t border-[#1C1D2E]"
        role="group"
        aria-label="Bulk actions"
      >
        <button
          type="button"
          onClick={() => setAll(true)}
          disabled={allEnabled}
          className={cn(
            "text-xs font-medium px-3 py-1.5 rounded-lg transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B63D6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0D10]",
            allEnabled
              ? "text-[#3A3B4E] cursor-not-allowed"
              : "text-[#8B92E8] hover:bg-[#5B63D6]/10",
          )}
        >
          Enable all
        </button>

        <button
          type="button"
          onClick={() => setAll(false)}
          disabled={noneEnabled}
          className={cn(
            "text-xs font-medium px-3 py-1.5 rounded-lg transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B63D6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0D10]",
            noneEnabled
              ? "text-[#3A3B4E] cursor-not-allowed"
              : "text-[#8B92E8] hover:bg-[#5B63D6]/10",
          )}
        >
          <BellOff
            size={12}
            className="inline mr-1 -mt-0.5"
            aria-hidden="true"
          />
          Disable all
        </button>

        <button
          type="button"
          onClick={reset}
          className={cn(
            "ml-auto text-xs font-medium px-3 py-1.5 rounded-lg transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D4D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0D10]",
            "text-[#FF4D4D] hover:bg-[#FF4D4D]/10",
          )}
        >
          Reset to defaults
        </button>
      </div>
    </section>
  );
}
