/**
 * Grant eligibility criteria — structured fields that grant creators
 * can define to communicate who is eligible for a given grant/task.
 *
 * Issue #157: Implement Grant Eligibility Criteria Fields
 */

export type EligibilityApplicantType =
  | "individual"
  | "organization"
  | "team"
  | "student"
  | "any";

export type EligibilityProjectStage =
  | "idea"
  | "prototype"
  | "alpha"
  | "beta"
  | "production"
  | "any";

export interface EligibilityCriteria {
  /** Geographic restrictions (e.g. "US", "EU", "Global"). Empty means no restriction. */
  eligibleLocations: string[];
  /** Who can apply. */
  applicantType: EligibilityApplicantType;
  /** Minimum project stage required. */
  projectStage: EligibilityProjectStage;
  /** Minimum team size (0 = no requirement). */
  minTeamSize: number;
  /** Maximum team size (0 = no limit). */
  maxTeamSize: number;
  /** Custom free-text requirements. */
  customRequirements: string[];
}

/** Default eligibility: open to everyone. */
export const DEFAULT_ELIGIBILITY: EligibilityCriteria = {
  eligibleLocations: [],
  applicantType: "any",
  projectStage: "any",
  minTeamSize: 0,
  maxTeamSize: 0,
  customRequirements: [],
};

export interface EligibilityValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate eligibility criteria input from a grant creator.
 */
export function validateEligibility(
  criteria: Partial<EligibilityCriteria>,
): EligibilityValidationResult {
  const errors: string[] = [];

  if (
    criteria.applicantType &&
    !["individual", "organization", "team", "student", "any"].includes(
      criteria.applicantType,
    )
  ) {
    errors.push(`Invalid applicantType: ${criteria.applicantType}`);
  }

  if (
    criteria.projectStage &&
    !["idea", "prototype", "alpha", "beta", "production", "any"].includes(
      criteria.projectStage,
    )
  ) {
    errors.push(`Invalid projectStage: ${criteria.projectStage}`);
  }

  if (
    typeof criteria.minTeamSize === "number" &&
    criteria.minTeamSize < 0
  ) {
    errors.push("minTeamSize cannot be negative.");
  }

  if (
    typeof criteria.maxTeamSize === "number" &&
    criteria.maxTeamSize < 0
  ) {
    errors.push("maxTeamSize cannot be negative.");
  }

  if (
    typeof criteria.minTeamSize === "number" &&
    typeof criteria.maxTeamSize === "number" &&
    criteria.minTeamSize > 0 &&
    criteria.maxTeamSize > 0 &&
    criteria.minTeamSize > criteria.maxTeamSize
  ) {
    errors.push("minTeamSize cannot exceed maxTeamSize.");
  }

  if (
    Array.isArray(criteria.eligibleLocations)
  ) {
    for (const loc of criteria.eligibleLocations) {
      if (typeof loc !== "string" || loc.trim().length === 0) {
        errors.push("Each eligible location must be a non-empty string.");
        break;
      }
    }
  }

  if (
    Array.isArray(criteria.customRequirements)
  ) {
    for (const req of criteria.customRequirements) {
      if (typeof req !== "string" || req.trim().length === 0) {
        errors.push("Each custom requirement must be a non-empty string.");
        break;
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Merge partial eligibility input with defaults.
 */
export function normalizeEligibility(
  input: Partial<EligibilityCriteria> | undefined,
): EligibilityCriteria {
  if (!input) return { ...DEFAULT_ELIGIBILITY };
  return {
    eligibleLocations: Array.isArray(input.eligibleLocations)
      ? input.eligibleLocations.map((l) => l.trim()).filter((l) => l.length > 0)
      : [],
    applicantType: input.applicantType ?? "any",
    projectStage: input.projectStage ?? "any",
    minTeamSize: typeof input.minTeamSize === "number" ? input.minTeamSize : 0,
    maxTeamSize: typeof input.maxTeamSize === "number" ? input.maxTeamSize : 0,
    customRequirements: Array.isArray(input.customRequirements)
      ? input.customRequirements.map((r) => r.trim()).filter((r) => r.length > 0)
      : [],
  };
}

/**
 * Format eligibility criteria for display on the grant details page.
 * Returns a flat array of label/value pairs for rendering.
 */
export interface EligibilityDisplayItem {
  label: string;
  value: string;
}

export function formatEligibilityForDisplay(
  criteria: EligibilityCriteria,
): EligibilityDisplayItem[] {
  const items: EligibilityDisplayItem[] = [];

  if (criteria.eligibleLocations.length > 0) {
    items.push({
      label: "Eligible Locations",
      value: criteria.eligibleLocations.join(", "),
    });
  }

  if (criteria.applicantType !== "any") {
    items.push({
      label: "Applicant Type",
      value: criteria.applicantType.charAt(0).toUpperCase() + criteria.applicantType.slice(1),
    });
  }

  if (criteria.projectStage !== "any") {
    items.push({
      label: "Project Stage",
      value: criteria.projectStage.charAt(0).toUpperCase() + criteria.projectStage.slice(1),
    });
  }

  if (criteria.minTeamSize > 0 || criteria.maxTeamSize > 0) {
    if (criteria.minTeamSize > 0 && criteria.maxTeamSize > 0) {
      items.push({
        label: "Team Size",
        value: `${criteria.minTeamSize}–${criteria.maxTeamSize} members`,
      });
    } else if (criteria.minTeamSize > 0) {
      items.push({
        label: "Min Team Size",
        value: `${criteria.minTeamSize}+ members`,
      });
    } else if (criteria.maxTeamSize > 0) {
      items.push({
        label: "Max Team Size",
        value: `Up to ${criteria.maxTeamSize} members`,
      });
    }
  }

  if (criteria.customRequirements.length > 0) {
    items.push({
      label: "Additional Requirements",
      value: criteria.customRequirements.join("; "),
    });
  }

  return items;
}
