/**
 * Grant Data Quality Score — #166
 *
 * Evaluates the completeness of a GrantRecord and produces a 0–100 numeric
 * score plus a letter grade. The score helps administrators identify records
 * that need more information before being useful to applicants.
 *
 * Design decisions:
 *
 *   • Weighted fields — not all fields are equally important. `title`,
 *     `funder`, and `deadline` are core identifiers and carry the most
 *     weight. Enrichment fields like `description`, `website`, and
 *     `contactEmail` add progressively more value but are less critical.
 *
 *   • Required vs. optional — `title`, `funder`, and `deadline` are always
 *     present in a valid GrantRecord (they are required by the type). They
 *     are still scored because their *values* can be empty strings / 0,
 *     which counts as missing for quality purposes.
 *
 *   • Pure functions — no side effects, no store access. Callers decide
 *     what to do with the results.
 *
 *   • Admin helpers — `scoreAllGrants` and `listLowQualityGrants` let an
 *     admin surface and sort records by completeness in one call.
 */

import type {
  GrantQualityScore,
  GrantRecord,
  QualityField,
  QualityGrade,
} from "@/types/grant";

// ── Field weights ─────────────────────────────────────────────────────────────

/**
 * Weight assigned to each quality field.
 *
 * Total of all weights = 100, so the numeric score equals the sum of weights
 * for present fields and is directly interpretable as a percentage.
 *
 * Breakdown rationale:
 *   Core identity (title + funder + deadline)   = 45 pts
 *   Recipient info (name + address)             = 20 pts
 *   Financial info (amount + currency)          = 15 pts
 *   Discoverability (description + website)     = 12 pts
 *   Contact / classification                    = 8 pts
 */
export const QUALITY_FIELD_WEIGHTS: Record<QualityField, number> = {
  title: 15,
  funder: 15,
  deadline: 15,
  recipientName: 10,
  recipientAddress: 10,
  amount: 8,
  currency: 7,
  description: 8,
  website: 4,
  contactEmail: 4,
  category: 4,
};

/** All fields that are assessed, in a stable order for display. */
export const QUALITY_FIELDS: readonly QualityField[] = [
  "title",
  "funder",
  "deadline",
  "description",
  "website",
  "contactEmail",
  "category",
  "amount",
  "currency",
  "recipientName",
  "recipientAddress",
];

// Compile-time check: weights sum to 100.
const _weightSum = Object.values(QUALITY_FIELD_WEIGHTS).reduce((a, b) => a + b, 0);
if (_weightSum !== 100) {
  throw new Error(
    `QUALITY_FIELD_WEIGHTS must sum to 100, but got ${_weightSum}. Fix the weight table.`,
  );
}

// ── Grade thresholds ──────────────────────────────────────────────────────────

/** Maps inclusive lower bounds to a letter grade. Evaluated from highest down. */
export const GRADE_THRESHOLDS: { min: number; grade: QualityGrade }[] = [
  { min: 90, grade: "A" },
  { min: 75, grade: "B" },
  { min: 60, grade: "C" },
  { min: 40, grade: "D" },
  { min: 0, grade: "F" },
];

export function scoreToGrade(score: number): QualityGrade {
  for (const { min, grade } of GRADE_THRESHOLDS) {
    if (score >= min) return grade;
  }
  return "F";
}

// ── Field presence check ──────────────────────────────────────────────────────

/**
 * Returns `true` when a field value is considered "present" for scoring
 * purposes.
 *
 *   • `title` / `funder`  — non-empty string after trimming
 *   • `deadline`          — positive non-zero number
 *   • `amount`            — positive non-zero number
 *   • everything else     — truthy after trimming (for strings) or simply truthy
 */
export function isFieldPresent(grant: GrantRecord, field: QualityField): boolean {
  switch (field) {
    case "title":
    case "funder":
      return typeof grant[field] === "string" && grant[field].trim().length > 0;

    case "deadline":
      return typeof grant.deadline === "number" && grant.deadline > 0;

    case "amount":
      return typeof grant.amount === "number" && grant.amount > 0;

    case "description":
    case "website":
    case "contactEmail":
    case "category":
    case "currency":
    case "recipientName":
    case "recipientAddress":
      return (
        typeof grant[field] === "string" &&
        (grant[field] as string).trim().length > 0
      );
  }
}

// ── Core scoring function ─────────────────────────────────────────────────────

/**
 * Compute a data quality score for one grant record.
 *
 * @returns A `GrantQualityScore` with the numeric score, letter grade,
 *          lists of present and missing fields, and a boolean shorthand.
 */
export function scoreGrantQuality(grant: GrantRecord): GrantQualityScore {
  const presentFields: QualityField[] = [];
  const missingFields: QualityField[] = [];
  let score = 0;

  for (const field of QUALITY_FIELDS) {
    if (isFieldPresent(grant, field)) {
      presentFields.push(field);
      score += QUALITY_FIELD_WEIGHTS[field];
    } else {
      missingFields.push(field);
    }
  }

  // Clamp to [0, 100] to guard against future weight-sum drift.
  const clampedScore = Math.min(100, Math.max(0, score));

  return {
    score: clampedScore,
    grade: scoreToGrade(clampedScore),
    presentFields,
    missingFields,
    isComplete: missingFields.length === 0,
  };
}

// ── Admin helpers ─────────────────────────────────────────────────────────────

export interface ScoredGrant {
  grant: GrantRecord;
  quality: GrantQualityScore;
}

/**
 * Score every grant in the list and return grant+quality pairs, sorted
 * from lowest to highest quality score so the worst records appear first.
 *
 * Admins can immediately see which records need attention without having
 * to sort the list themselves.
 */
export function scoreAllGrants(grants: readonly GrantRecord[]): ScoredGrant[] {
  return grants
    .map((grant) => ({ grant, quality: scoreGrantQuality(grant) }))
    .sort((a, b) => a.quality.score - b.quality.score);
}

/**
 * Return only grants whose quality score falls below `threshold` (default
 * 75 — grade C and below). Results are sorted worst-first.
 *
 * Use this to build admin dashboards that focus attention on the records
 * that need improvement.
 */
export function listLowQualityGrants(
  grants: readonly GrantRecord[],
  threshold = 75,
): ScoredGrant[] {
  return scoreAllGrants(grants).filter(({ quality }) => quality.score < threshold);
}

/**
 * Return a human-readable summary of what is missing from a grant record.
 *
 * Empty string when the record is complete.
 *
 * Example: "Missing fields: description, website, contactEmail"
 */
export function formatQualitySummary(quality: GrantQualityScore): string {
  if (quality.isComplete) return "";
  return `Missing fields: ${quality.missingFields.join(", ")}`;
}

/**
 * Convenience function: score a single grant and return a short label
 * suitable for display in a table, e.g. "B (85)".
 */
export function formatQualityLabel(grant: GrantRecord): string {
  const { score, grade } = scoreGrantQuality(grant);
  return `${grade} (${score})`;
}
