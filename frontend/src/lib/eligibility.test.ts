import { describe, it, expect } from "vitest";
import {
  validateEligibility,
  normalizeEligibility,
  formatEligibilityForDisplay,
  DEFAULT_ELIGIBILITY,
} from "@/lib/eligibility";

describe("validateEligibility", () => {
  it("returns valid for empty input", () => {
    const result = validateEligibility({});
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns valid for correct input", () => {
    const result = validateEligibility({
      applicantType: "individual",
      projectStage: "alpha",
      minTeamSize: 1,
      maxTeamSize: 5,
      eligibleLocations: ["US", "EU"],
      customRequirements: ["Must be 18+"],
    });
    expect(result.valid).toBe(true);
  });

  it("rejects invalid applicantType", () => {
    const result = validateEligibility({ applicantType: "invalid" as never });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("applicantType");
  });

  it("rejects invalid projectStage", () => {
    const result = validateEligibility({ projectStage: "invalid" as never });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("projectStage");
  });

  it("rejects negative team sizes", () => {
    const result = validateEligibility({ minTeamSize: -1 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("minTeamSize");
  });

  it("rejects minTeamSize > maxTeamSize", () => {
    const result = validateEligibility({ minTeamSize: 10, maxTeamSize: 5 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("exceed");
  });

  it("rejects empty location strings", () => {
    const result = validateEligibility({ eligibleLocations: ["US", "  "] });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("location");
  });
});

describe("normalizeEligibility", () => {
  it("returns defaults for undefined", () => {
    const result = normalizeEligibility(undefined);
    expect(result).toEqual(DEFAULT_ELIGIBILITY);
  });

  it("trims and filters locations", () => {
    const result = normalizeEligibility({
      eligibleLocations: ["  US  ", "", "  EU  "],
    });
    expect(result.eligibleLocations).toEqual(["US", "EU"]);
  });

  it("trims and filters custom requirements", () => {
    const result = normalizeEligibility({
      customRequirements: ["  Must be 18+  ", "  ", "  KYC required  "],
    });
    expect(result.customRequirements).toEqual(["Must be 18+", "KYC required"]);
  });
});

describe("formatEligibilityForDisplay", () => {
  it("returns empty array for default eligibility", () => {
    const result = formatEligibilityForDisplay(DEFAULT_ELIGIBILITY);
    expect(result).toHaveLength(0);
  });

  it("formats locations", () => {
    const result = formatEligibilityForDisplay({
      ...DEFAULT_ELIGIBILITY,
      eligibleLocations: ["US", "EU"],
    });
    const loc = result.find((r) => r.label === "Eligible Locations");
    expect(loc).toBeDefined();
    expect(loc!.value).toBe("US, EU");
  });

  it("formats applicant type", () => {
    const result = formatEligibilityForDisplay({
      ...DEFAULT_ELIGIBILITY,
      applicantType: "individual",
    });
    const at = result.find((r) => r.label === "Applicant Type");
    expect(at).toBeDefined();
    expect(at!.value).toBe("Individual");
  });

  it("formats team size range", () => {
    const result = formatEligibilityForDisplay({
      ...DEFAULT_ELIGIBILITY,
      minTeamSize: 2,
      maxTeamSize: 5,
    });
    const ts = result.find((r) => r.label === "Team Size");
    expect(ts).toBeDefined();
    expect(ts!.value).toBe("2–5 members");
  });
});
