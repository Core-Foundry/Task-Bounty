import { describe, expect, it } from "vitest";

import { calculateContributorProfileCompletion } from "@/lib/contributor-profile";
import {
  PARTIAL_CONTRIBUTOR_PROFILE,
  PROFILE_FIELD_DEFINITIONS,
} from "@/test/mock-data";

describe("calculateContributorProfileCompletion", () => {
  it("returns completion percentage and missing fields", () => {
    const result = calculateContributorProfileCompletion(
      PARTIAL_CONTRIBUTOR_PROFILE,
      PROFILE_FIELD_DEFINITIONS,
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
