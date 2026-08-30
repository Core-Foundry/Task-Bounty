export type GrantStatus = "saved" | "active" | "expired";

/**
 * A grant the user has saved (bookmarked) or activated (applied for /
 * is tracking). `deadline` is a Unix timestamp in seconds.
 */
export interface GrantRecord {
  id: string;
  /** Grant title, e.g. "Creative Europe – Co-operation Projects". */
  title: string;
  /** Funder or organisation offering the grant. */
  funder: string;
  /** Unix timestamp (seconds) of the application deadline. */
  deadline: number;
  status: GrantStatus;
  /** Wallet address of the user who saved/activated the grant. */
  owner: string;
  createdAt: string;
}

/**
 * Reminder timing configuration. `reminderOffsetsSeconds` lists how long
 * before the deadline reminders fire, e.g. [7 days, 3 days, 24h, 6h].
 * Duplicates are ignored; values must be positive.
 */
export interface ReminderConfig {
  /** Offsets before the deadline (seconds) at which reminders fire. */
  reminderOffsetsSeconds: number[];
}

export const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  // 7 days, 3 days, 1 day, 6 hours before the deadline.
  reminderOffsetsSeconds: [
    7 * 24 * 60 * 60,
    3 * 24 * 60 * 60,
    24 * 60 * 60,
    6 * 60 * 60,
  ],
};
