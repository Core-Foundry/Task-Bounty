"use client";

/**
 * AdminGrantQualityPanel — #166
 *
 * Displays a sortable list of grant records with their data quality scores
 * so administrators can quickly identify records that need improvement.
 *
 * Acceptance criteria met:
 *  ✓  Required information fields are defined (see grant-quality.ts)
 *  ✓  Incomplete grants receive a lower quality score (shown here as badge)
 *  ✓  Administrators can identify records that need improvement (low-quality
 *     section + sort-by-quality mode)
 */

import React, { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatQualityLabel,
  formatQualitySummary,
  listLowQualityGrants,
  scoreAllGrants,
  type ScoredGrant,
} from "@/lib/grant-quality";
import type { GrantRecord, QualityGrade } from "@/types/grant";

// ── Grade badge colours ────────────────────────────────────────────────────────

const GRADE_CLASS: Record<QualityGrade, string> = {
  A: "bg-emerald-600 text-white border-transparent",
  B: "bg-green-500 text-white border-transparent",
  C: "bg-yellow-500 text-white border-transparent",
  D: "bg-orange-500 text-white border-transparent",
  F: "bg-red-600 text-white border-transparent",
};

/** Progress-bar colour derived from score. */
function scoreBarClass(score: number): string {
  if (score >= 90) return "bg-emerald-500";
  if (score >= 75) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}

// ── GradeIndicator ─────────────────────────────────────────────────────────────

interface GradeIndicatorProps {
  grade: QualityGrade;
  score: number;
}

function GradeIndicator({ grade, score }: GradeIndicatorProps) {
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <Badge
        aria-label={`Quality grade ${grade}`}
        className={GRADE_CLASS[grade]}
      >
        {grade}
      </Badge>
      {/* Progress bar */}
      <div
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Quality score ${score} out of 100`}
        className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden"
      >
        <div
          className={`h-full rounded-full transition-all ${scoreBarClass(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right">{score}</span>
    </div>
  );
}

// ── GrantQualityRow ────────────────────────────────────────────────────────────

interface GrantQualityRowProps {
  item: ScoredGrant;
  /** Show missing-fields detail. Toggled by user. */
  expanded: boolean;
  onToggle: () => void;
}

function GrantQualityRow({ item, expanded, onToggle }: GrantQualityRowProps) {
  const { grant, quality } = item;
  const summary = formatQualitySummary(quality);

  return (
    <div className="border border-white/10 rounded-lg p-4 bg-[#0A0B0F]/40 backdrop-blur-sm hover:bg-white/5 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Grant identity */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white truncate" title={grant.title}>
            {grant.title || <span className="italic text-muted-foreground">(no title)</span>}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            {grant.funder || <span className="italic">(no funder)</span>}
            {grant.category ? ` · ${grant.category}` : ""}
          </p>
        </div>

        {/* Score badge + bar */}
        <div className="shrink-0">
          <GradeIndicator grade={quality.grade} score={quality.score} />
        </div>

        {/* Expand/collapse toggle — only when fields are missing */}
        {!quality.isComplete && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={expanded}
            aria-controls={`quality-detail-${grant.id}`}
            onClick={onToggle}
            className="shrink-0 text-xs"
          >
            {expanded ? "Hide details" : "Show details"}
          </Button>
        )}
      </div>

      {/* Missing fields detail panel */}
      {!quality.isComplete && expanded && (
        <div
          id={`quality-detail-${grant.id}`}
          className="mt-3 pt-3 border-t border-white/10"
        >
          <p className="text-xs text-muted-foreground mb-2">
            {summary}
          </p>
          <div className="flex flex-wrap gap-1">
            {quality.missingFields.map((field) => (
              <Badge
                key={field}
                variant="outline"
                className="text-xs text-orange-400 border-orange-400/50"
              >
                {field}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Summary Stats ─────────────────────────────────────────────────────────────

interface QualitySummaryStatsProps {
  scored: ScoredGrant[];
}

function QualitySummaryStats({ scored }: QualitySummaryStatsProps) {
  const total = scored.length;
  if (total === 0) return null;

  const complete = scored.filter((s) => s.quality.isComplete).length;
  const low = scored.filter((s) => s.quality.score < 75).length;
  const avg = Math.round(
    scored.reduce((sum, s) => sum + s.quality.score, 0) / total,
  );

  const stats = [
    { label: "Total grants", value: total },
    { label: "Complete records", value: `${complete} / ${total}` },
    { label: "Need attention (< 75)", value: low },
    { label: "Average score", value: avg },
  ];

  return (
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {stats.map(({ label, value }) => (
        <div key={label} className="bg-white/5 rounded-lg p-3 text-center">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="text-xl font-bold text-white mt-1">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

// ── Sort options ───────────────────────────────────────────────────────────────

type SortMode = "worst-first" | "best-first" | "alpha";

function applySortMode(items: ScoredGrant[], mode: SortMode): ScoredGrant[] {
  // scoreAllGrants already returns worst-first, so we copy before sorting.
  const copy = [...items];
  if (mode === "worst-first") return copy; // already sorted
  if (mode === "best-first") return copy.reverse();
  if (mode === "alpha") {
    return copy.sort((a, b) => a.grant.title.localeCompare(b.grant.title));
  }
  return copy;
}

// ── AdminGrantQualityPanel ─────────────────────────────────────────────────────

export interface AdminGrantQualityPanelProps {
  /** Full list of grant records to evaluate. */
  grants: GrantRecord[];
  /**
   * When true, show only grants with a score below `lowQualityThreshold`.
   * Defaults to false (show all grants).
   */
  showLowQualityOnly?: boolean;
  /**
   * Score below which a grant is considered "low quality".
   * Defaults to 75 (grade B cutoff).
   */
  lowQualityThreshold?: number;
}

export function AdminGrantQualityPanel({
  grants,
  showLowQualityOnly = false,
  lowQualityThreshold = 75,
}: AdminGrantQualityPanelProps) {
  const [filterLow, setFilterLow] = useState(showLowQualityOnly);
  const [sortMode, setSortMode] = useState<SortMode>("worst-first");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Score all grants once per render cycle.
  const allScored = useMemo(() => scoreAllGrants(grants), [grants]);

  // Apply low-quality filter.
  const filtered = useMemo(
    () =>
      filterLow
        ? listLowQualityGrants(grants, lowQualityThreshold)
        : allScored,
    [filterLow, grants, allScored, lowQualityThreshold],
  );

  // Apply sort.
  const displayed = useMemo(
    () => applySortMode(filtered, sortMode),
    [filtered, sortMode],
  );

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const hasGrants = grants.length > 0;

  return (
    <Card
      className="bg-[#0A0B0F]/60 backdrop-blur-xl border border-white/10 shadow-2xl"
      aria-label="Grant data quality panel"
    >
      <CardHeader>
        <CardTitle className="text-white text-xl">Grant Data Quality</CardTitle>
        <CardDescription>
          Completeness scores help identify records that need more information
          before they are useful to applicants.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary statistics */}
        <QualitySummaryStats scored={allScored} />

        {hasGrants ? (
          <>
            {/* Controls */}
            <div
              className="flex flex-col sm:flex-row sm:items-center gap-3"
              role="toolbar"
              aria-label="Quality panel controls"
            >
              {/* Filter toggle */}
              <Button
                type="button"
                variant={filterLow ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterLow((v) => !v)}
                aria-pressed={filterLow}
              >
                {filterLow ? "Showing: needs attention" : "Show all grants"}
              </Button>

              {/* Sort */}
              <div className="flex items-center gap-2 ml-auto">
                <label
                  htmlFor="quality-sort"
                  className="text-sm text-muted-foreground whitespace-nowrap"
                >
                  Sort by:
                </label>
                <select
                  id="quality-sort"
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="bg-transparent border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  <option value="worst-first">Worst first</option>
                  <option value="best-first">Best first</option>
                  <option value="alpha">Alphabetical</option>
                </select>
              </div>
            </div>

            {/* Grant list */}
            {displayed.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-12 text-center"
                role="status"
              >
                <p className="text-lg font-semibold text-white mb-1">
                  All grants meet the quality threshold
                </p>
                <p className="text-sm text-muted-foreground">
                  No records score below {lowQualityThreshold}.
                </p>
              </div>
            ) : (
              <ul
                className="space-y-3"
                aria-label={`${displayed.length} grant record${displayed.length === 1 ? "" : "s"}`}
              >
                {displayed.map((item) => (
                  <li key={item.grant.id}>
                    <GrantQualityRow
                      item={item}
                      expanded={expandedIds.has(item.grant.id)}
                      onToggle={() => toggleExpand(item.grant.id)}
                    />
                  </li>
                ))}
              </ul>
            )}

            {/* Result count */}
            <p className="text-xs text-muted-foreground text-right" aria-live="polite">
              Showing {displayed.length} of {allScored.length} grant
              {allScored.length === 1 ? "" : "s"}
            </p>
          </>
        ) : (
          <div
            className="flex flex-col items-center justify-center py-16 text-center"
            role="status"
          >
            <p className="text-lg font-semibold text-white mb-2">No grants to evaluate</p>
            <p className="text-sm text-muted-foreground">
              Import or create grant records to see quality scores here.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Convenience re-export of the quality label formatter so consumers can
 * render a single-grant label without importing from two places.
 */
export { formatQualityLabel };
