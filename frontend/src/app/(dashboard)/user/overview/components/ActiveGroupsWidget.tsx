"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, TrendingUp, ChevronRight, Wallet } from "lucide-react";
import Image from "next/image";

import type { DashboardGroup } from "@/constants/dashboard-groups";
import type { DashboardStatistics } from "@/lib/dashboard-stats";

const activityConfig = {
  high: {
    label: "High",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
    dot: "bg-emerald-400",
    glow: "shadow-[0_0_8px_rgba(52,211,153,0.3)]",
  },
  medium: {
    label: "Medium",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    dot: "bg-amber-400",
    glow: "shadow-[0_0_8px_rgba(251,191,36,0.3)]",
  },
  low: {
    label: "Low",
    color: "text-slate-400",
    bg: "bg-slate-400/10",
    border: "border-slate-400/20",
    dot: "bg-slate-400",
    glow: "",
  },
};

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

function GroupRow({
  group,
  index,
  maxFunds,
}: {
  group: DashboardGroup;
  index: number;
  maxFunds: number;
}) {
  const activity = activityConfig[group.activity];
  const fundPercentage = maxFunds > 0 ? (group.totalFunds / maxFunds) * 100 : 0;

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.01, backgroundColor: "rgba(91, 99, 214, 0.04)" }}
      className="group relative flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/[0.04] hover:border-[#5B63D6]/20 transition-all duration-300 cursor-pointer"
    >
      <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#5B63D6]/20 to-[#5B63D6]/5 border border-[#5B63D6]/15 flex items-center justify-center">
        <span className="text-[#8B92E8] text-xs sm:text-sm font-bold">#{index + 1}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-white text-sm sm:text-[15px] font-semibold truncate">
            {group.name}
          </h3>
          <div
            className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium border ${activity.bg} ${activity.color} ${activity.border}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${activity.dot} ${activity.glow} animate-pulse`} />
            {activity.label}
          </div>
        </div>

        <div className="relative w-full h-1.5 rounded-full bg-white/[0.04] overflow-hidden mb-1.5">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#5B63D6] to-[#7C83EF]"
            initial={{ width: 0 }}
            animate={{ width: `${fundPercentage}%` }}
            transition={{ delay: 0.3 + index * 0.1, duration: 0.8, ease: "easeOut" }}
          />
        </div>

        <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-[#7A8BA0]">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {group.members} members
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {group.recentTransactions} txns
          </span>
          <div className="flex items-center -space-x-1.5 ml-auto">
            {group.tokens.slice(0, 3).map((token, i) => (
              <div
                key={`${token.name}-${i}`}
                className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-[#0A0B0F] overflow-hidden bg-[#1a1d29]"
              >
                <Image
                  src={token.icon}
                  alt={token.name}
                  width={20}
                  height={20}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            {group.tokens.length > 3 && (
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-[#0A0B0F] bg-[#1a1d29] flex items-center justify-center">
                <span className="text-[8px] text-[#7A8BA0]">+{group.tokens.length - 3}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 text-right">
        <p className="text-white text-sm sm:text-base font-bold tabular-nums">
          {formatCurrency(group.totalFunds)}
        </p>
        <p className="text-[#5B6FE8] text-[10px] sm:text-xs font-medium mt-0.5">total funds</p>
      </div>

      <ChevronRight className="w-4 h-4 text-[#3A3F5C] group-hover:text-[#5B63D6] transition-colors flex-shrink-0" />
    </motion.div>
  );
}

export default function ActiveGroupsWidget() {
  const [stats, setStats] = useState<DashboardStatistics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        const response = await fetch("/api/dashboard/stats", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load dashboard stats (${response.status})`);
        }

        const body = (await response.json()) as {
          ok: boolean;
          stats: DashboardStatistics;
        };

        if (!body.ok) {
          throw new Error("Dashboard stats response was not successful");
        }

        if (!cancelled) {
          setStats(body.stats);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load dashboard statistics",
          );
        }
      }
    }

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, []);

  const groups = stats?.groups ?? [];
  const maxFunds = stats?.maxFunds ?? 0;
  const totalAllFunds = stats?.totalFunds ?? 0;
  const totalMembers = stats?.totalMembers ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <div className="bg-[#0A0B0F]/60 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-white/[0.06] shadow-[0_8px_40px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="px-4 sm:px-6 pt-5 sm:pt-6 pb-4 sm:pb-5 border-b border-white/[0.04]">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-[14px] bg-gradient-to-br from-[#5B63D6] to-[#4149B8] flex items-center justify-center shadow-[0_4px_16px_rgba(91,99,214,0.25)]">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h2 className="text-white text-base sm:text-lg font-bold tracking-tight">
                  Most Active Groups
                </h2>
                <p className="text-[#5A6578] text-[11px] sm:text-xs font-medium mt-0.5">
                  Your top performing payment groups
                </p>
              </div>
            </div>
            <button className="text-[10px] sm:text-xs text-[#5B63D6] hover:text-[#7C83EF] font-semibold transition-colors px-3 py-1.5 rounded-full border border-[#5B63D6]/15 hover:border-[#5B63D6]/30 hover:bg-[#5B63D6]/5">
              View All
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-white/[0.02] rounded-lg sm:rounded-xl px-3 py-2 sm:px-4 sm:py-3 border border-white/[0.03]">
              <p className="text-[#5A6578] text-[10px] sm:text-[11px] font-medium uppercase tracking-wider">
                Total Funds
              </p>
              <p className="text-white text-sm sm:text-lg font-bold mt-0.5 tabular-nums">
                {stats ? formatCurrency(totalAllFunds) : "—"}
              </p>
            </div>
            <div className="bg-white/[0.02] rounded-lg sm:rounded-xl px-3 py-2 sm:px-4 sm:py-3 border border-white/[0.03]">
              <p className="text-[#5A6578] text-[10px] sm:text-[11px] font-medium uppercase tracking-wider">
                Active Groups
              </p>
              <p className="text-white text-sm sm:text-lg font-bold mt-0.5">
                {stats ? groups.length : "—"}
              </p>
            </div>
            <div className="bg-white/[0.02] rounded-lg sm:rounded-xl px-3 py-2 sm:px-4 sm:py-3 border border-white/[0.03]">
              <p className="text-[#5A6578] text-[10px] sm:text-[11px] font-medium uppercase tracking-wider">
                Members
              </p>
              <p className="text-white text-sm sm:text-lg font-bold mt-0.5">
                {stats ? totalMembers : "—"}
              </p>
            </div>
          </div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="px-3 sm:px-4 py-2 sm:py-3 space-y-1 sm:space-y-1.5 max-h-[420px] overflow-y-auto
            [&::-webkit-scrollbar]:w-1 
            [&::-webkit-scrollbar-track]:bg-transparent 
            [&::-webkit-scrollbar-thumb]:bg-white/10 
            [&::-webkit-scrollbar-thumb]:rounded-full
            [&::-webkit-scrollbar-thumb:hover]:bg-white/20"
        >
          {error ? (
            <p className="text-center text-sm text-red-400 py-8">{error}</p>
          ) : !stats ? (
            <p className="text-center text-sm text-[#5A6578] py-8">Loading groups…</p>
          ) : (
            groups.map((group, index) => (
              <GroupRow key={group.id} group={group} index={index} maxFunds={maxFunds} />
            ))
          )}
        </motion.div>

        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-white/[0.04] bg-white/[0.01]">
          <p className="text-[#3A3F5C] text-[10px] sm:text-[11px] text-center font-medium">
            {stats
              ? `Showing top ${groups.length} groups by activity • Updated just now`
              : "Loading dashboard statistics…"}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
