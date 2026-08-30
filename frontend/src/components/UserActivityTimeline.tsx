"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bookmark,
  Send,
  UserCheck,
  Award,
  FileCheck2,
  Clock,
  Filter,
  RefreshCw,
  ExternalLink,
  Layers,
} from "lucide-react";
import type { ActivityRecord, ActivityType } from "@/types/activity";
import { useActivityTimeline } from "@/hooks/useActivityTimeline";

const ACTIVITY_ICONS: Record<
  ActivityType,
  {
    icon: React.ElementType;
    color: string;
    bg: string;
    border: string;
  }
> = {
  grant_saved: {
    icon: Bookmark,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
  grant_unsaved: {
    icon: Bookmark,
    color: "text-slate-400",
    bg: "bg-slate-400/10",
    border: "border-slate-400/20",
  },
  application_submitted: {
    icon: Send,
    color: "text-[#8B92E8]",
    bg: "bg-[#5B63D6]/15",
    border: "border-[#5B63D6]/30",
  },
  application_status_updated: {
    icon: FileCheck2,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
  account_updated: {
    icon: UserCheck,
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/20",
  },
  profile_updated: {
    icon: UserCheck,
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/20",
  },
  bounty_created: {
    icon: Award,
    color: "text-indigo-400",
    bg: "bg-indigo-400/10",
    border: "border-indigo-400/20",
  },
  submission_created: {
    icon: Send,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/20",
  },
  submission_reviewed: {
    icon: FileCheck2,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
  comment_posted: {
    icon: Layers,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
};

function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return isoString;
  }
}

export interface UserActivityTimelineProps {
  userId?: string | null;
  className?: string;
  limit?: number;
}

export function UserActivityTimeline({
  userId = "current-user",
  className = "",
}: UserActivityTimelineProps) {
  const [filterType, setFilterType] = useState<ActivityType | "all">("all");
  const activeType = filterType === "all" ? undefined : filterType;

  const { activities, isLoading, error, refetch } = useActivityTimeline({
    userId: userId || "default-user",
    type: activeType,
  });

  return (
    <div
      className={`rounded-2xl border border-[#2F3547] bg-[#111827]/90 p-5 sm:p-6 shadow-sm ${className}`}
      data-testid="user-activity-timeline"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#2F3547]/60">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#5B63D6]/20 to-[#5B63D6]/5 border border-[#5B63D6]/15 text-[#8B92E8]">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Activity Timeline</h2>
            <p className="text-xs sm:text-sm text-[#5A6578]">
              Your recent applications, saved grants, and account actions
            </p>
          </div>
        </div>

        {/* Filter and Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="relative flex items-center">
            <Filter className="absolute left-2.5 h-3.5 w-3.5 text-[#5A6578]" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as ActivityType | "all")}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#0F172A] border border-[#2F3547] text-[#A0AEC0] hover:text-white focus:outline-none focus:border-[#5B63D6] transition-colors"
              aria-label="Filter activity type"
            >
              <option value="all">All Activities</option>
              <option value="grant_saved">Saved Grants</option>
              <option value="application_submitted">Applications</option>
              <option value="account_updated">Account Updates</option>
              <option value="submission_created">Bounty Submissions</option>
            </select>
          </div>

          <button
            onClick={() => void refetch()}
            className="p-1.5 rounded-xl border border-[#2F3547] bg-[#0F172A] text-[#5A6578] hover:text-white hover:border-[#5B63D6]/40 transition-colors"
            title="Refresh activities"
            aria-label="Refresh activities"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Timeline List */}
      <div className="mt-6 relative">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-[#5A6578]">
            Loading your timeline…
          </div>
        ) : error ? (
          <div className="py-8 text-center text-sm text-rose-400">{error}</div>
        ) : activities.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#5A6578]">
            No activities recorded yet.
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-[#5B63D6]/40 before:via-[#2F3547] before:to-transparent">
            <AnimatePresence>
              {activities.map((activity, idx) => {
                const config = ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.account_updated;
                const Icon = config.icon;

                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                    className="relative flex items-start gap-4 group"
                  >
                    {/* Timeline Node Dot */}
                    <div
                      className={`absolute -left-6 top-1 h-6 w-6 rounded-full border ${config.border} ${config.bg} flex items-center justify-center shadow-sm z-10`}
                    >
                      <Icon className={`h-3 w-3 ${config.color}`} />
                    </div>

                    {/* Content Card */}
                    <div className="flex-1 rounded-xl border border-[#2F3547]/80 bg-[#0F172A]/70 p-3.5 sm:p-4 hover:border-[#5B63D6]/30 transition-all duration-200">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-white group-hover:text-[#8B92E8] transition-colors">
                          {activity.title}
                        </h3>
                        <span className="text-[11px] font-medium text-[#5A6578] whitespace-nowrap">
                          {formatTimestamp(activity.timestamp)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#8A99AD] leading-relaxed">
                        {activity.description}
                      </p>

                      {/* Metadata badges if present */}
                      {activity.metadata && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          {activity.metadata.grantName && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-[#5B63D6]/10 border border-[#5B63D6]/20 text-[#8B92E8]">
                              <Bookmark className="h-2.5 w-2.5" />
                              {String(activity.metadata.grantName)}
                            </span>
                          )}
                          {activity.metadata.status && (
                            <span className="inline-flex items-center text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                              {String(activity.metadata.status)}
                            </span>
                          )}
                          {activity.metadata.taskTitle && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300">
                              <ExternalLink className="h-2.5 w-2.5" />
                              {String(activity.metadata.taskTitle)}
                            </span>
                          )}
                          {Array.isArray(activity.metadata.updatedFields) && (
                            <span className="text-[11px] text-[#5A6578]">
                              Updated: {activity.metadata.updatedFields.join(", ")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
