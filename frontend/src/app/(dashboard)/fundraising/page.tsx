"use client";

import React from "react";
import { motion } from "framer-motion";
import { HandCoins, CirclePlus } from "lucide-react";
import EmptyState from "@/components/EmptyState";

export default function FundraisingPage() {
    return (
        <div className="w-full">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-3 mb-6 sm:mb-8"
            >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#5B63D6]/20 to-[#5B63D6]/5 border border-[#5B63D6]/15 flex items-center justify-center">
                    <HandCoins className="w-5 h-5 sm:w-6 sm:h-6 text-[#8B92E8]" />
                </div>
                <div>
                    <h1 className="text-white text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                        Fundraising
                    </h1>
                    <p className="text-[#5A6578] text-xs sm:text-sm font-medium mt-0.5">
                        Launch and manage your fundraising campaigns
                    </p>
                </div>
            </motion.div>

            <div className="bg-[#0A0B0F]/40 backdrop-blur-xl rounded-xl sm:rounded-2xl lg:rounded-3xl border border-white/10">
                <EmptyState
                    icon={CirclePlus}
                    title="No campaigns yet"
                    description="Start raising funds for your project. Create your first campaign to get started."
                    action={{ label: "Create Campaign" }}
                />
            </div>
        </div>
    );
}
