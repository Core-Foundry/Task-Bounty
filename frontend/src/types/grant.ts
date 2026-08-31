export type GrantStatus = "saved" | "active" | "expired";

/**
 * A grant the user has saved (bookmarked) or activated (applied for /
 * is tracking). `deadline` is a Unix timestamp in seconds.
 *
 * Enrichment fields are optional — records may be partial. The quality
 * scoring system uses their presence/absence to produce a completeness
 * score that helps admins prioritise which records need attention.
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
  createdAt: string | Date;

  // ── Enrichment fields (optional) ─────────────────────────────────────────
  /** Human-readable description of what the grant funds. */
  description?: string;
  /** URL of the grant's official page. */
  website?: string;
  /** Public contact e-mail for enquiries. */
  contactEmail?: string;
  /** Thematic category, e.g. "tooling", "education", "infrastructure". */
  category?: string;
  /** Grant award amount. */
  amount?: number;
  /** ISO 4217 currency code for the award, e.g. "USDC", "XLM". */
  currency?: string;
  /** Name of the recipient or applying organisation. */
  recipientName?: string;
  /** Stellar public key of the recipient. */
  recipientAddress?: string;
  /** Timestamp of the last update to this record. */
  updatedAt?: string | Date;

  // ── Restricted fields (never exported) ───────────────────────────────────
  applicantEmail?: string;
  reviewerNotes?: string;
  internalScore?: number;
  kycReference?: string;
  bankAccountNumber?: string;
}

// ── Quality Score types ───────────────────────────────────────────────────────

/**
 * Letter grade derived from a numeric quality score (0–100).
 *
 * - A  90–100  Excellent — all important fields present
 * - B  75–89   Good
 * - C  60–74   Acceptable
 * - D  40–59   Poor — notable gaps
 * - F  0–39    Incomplete — needs significant attention
 */
export type QualityGrade = "A" | "B" | "C" | "D" | "F";

/** The name of a field that contributes to the quality score. */
export type QualityField =
  | "title"
  | "funder"
  | "deadline"
  | "description"
  | "website"
  | "contactEmail"
  | "category"
  | "amount"
  | "currency"
  | "recipientName"
  | "recipientAddress";

/** Result of evaluating one grant's data completeness. */
export interface GrantQualityScore {
  /** 0–100 numeric completeness score. */
  score: number;
  /** Letter grade derived from score. */
  grade: QualityGrade;
  /** Fields that are present and contribute positively. */
  presentFields: QualityField[];
  /** Fields that are missing and would improve the score. */
  missingFields: QualityField[];
  /** True when every quality field is present. */
  isComplete: boolean;
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

// ── Export authorization types ────────────────────────────────────────────────

export type ExportRole = "admin" | "grant_manager" | "reviewer" | "contributor";

export interface ExportRequester {
  id: string;
  role: ExportRole;
}
