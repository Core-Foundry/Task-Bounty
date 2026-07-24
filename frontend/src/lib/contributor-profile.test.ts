import { describe, expect, it } from "vitest";

import { calculateContributorProfileCompletion } from "@/lib/contributor-profile";

describe("calculateContributorProfileCompletion", () => {
  it("returns completion percentage and missing fields", () => {
    const result = calculateContributorProfileCompletion(
      {
        name: "Ada Lovelace",
        headline: "Engineer",
        bio: "",
        location: "",
        skills: "",
        website: "",
      },
      [
        { key: "name", label: "Full name" },
        { key: "headline", label: "Headline" },
        { key: "bio", label: "Bio" },
        { key: "location", label: "Location" },
        { key: "skills", label: "Skills" },
        { key: "website", label: "Website" },
      ],
    );

    expect(result.percentage).toBe(33);
    expect(result.completedCount).toBe(2);
    expect(result.totalCount).toBe(6);
    expect(result.missingFields.map((field) => field.key)).toEqual([
      "bio",
      "location",
      "skills",
      "website",
    ]);
  });
});
