/**
 * Duplicate grant/task detection logic.
 *
 * Compares tasks by title similarity, organization, and description
 * to flag potential duplicates for admin review.
 * Does NOT delete or block creation — only flags for review.
 */

import type { TaskRecord } from "@/types/task-workflow";

/** Minimum normalized-title similarity ratio (0–1) to flag as a potential duplicate. */
const TITLE_SIMILARITY_THRESHOLD = 0.8;

/** Maximum Levenshtein distance for short-title comparison. */
const TITLE_DISTANCE_THRESHOLD = 3;

export interface DuplicateMatch {
  /** ID of the existing task that the new task resembles. */
  existingTaskId: string;
  /** Title of the existing task. */
  existingTitle: string;
  /** Human-readable reason for the flag. */
  reason: string;
  /** Confidence score 0–1. */
  confidence: number;
}

export interface DuplicateDetectionResult {
  /** True if at least one potential duplicate was found. */
  hasDuplicates: boolean;
  /** Matches sorted by confidence descending. */
  matches: DuplicateMatch[];
}

/**
 * Normalize a string for comparison: lowercase, trim, collapse whitespace,
 * remove common punctuation.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Compute Levenshtein distance between two strings.
 * Used for short-title comparison.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

/**
 * Compute a similarity ratio (0–1) between two normalized strings.
 * Uses Levenshtein distance relative to the longer string.
 */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return 1 - dist / maxLen;
}

/**
 * Check a set of fields for a duplicate against existing tasks.
 *
 * @param newTask — the task being created (not yet stored)
 * @param existingTasks — all current tasks to compare against
 */
export function detectDuplicates(
  newTask: Pick<TaskRecord, "title" | "organization" | "description">,
  existingTasks: TaskRecord[],
): DuplicateDetectionResult {
  const matches: DuplicateMatch[] = [];
  const newTitleNorm = normalize(newTask.title);
  const newOrgNorm = normalize(newTask.organization);
  const newDescNorm = normalize(newTask.description);

  for (const existing of existingTasks) {
    const reasons: string[] = [];
    let confidence = 0;

    // Exact title match
    const existTitleNorm = normalize(existing.title);
    if (newTitleNorm === existTitleNorm && newTitleNorm.length > 0) {
      reasons.push("Identical title");
      confidence = Math.max(confidence, 0.95);
    } else if (newTitleNorm.length > 0 && existTitleNorm.length > 0) {
      const sim = similarity(newTitleNorm, existTitleNorm);
      if (sim >= TITLE_SIMILARITY_THRESHOLD) {
        reasons.push(`Title similarity ${(sim * 100).toFixed(0)}%`);
        confidence = Math.max(confidence, sim);
      } else if (
        newTitleNorm.length <= 50 &&
        existTitleNorm.length <= 50
      ) {
        const dist = levenshtein(newTitleNorm, existTitleNorm);
        if (dist > 0 && dist <= TITLE_DISTANCE_THRESHOLD) {
          const simFromDist = 1 - dist / Math.max(newTitleNorm.length, existTitleNorm.length);
          reasons.push(`Title edit distance ${dist}`);
          confidence = Math.max(confidence, simFromDist);
        }
      }
    }

    // Same organization + high description overlap
    if (
      newOrgNorm.length > 0 &&
      newOrgNorm === existTitleNorm ||
      (newOrgNorm.length > 0 && newOrgNorm === normalize(existing.organization))
    ) {
      const existDescNorm = normalize(existing.description);
      if (newDescNorm.length > 0 && existDescNorm.length > 0) {
        const descSim = similarity(newDescNorm, existDescNorm);
        if (descSim >= 0.7) {
          reasons.push(`Same organization + ${Math.round(descSim * 100)}% description overlap`);
          confidence = Math.max(confidence, descSim * 0.9);
        }
      }
      // Same org alone is a weak signal
      if (reasons.length === 0 && newOrgNorm === normalize(existing.organization) && newOrgNorm.length > 0) {
        reasons.push("Same organization");
        confidence = Math.max(confidence, 0.3);
      }
    }

    if (reasons.length > 0 && confidence >= 0.3) {
      matches.push({
        existingTaskId: existing.id,
        existingTitle: existing.title,
        reason: reasons.join("; "),
        confidence: Math.round(confidence * 100) / 100,
      });
    }
  }

  matches.sort((a, b) => b.confidence - a.confidence);

  return {
    hasDuplicates: matches.length > 0,
    matches,
  };
}
