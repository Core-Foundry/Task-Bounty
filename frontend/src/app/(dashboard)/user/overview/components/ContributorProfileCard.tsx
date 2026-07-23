"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle, UserRound } from "lucide-react";
import React from "react";

import {
  calculateContributorProfileCompletion,
  type ContributorProfileField,
} from "@/lib/contributor-profile";

const PROFILE_FIELDS: ContributorProfileField[] = [
  { key: "name", label: "Full name" },
  { key: "headline", label: "Headline" },
  { key: "bio", label: "Bio" },
  { key: "location", label: "Location" },
  { key: "skills", label: "Skills" },
  { key: "website", label: "Website" },
];

export default function ContributorProfileCard() {
  const [profile, setProfile] = React.useState<Record<string, string | undefined>>({
    name: "Alicia Chen",
    headline: "Product designer",
    bio: "",
    location: "",
    skills: "UI systems, design reviews",
    website: "",
  });

  const completion = React.useMemo(
    () => calculateContributorProfileCompletion(profile, PROFILE_FIELDS),
    [profile],
  );

  const updateField = (key: string, value: string) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border border-[#2F3547] bg-[#111827]/90 p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5B63D6]/15 text-[#8B92E8]">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Contributor profile</h2>
            <p className="text-sm text-[#5A6578]">
              Finish the profile to make your work easier to discover.
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold text-white">{completion.percentage}%</div>
          <div className="text-xs uppercase tracking-[0.2em] text-[#5A6578]">
            complete
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="h-2 overflow-hidden rounded-full bg-[#1F2937]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#5B63D6] to-[#8B92E8] transition-all duration-300"
            style={{ width: `${completion.percentage}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {PROFILE_FIELDS.map((field) => {
          const isComplete = Boolean(profile[field.key]?.trim());
          const isTextArea = field.key === "bio" || field.key === "skills";

          return (
            <div
              key={field.key}
              className={`rounded-xl border px-3 py-3 ${
                isComplete
                  ? "border-emerald-500/20 bg-emerald-500/10"
                  : "border-[#2F3547] bg-[#0F172A]"
              }`}
            >
              <div className="flex items-start gap-2">
                {isComplete ? (
                  <CheckCircle2 className="mt-1 h-4 w-4 text-emerald-400" />
                ) : (
                  <Circle className="mt-1 h-4 w-4 text-[#5A6578]" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm font-medium text-white">{field.label}</label>
                    <span className="text-xs text-[#5A6578]">
                      {isComplete ? "Filled" : "Missing"}
                    </span>
                  </div>
                  {isTextArea ? (
                    <textarea
                      value={profile[field.key] ?? ""}
                      onChange={(event) => updateField(field.key, event.target.value)}
                      rows={2}
                      className="mt-2 w-full rounded-lg border border-[#2F3547] bg-[#111827] px-3 py-2 text-sm text-white outline-none ring-0"
                      placeholder={`Add your ${field.label.toLowerCase()}`}
                    />
                  ) : (
                    <input
                      value={profile[field.key] ?? ""}
                      onChange={(event) => updateField(field.key, event.target.value)}
                      className="mt-2 w-full rounded-lg border border-[#2F3547] bg-[#111827] px-3 py-2 text-sm text-white outline-none ring-0"
                      placeholder={`Add your ${field.label.toLowerCase()}`}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {completion.missingFields.length > 0 && (
        <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
          <p className="text-sm font-medium text-amber-300">Suggested next steps</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-100/90">
            {completion.missingFields.slice(0, 3).map((field) => (
              <li key={field.key}>• Add your {field.label.toLowerCase()}</li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
