/**
 * Client-side form validation utilities for TaskBounty
 *
 * Provides reusable validation functions to prevent invalid bounty data before submission.
 * Covers: empty values, length validation, numeric validation, wallet address validation,
 * deadline validation, reward validation, and full form validation.
 */

import { createError, ErrorCodes } from "@/lib/errors";

// ============================================================================
// Types
// ============================================================================

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

export interface FieldValidation {
  field: string;
  error: string;
}

export interface FormValidationResult {
  ok: boolean;
  errors: FieldValidation[];
}

// ============================================================================
// Constants
// ============================================================================

/** Minimum reward in stroops (0.1 XLM = 1,000,000 stroops) */
export const MIN_REWARD_STROOPS = 1_000_000;

/** Maximum reward in stroops (1,000,000 XLM) — sensible upper bound */
export const MAX_REWARD_STROOPS = 10_000_000_000_000;

/** Maximum deadline offset from now in seconds (365 days) */
export const MAX_DEADLINE_OFFSET_SECONDS = 365 * 24 * 60 * 60;

/** Stellar public key regex: starts with G, 56 chars, base32 alphabet (no 0/O/I/L) */
const STELLAR_PUBLIC_KEY_REGEX = /^G[A-Z2-7]{55}$/;

/** Minimum title length */
export const MIN_TITLE_LENGTH = 3;

/** Maximum title length */
export const MAX_TITLE_LENGTH = 120;

/** Minimum description length */
export const MIN_DESCRIPTION_LENGTH = 10;

/** Maximum description length */
export const MAX_DESCRIPTION_LENGTH = 5000;

/** Minimum work URL length */
export const MIN_WORK_URL_LENGTH = 5;

/** Maximum work URL length */
export const MAX_WORK_URL_LENGTH = 2000;

/** Minimum max_submissions */
export const MIN_MAX_SUBMISSIONS = 1;

/** Maximum max_submissions */
export const MAX_MAX_SUBMISSIONS = 1000;

// ============================================================================
// Core Validation Functions
// ============================================================================

/**
 * Validates that a value is not empty (null, undefined, or blank string).
 *
 * @param value - The value to check
 * @param fieldName - Human-readable field name for the error message
 * @returns ValidationResult with ok=false and error message if empty
 */
export function validateRequired(
  value: string | null | undefined,
  fieldName: string,
): ValidationResult {
  if (value === null || value === undefined) {
    return { ok: false, error: `${fieldName} is required.` };
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return { ok: false, error: `${fieldName} is required.` };
  }

  return { ok: true };
}

/**
 * Validates that a string has at least `min` characters (after trimming).
 *
 * @param value - The string to check
 * @param min - Minimum length (inclusive)
 * @param fieldName - Human-readable field name for the error message
 * @returns ValidationResult
 */
export function validateMinLength(
  value: string,
  min: number,
  fieldName: string,
): ValidationResult {
  if (value.trim().length < min) {
    return {
      ok: false,
      error: `${fieldName} must be at least ${min} characters.`,
    };
  }

  return { ok: true };
}

/**
 * Validates that a string does not exceed `max` characters.
 *
 * @param value - The string to check
 * @param max - Maximum length (inclusive)
 * @param fieldName - Human-readable field name for the error message
 * @returns ValidationResult
 */
export function validateMaxLength(
  value: string,
  max: number,
  fieldName: string,
): ValidationResult {
  if (value.trim().length > max) {
    return {
      ok: false,
      error: `${fieldName} must be no more than ${max} characters.`,
    };
  }

  return { ok: true };
}

/**
 * Validates that a string value represents a valid positive number.
 * Accepts integers and decimal values.
 *
 * @param value - The string value to check
 * @param fieldName - Human-readable field name for the error message
 * @returns ValidationResult
 */
export function validateNumeric(
  value: string,
  fieldName: string,
): ValidationResult {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return { ok: false, error: `${fieldName} must be a valid number.` };
  }

  // Allow negative numbers for potential edge cases, but primarily check numeric
  if (isNaN(Number(trimmed))) {
    return { ok: false, error: `${fieldName} must be a valid number.` };
  }

  // Ensure it's finite
  if (!isFinite(Number(trimmed))) {
    return { ok: false, error: `${fieldName} must be a finite number.` };
  }

  return { ok: true };
}

/**
 * Validates that a string value represents a positive integer.
 *
 * @param value - The string value to check
 * @param fieldName - Human-readable field name for the error message
 * @returns ValidationResult
 */
export function validatePositiveInteger(
  value: string,
  fieldName: string,
): ValidationResult {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return {
      ok: false,
      error: `${fieldName} must be a positive whole number.`,
    };
  }

  const num = Number(trimmed);

  if (!Number.isInteger(num)) {
    return {
      ok: false,
      error: `${fieldName} must be a whole number.`,
    };
  }

  if (num < 0) {
    return {
      ok: false,
      error: `${fieldName} must be a positive number.`,
    };
  }

  return { ok: true };
}

/**
 * Validates that a value is within a given numeric range (inclusive).
 *
 * @param value - The numeric value to check
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @param fieldName - Human-readable field name for the error message
 * @returns ValidationResult
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  fieldName: string,
): ValidationResult {
  if (value < min) {
    return {
      ok: false,
      error: `${fieldName} must be at least ${min}.`,
    };
  }

  if (value > max) {
    return {
      ok: false,
      error: `${fieldName} must be no more than ${max}.`,
    };
  }

  return { ok: true };
}

// ============================================================================
// Stellar-Specific Validations
// ============================================================================

/**
 * Validates a Stellar wallet/public key address.
 *
 * Stellar addresses:
 * - Start with 'G'
 * - Are 56 characters long
 * - Use base32 alphabet (uppercase A-Z, digits 2-7, no 0/O/I/L)
 *
 * @param address - The Stellar public key to validate
 * @returns ValidationResult
 */
export function validateStellarAddress(
  address: string | null | undefined,
): ValidationResult {
  if (!address || address.trim().length === 0) {
    return { ok: false, error: "Wallet address is required." };
  }

  const trimmed = address.trim();

  if (!trimmed.startsWith("G")) {
    return {
      ok: false,
      error: "Invalid wallet address. Stellar addresses start with 'G'.",
    };
  }

  if (trimmed.length !== 56) {
    return {
      ok: false,
      error:
        "Invalid wallet address. Stellar addresses must be exactly 56 characters.",
    };
  }

  if (!STELLAR_PUBLIC_KEY_REGEX.test(trimmed)) {
    return {
      ok: false,
      error:
        "Invalid wallet address. Address contains invalid characters.",
    };
  }

  return { ok: true };
}

// ============================================================================
// Email Validation
// ============================================================================

/**
 * Validates an email address format.
 *
 * @param email - The email address to validate
 * @returns ValidationResult
 */
export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();

  if (trimmed.length === 0) {
    return { ok: false, error: "Email address is required." };
  }

  // Basic email regex - checks for standard email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmed)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  if (trimmed.length > 254) {
    return { ok: false, error: "Email address is too long." };
  }

  return { ok: true };
}

// ============================================================================
// Task Bounty Specific Validations
// ============================================================================

/**
 * Validates a task title.
 *
 * @param title - The task title
 * @returns ValidationResult
 */
export function validateTaskTitle(title: string | null | undefined): ValidationResult {
  const required = validateRequired(title, "Title");
  if (!required.ok) return required;

  const minLen = validateMinLength(title!, MIN_TITLE_LENGTH, "Title");
  if (!minLen.ok) return minLen;

  const maxLen = validateMaxLength(title!, MAX_TITLE_LENGTH, "Title");
  if (!maxLen.ok) return maxLen;

  return { ok: true };
}

/**
 * Validates a task description.
 *
 * @param description - The task description
 * @returns ValidationResult
 */
export function validateTaskDescription(
  description: string | null | undefined,
): ValidationResult {
  const required = validateRequired(description, "Description");
  if (!required.ok) return required;

  const minLen = validateMinLength(description!, MIN_DESCRIPTION_LENGTH, "Description");
  if (!minLen.ok) return minLen;

  const maxLen = validateMaxLength(
    description!,
    MAX_DESCRIPTION_LENGTH,
    "Description",
  );
  if (!maxLen.ok) return maxLen;

  return { ok: true };
}

/**
 * Validates a reward amount against smart contract constraints.
 *
 * Constraints:
 * - Must be a valid positive number
 * - Minimum: 1,000,000 stroops (0.1 XLM)
 * - Maximum: sensible upper bound
 *
 * @param rewardStr - The reward amount as a string (from form input)
 * @returns ValidationResult
 */
export function validateReward(rewardStr: string | null | undefined): ValidationResult {
  const required = validateRequired(rewardStr, "Reward");
  if (!required.ok) return required;

  const numeric = validateNumeric(rewardStr!, "Reward");
  if (!numeric.ok) return numeric;

  const reward = parseFloat(rewardStr!);

  if (reward <= 0) {
    return { ok: false, error: "Reward must be greater than zero." };
  }

  // Convert to stroops (7 decimals for Stellar tokens)
  const stroops = Math.round(reward * 10_000_000);

  if (stroops < MIN_REWARD_STROOPS) {
    return {
      ok: false,
      error: `Reward is too low. Minimum reward is 0.1 XLM (${MIN_REWARD_STROOPS.toLocaleString()} stroops).`,
    };
  }

  if (stroops > MAX_REWARD_STROOPS) {
    return {
      ok: false,
      error: `Reward is too high. Maximum reward is 1,000,000 XLM.`,
    };
  }

  return { ok: true };
}

/**
 * Validates a task deadline.
 *
 * Constraints (matching smart contract):
 * - Must be a valid positive integer (Unix timestamp in seconds)
 * - Must be in the future (now < deadline)
 * - Must be no more than 365 days from now
 *
 * @param deadlineStr - The deadline as a string or number (Unix timestamp in seconds)
 * @returns ValidationResult
 */
export function validateDeadline(deadlineStr: string | null | undefined): ValidationResult {
  const required = validateRequired(deadlineStr, "Deadline");
  if (!required.ok) return required;

  const numeric = validateNumeric(deadlineStr!, "Deadline");
  if (!numeric.ok) return numeric;

  const deadline = parseInt(deadlineStr!, 10);
  const now = Math.floor(Date.now() / 1000);

  if (deadline <= now) {
    return { ok: false, error: "Deadline must be in the future." };
  }

  const maxDeadline = now + MAX_DEADLINE_OFFSET_SECONDS;

  if (deadline > maxDeadline) {
    return {
      ok: false,
      error: "Deadline must be within 365 days from now.",
    };
  }

  return { ok: true };
}

/**
 * Validates max_submissions for a task.
 *
 * Constraints:
 * - Must be a positive integer
 * - At least 1
 * - No more than 1000
 *
 * @param maxSubmissionsStr - Max submissions as a string or number
 * @returns ValidationResult
 */
export function validateMaxSubmissions(
  maxSubmissionsStr: string | number | null | undefined,
): ValidationResult {
  const str =
    maxSubmissionsStr === null || maxSubmissionsStr === undefined
      ? ""
      : String(maxSubmissionsStr);

  const required = validateRequired(str, "Max submissions");
  if (!required.ok) return required;

  const positiveInt = validatePositiveInteger(str, "Max submissions");
  if (!positiveInt.ok) return positiveInt;

  const value = parseInt(str, 10);

  return validateRange(value, MIN_MAX_SUBMISSIONS, MAX_MAX_SUBMISSIONS, "Max submissions");
}

/**
 * Validates a work URL for task submissions.
 *
 * @param url - The work URL (IPFS, Arweave, GitHub, etc.)
 * @returns ValidationResult
 */
export function validateWorkUrl(url: string | null | undefined): ValidationResult {
  const required = validateRequired(url, "Work URL");
  if (!required.ok) return required;

  const minLen = validateMinLength(url!, MIN_WORK_URL_LENGTH, "Work URL");
  if (!minLen.ok) return minLen;

  const maxLen = validateMaxLength(url!, MAX_WORK_URL_LENGTH, "Work URL");
  if (!maxLen.ok) return maxLen;

  // Basic URL validation
  const trimmed = url!.trim();
  try {
    const parsed = new URL(trimmed);
    if (!["http:", "https:", "ipfs:", "ar:"].includes(parsed.protocol)) {
      return {
        ok: false,
        error:
          "Work URL must use http:, https:, ipfs:, or ar: protocol.",
      };
    }
  } catch {
    return { ok: false, error: "Work URL is not a valid URL." };
  }

  return { ok: true };
}

/**
 * Validates a submission description.
 *
 * @param description - Description of work done
 * @returns ValidationResult
 */
export function validateSubmissionDescription(
  description: string | null | undefined,
): ValidationResult {
  const required = validateRequired(description, "Submission description");
  if (!required.ok) return required;

  const minLen = validateMinLength(description!, MIN_DESCRIPTION_LENGTH, "Submission description");
  if (!minLen.ok) return minLen;

  const maxLen = validateMaxLength(
    description!,
    MAX_DESCRIPTION_LENGTH,
    "Submission description",
  );
  if (!maxLen.ok) return maxLen;

  return { ok: true };
}

// ============================================================================
// Full Form Validators
// ============================================================================

/**
 * Task creation form data interface.
 */
export interface TaskCreateFormData {
  title: string;
  description: string;
  token?: string;
  reward: string;
  deadline: string;
  maxSubmissions: string;
  posterAddress?: string;
}

/**
 * Task creation form validation errors interface.
 */
export interface TaskCreateFormErrors {
  title?: string;
  description?: string;
  token?: string;
  reward?: string;
  deadline?: string;
  maxSubmissions?: string;
  posterAddress?: string;
}

/**
 * Validates all fields of a task creation form.
 *
 * @param data - The form data to validate
 * @returns FormValidationResult with all field-level errors
 */
export function validateCreateTaskForm(
  data: TaskCreateFormData,
): { ok: boolean; errors: TaskCreateFormErrors } {
  const errors: TaskCreateFormErrors = {};

  // Title validation
  const titleResult = validateTaskTitle(data.title);
  if (!titleResult.ok) {
    errors.title = titleResult.error;
  }

  // Description validation
  const descResult = validateTaskDescription(data.description);
  if (!descResult.ok) {
    errors.description = descResult.error;
  }

  // Token address validation (optional but if provided, validate it)
  if (data.token && data.token.trim().length > 0) {
    const tokenResult = validateStellarAddress(data.token);
    if (!tokenResult.ok) {
      errors.token = tokenResult.error;
    }
  }

  // Reward validation
  const rewardResult = validateReward(data.reward);
  if (!rewardResult.ok) {
    errors.reward = rewardResult.error;
  }

  // Deadline validation
  const deadlineResult = validateDeadline(data.deadline);
  if (!deadlineResult.ok) {
    errors.deadline = deadlineResult.error;
  }

  // Max submissions validation
  const maxSubResult = validateMaxSubmissions(data.maxSubmissions);
  if (!maxSubResult.ok) {
    errors.maxSubmissions = maxSubResult.error;
  }

  // Poster address validation (if provided)
  if (data.posterAddress && data.posterAddress.trim().length > 0) {
    const posterResult = validateStellarAddress(data.posterAddress);
    if (!posterResult.ok) {
      errors.posterAddress = posterResult.error;
    }
  }

  const hasErrors = Object.values(errors).some((e) => e !== undefined);

  return { ok: !hasErrors, errors };
}

/**
 * Work submission form data interface.
 */
export interface WorkSubmissionFormData {
  workUrl: string;
  description: string;
  contributorAddress?: string;
}

/**
 * Work submission form validation errors interface.
 */
export interface WorkSubmissionFormErrors {
  workUrl?: string;
  description?: string;
  contributorAddress?: string;
}

/**
 * Validates all fields of a work submission form.
 *
 * @param data - The form data to validate
 * @returns Object with ok flag and field-level errors
 */
export function validateWorkSubmissionForm(
  data: WorkSubmissionFormData,
): { ok: boolean; errors: WorkSubmissionFormErrors } {
  const errors: WorkSubmissionFormErrors = {};

  // Work URL validation
  const urlResult = validateWorkUrl(data.workUrl);
  if (!urlResult.ok) {
    errors.workUrl = urlResult.error;
  }

  // Description validation
  const descResult = validateSubmissionDescription(data.description);
  if (!descResult.ok) {
    errors.description = descResult.error;
  }

  // Contributor address validation (if provided)
  if (data.contributorAddress && data.contributorAddress.trim().length > 0) {
    const addrResult = validateStellarAddress(data.contributorAddress);
    if (!addrResult.ok) {
      errors.contributorAddress = addrResult.error;
    }
  }

  const hasErrors = Object.values(errors).some((e) => e !== undefined);

  return { ok: !hasErrors, errors };
}

/**
 * Validates the waitlist/email subscription form.
 *
 * @param email - The email address to validate
 * @returns Object with ok flag and optional error message
 */
export function validateWaitlistForm(email: string): {
  ok: boolean;
  error?: string;
} {
  return validateEmail(email);
}

