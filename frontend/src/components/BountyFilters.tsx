"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BountyFilters as BountyFiltersState } from "@/hooks/useBountyDiscovery";
import type { TaskDifficulty, TaskSortOrder } from "@/types/task-workflow";

const DIFFICULTY_OPTIONS: Array<{ value: TaskDifficulty; label: string }> = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const SORT_OPTIONS: Array<{ value: TaskSortOrder; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "reward_desc", label: "Highest reward" },
  { value: "deadline_asc", label: "Deadline (soonest)" },
];

/** Sentinel used by Select items that map back to "no filter" (empty string). */
const ANY_VALUE = "any";

interface BountyFiltersProps {
  filters: BountyFiltersState;
  onFilterChange: (partial: Partial<BountyFiltersState>) => void;
  onReset: () => void;
}

export function BountyFilters({ filters, onFilterChange, onReset }: BountyFiltersProps) {
  const activeFilterCount = [
    filters.search,
    filters.minReward,
    filters.maxReward,
    filters.difficulty,
    filters.sort,
    filters.technology,
    filters.organization,
  ].filter(Boolean).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <form
      noValidate
      role="search"
      aria-label="Filter bounties"
      onSubmit={handleSubmit}
      className="bg-[#0A0B0F]/40 backdrop-blur-xl rounded-xl sm:rounded-2xl lg:rounded-3xl border border-white/10 shadow-2xl p-4 sm:p-6 lg:p-8 w-full"
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Filter Bounties</h2>
          <span
            className="text-sm text-muted-foreground"
            aria-live="polite"
            aria-atomic="true"
          >
            {activeFilterCount > 0
              ? `${activeFilterCount} filter${activeFilterCount !== 1 ? "s" : ""} active`
              : "No filters active"}
          </span>
        </div>

        {/* Keyword search */}
        <div className="space-y-2">
          <label htmlFor="bounty-search" className="text-sm font-medium text-muted-foreground">
            Search
          </label>
          <Input
            id="bounty-search"
            type="search"
            placeholder="Search by title or description"
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            aria-label="Search bounties"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Min Reward */}
          <div className="space-y-2">
            <label htmlFor="bounty-min-reward" className="text-sm font-medium text-muted-foreground">
              Min Reward
            </label>
            <Input
              id="bounty-min-reward"
              type="number"
              placeholder="0"
              value={filters.minReward}
              onChange={(e) =>
                onFilterChange({ minReward: e.target.value ? Number(e.target.value) : "" })
              }
              inputMode="decimal"
            />
          </div>

          {/* Max Reward */}
          <div className="space-y-2">
            <label htmlFor="bounty-max-reward" className="text-sm font-medium text-muted-foreground">
              Max Reward
            </label>
            <Input
              id="bounty-max-reward"
              type="number"
              placeholder="1000000000"
              value={filters.maxReward}
              onChange={(e) =>
                onFilterChange({ maxReward: e.target.value ? Number(e.target.value) : "" })
              }
              inputMode="decimal"
            />
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <label htmlFor="bounty-difficulty" className="text-sm font-medium text-muted-foreground">
              Difficulty
            </label>
            <Select
              value={filters.difficulty || ANY_VALUE}
              onValueChange={(value) =>
                onFilterChange({
                  difficulty: value === ANY_VALUE ? "" : (value as TaskDifficulty),
                })
              }
            >
              <SelectTrigger id="bounty-difficulty" aria-label="Select difficulty">
                <SelectValue placeholder="Any difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_VALUE}>Any difficulty</SelectItem>
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort */}
          <div className="space-y-2">
            <label htmlFor="bounty-sort" className="text-sm font-medium text-muted-foreground">
              Sort by
            </label>
            <Select
              value={filters.sort}
              onValueChange={(value) => onFilterChange({ sort: value as TaskSortOrder })}
            >
              <SelectTrigger id="bounty-sort" aria-label="Select sort order">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Technology */}
          <div className="space-y-2">
            <label htmlFor="bounty-technology" className="text-sm font-medium text-muted-foreground">
              Technology
            </label>
            <Input
              id="bounty-technology"
              type="text"
              placeholder="e.g. Rust, Soroban"
              value={filters.technology}
              onChange={(e) => onFilterChange({ technology: e.target.value })}
            />
          </div>

          {/* Organization */}
          <div className="space-y-2">
            <label htmlFor="bounty-organization" className="text-sm font-medium text-muted-foreground">
              Organization
            </label>
            <Input
              id="bounty-organization"
              type="text"
              placeholder="e.g. Stellar Development Foundation"
              value={filters.organization}
              onChange={(e) => onFilterChange({ organization: e.target.value })}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={onReset} variant="outline">
            Reset Filters
          </Button>
        </div>
      </div>
    </form>
  );
}
