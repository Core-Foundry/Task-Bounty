import { describe, expect, it } from "vitest";

import {
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validateNumeric,
  validatePositiveInteger,
  validateRange,
  validateStellarAddress,
  validateEmail,
  validateTaskTitle,
  validateTaskDescription,
  validateReward,
  validateDeadline,
  validateMaxSubmissions,
  validateWorkUrl,
  validateSubmissionDescription,
  validateCreateTaskForm,
  validateWorkSubmissionForm,
  validateWaitlistForm,
  MIN_REWARD_STROOPS,
  MAX_REWARD_STROOPS,
  MIN_TITLE_LENGTH,
  MAX_TITLE_LENGTH,
  MIN_DESCRIPTION_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MIN_MAX_SUBMISSIONS,
  MAX_MAX_SUBMISSIONS,
} from "./form-validation";

// ============================================================================
// validateRequired
// ============================================================================

describe("validateRequired", () => {
  it("rejects null value", () => {
    const result = validateRequired(null, "Field");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Field is required.");
  });

  it("rejects undefined value", () => {
    const result = validateRequired(undefined, "Field");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Field is required.");
  });

  it("rejects empty string", () => {
    const result = validateRequired("", "Title");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Title is required.");
  });

  it("rejects whitespace-only string", () => {
    const result = validateRequired("   ", "Title");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Title is required.");
  });

  it("accepts non-empty string", () => {
    const result = validateRequired("hello", "Field");
    expect(result.ok).toBe(true);
  });

  it("accepts string with leading/trailing whitespace", () => {
    const result = validateRequired("  hello  ", "Field");
    expect(result.ok).toBe(true);
  });
});

// ============================================================================
// validateMinLength
// ============================================================================

describe("validateMinLength", () => {
  it("rejects string shorter than minimum", () => {
    const result = validateMinLength("ab", 3, "Title");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Title must be at least 3 characters.");
  });

  it("accepts string at minimum length", () => {
    const result = validateMinLength("abc", 3, "Title");
    expect(result.ok).toBe(true);
  });

  it("accepts string longer than minimum", () => {
    const result = validateMinLength("abcdef", 3, "Title");
    expect(result.ok).toBe(true);
  });

  it("considers trimmed length, not raw length", () => {
    const result = validateMinLength("  a  ", 3, "Title");
    expect(result.ok).toBe(false);
  });
});

// ============================================================================
// validateMaxLength
// ============================================================================

describe("validateMaxLength", () => {
  it("rejects string exceeding maximum", () => {
    const result = validateMaxLength("a".repeat(121), 120, "Title");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Title must be no more than 120 characters.");
  });

  it("accepts string at maximum length", () => {
    const result = validateMaxLength("a".repeat(120), 120, "Title");
    expect(result.ok).toBe(true);
  });

  it("accepts string under maximum length", () => {
    const result = validateMaxLength("short", 120, "Title");
    expect(result.ok).toBe(true);
  });
});

// ============================================================================
// validateNumeric
// ============================================================================

describe("validateNumeric", () => {
  it("rejects empty string", () => {
    const result = validateNumeric("", "Reward");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Reward must be a valid number.");
  });

  it("rejects non-numeric string", () => {
    const result = validateNumeric("abc", "Reward");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Reward must be a valid number.");
  });

  it("accepts integer", () => {
    const result = validateNumeric("100", "Reward");
    expect(result.ok).toBe(true);
  });

  it("accepts decimal", () => {
    const result = validateNumeric("100.5", "Reward");
    expect(result.ok).toBe(true);
  });

  it("accepts negative number", () => {
    const result = validateNumeric("-50", "Reward");
    expect(result.ok).toBe(true);
  });

  it("rejects Infinity", () => {
    const result = validateNumeric("Infinity", "Reward");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Reward must be a finite number.");
  });

  it("rejects NaN", () => {
    const result = validateNumeric("NaN", "Reward");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Reward must be a valid number.");
  });
});

// ============================================================================
// validatePositiveInteger
// ============================================================================

describe("validatePositiveInteger", () => {
  it("rejects empty string", () => {
    const result = validatePositiveInteger("", "Max submissions");
    expect(result.ok).toBe(false);
  });

  it("rejects decimal", () => {
    const result = validatePositiveInteger("3.5", "Max submissions");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Max submissions must be a whole number.");
  });

  it("rejects negative number", () => {
    const result = validatePositiveInteger("-1", "Max submissions");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Max submissions must be a positive number.");
  });

  it("accepts zero", () => {
    const result = validatePositiveInteger("0", "Max submissions");
    expect(result.ok).toBe(true);
  });

  it("accepts positive integer", () => {
    const result = validatePositiveInteger("10", "Max submissions");
    expect(result.ok).toBe(true);
  });
});

// ============================================================================
// validateRange
// ============================================================================

describe("validateRange", () => {
  it("rejects value below minimum", () => {
    const result = validateRange(0, 1, 100, "Max submissions");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Max submissions must be at least 1.");
  });

  it("rejects value above maximum", () => {
    const result = validateRange(1001, 1, 1000, "Max submissions");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Max submissions must be no more than 1000.");
  });

  it("accepts value at minimum", () => {
    const result = validateRange(1, 1, 1000, "Max submissions");
    expect(result.ok).toBe(true);
  });

  it("accepts value at maximum", () => {
    const result = validateRange(1000, 1, 1000, "Max submissions");
    expect(result.ok).toBe(true);
  });

  it("accepts value within range", () => {
    const result = validateRange(50, 1, 1000, "Max submissions");
    expect(result.ok).toBe(true);
  });
});

// ============================================================================
// validateStellarAddress
// ============================================================================

describe("validateStellarAddress", () => {
  it("rejects null", () => {
    const result = validateStellarAddress(null);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Wallet address is required.");
  });

  it("rejects undefined", () => {
    const result = validateStellarAddress(undefined);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Wallet address is required.");
  });

  it("rejects empty string", () => {
    const result = validateStellarAddress("");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Wallet address is required.");
  });

  it("rejects address not starting with G", () => {
    const result = validateStellarAddress("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWXYZ234567");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("start with 'G'");
  });

  it("rejects address with wrong length (too short)", () => {
    const result = validateStellarAddress("GABCDEFGHIJKLMNOPQRSTUVWXYZ234567");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("exactly 56 characters");
  });

  it("rejects address with wrong length (too long)", () => {
    const result = validateStellarAddress("GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWXYZ234567EXTRA");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("exactly 56 characters");
  });

  it("rejects address with invalid characters (lowercase)", () => {
    const result = validateStellarAddress("gABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWXYZ23456");
    expect(result.ok).toBe(false);
  });

  it("rejects address with ambiguous characters (0, O, I, L)", () => {
    // Contains '0' which is invalid in base32
    const result = validateStellarAddress("GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWXYZ234560");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid characters");
  });

  it("accepts a valid Stellar public key", () => {
    // This is a validly-formed Stellar test address
    const validKey = "GBDIT6QJ3HYH6C7OAVJ4XKZXONJ6PUVL2PVIOQHHGLK6M2S6TQXAAAAAAAA";
    const result = validateStellarAddress(validKey);
    expect(result.ok).toBe(true);
  });

  it("accepts a standard-format G... address of 56 chars", () => {
    // Generate a valid format address with only valid base32 chars
    const validKey = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const result = validateStellarAddress(validKey);
    expect(result.ok).toBe(true);
  });

  it("trims surrounding whitespace before validation", () => {
    const result = validateStellarAddress("  GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWXYZ234567  ");
    expect(result.ok).toBe(true);
  });
});

// ============================================================================
// validateEmail
// ============================================================================

describe("validateEmail", () => {
  it("rejects empty string", () => {
    const result = validateEmail("");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Email address is required.");
  });

  it("rejects invalid email (no @)", () => {
    const result = validateEmail("notanemail");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Please enter a valid email address.");
  });

  it("rejects invalid email (no domain)", () => {
    const result = validateEmail("user@");
    expect(result.ok).toBe(false);
  });

  it("rejects invalid email (no name)", () => {
    const result = validateEmail("@domain.com");
    expect(result.ok).toBe(false);
  });

  it("accepts valid email", () => {
    const result = validateEmail("user@example.com");
    expect(result.ok).toBe(true);
  });

  it("accepts email with subdomain", () => {
    const result = validateEmail("user@sub.example.com");
    expect(result.ok).toBe(true);
  });

  it("accepts email with plus sign", () => {
    const result = validateEmail("user+tag@example.com");
    expect(result.ok).toBe(true);
  });

  it("rejects extremely long email", () => {
    const long = "a".repeat(250) + "@b.com";
    const result = validateEmail(long);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Email address is too long.");
  });
});

// ============================================================================
// validateTaskTitle
// ============================================================================

describe("validateTaskTitle", () => {
  it("rejects null", () => {
    const result = validateTaskTitle(null);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Title is required.");
  });

  it("rejects empty", () => {
    const result = validateTaskTitle("");
    expect(result.ok).toBe(false);
  });

  it("rejects title shorter than minimum", () => {
    const result = validateTaskTitle("ab");
    expect(result.ok).toBe(false);
    expect(result.error).toContain(`at least ${MIN_TITLE_LENGTH}`);
  });

  it("rejects title longer than maximum", () => {
    const result = validateTaskTitle("a".repeat(MAX_TITLE_LENGTH + 1));
    expect(result.ok).toBe(false);
    expect(result.error).toContain(`no more than ${MAX_TITLE_LENGTH}`);
  });

  it("accepts valid title", () => {
    const result = validateTaskTitle("Build a DEX Interface");
    expect(result.ok).toBe(true);
  });

  it("accepts title at minimum length", () => {
    const result = validateTaskTitle("abc");
    expect(result.ok).toBe(true);
  });

  it("accepts title at maximum length", () => {
    const result = validateTaskTitle("a".repeat(MAX_TITLE_LENGTH));
    expect(result.ok).toBe(true);
  });
});

// ============================================================================
// validateTaskDescription
// ============================================================================

describe("validateTaskDescription", () => {
  it("rejects null", () => {
    const result = validateTaskDescription(null);
    expect(result.ok).toBe(false);
  });

  it("rejects empty", () => {
    const result = validateTaskDescription("");
    expect(result.ok).toBe(false);
  });

  it("rejects description shorter than minimum", () => {
    const result = validateTaskDescription("short");
    expect(result.ok).toBe(false);
    expect(result.error).toContain(`at least ${MIN_DESCRIPTION_LENGTH}`);
  });

  it("rejects description longer than maximum", () => {
    const result = validateTaskDescription("a".repeat(MAX_DESCRIPTION_LENGTH + 1));
    expect(result.ok).toBe(false);
    expect(result.error).toContain(`no more than ${MAX_DESCRIPTION_LENGTH}`);
  });

  it("accepts valid description", () => {
    const result = validateTaskDescription("Create a React frontend for Stellar DEX with swap UI, wallet integration, and transaction history.");
    expect(result.ok).toBe(true);
  });

  it("accepts description at minimum length", () => {
    const result = validateTaskDescription("a".repeat(MIN_DESCRIPTION_LENGTH));
    expect(result.ok).toBe(true);
  });
});

// ============================================================================
// validateReward
// ============================================================================

describe("validateReward", () => {
  it("rejects null", () => {
    const result = validateReward(null);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Reward is required.");
  });

  it("rejects empty", () => {
    const result = validateReward("");
    expect(result.ok).toBe(false);
  });

  it("rejects non-numeric", () => {
    const result = validateReward("abc");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("valid number");
  });

  it("rejects zero", () => {
    const result = validateReward("0");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("greater than zero");
  });

  it("rejects negative value", () => {
    const result = validateReward("-50");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("greater than zero");
  });

  it("rejects reward below minimum (in stroops)", () => {
    // 0.09 XLM = 900,000 stroops — below minimum
    const result = validateReward("0.09");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("too low");
    expect(result.error).toContain("0.1 XLM");
  });

  it("accepts reward at minimum (0.1 XLM)", () => {
    const result = validateReward("0.1");
    expect(result.ok).toBe(true);
  });

  it("accepts reward above minimum", () => {
    const result = validateReward("100");
    expect(result.ok).toBe(true);
  });

  it("accepts decimal reward", () => {
    const result = validateReward("10.5");
    expect(result.ok).toBe(true);
  });

  it("rejects reward above maximum", () => {
    const result = validateReward("2000000");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("too high");
  });

  it("validates the constant match", () => {
    // 0.1 XLM = 1,000,000 stroops
    expect(MIN_REWARD_STROOPS).toBe(1_000_000);
    expect(MAX_REWARD_STROOPS).toBe(10_000_000_000_000);
  });
});

// ============================================================================
// validateDeadline
// ============================================================================

describe("validateDeadline", () => {
  it("rejects null", () => {
    const result = validateDeadline(null);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Deadline is required.");
  });

  it("rejects empty", () => {
    const result = validateDeadline("");
    expect(result.ok).toBe(false);
  });

  it("rejects non-numeric deadline", () => {
    const result = validateDeadline("abc");
    expect(result.ok).toBe(false);
  });

  it("rejects deadline in the past", () => {
    const past = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const result = validateDeadline(String(past));
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Deadline must be in the future.");
  });

  it("accepts deadline in the near future", () => {
    const future = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
    const result = validateDeadline(String(future));
    expect(result.ok).toBe(true);
  });

  it("accepts deadline at 365 days from now", () => {
    const maxFuture = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
    const result = validateDeadline(String(maxFuture));
    expect(result.ok).toBe(true);
  });

  it("rejects deadline beyond 365 days", () => {
    const tooFar = Math.floor(Date.now() / 1000) + 366 * 24 * 60 * 60;
    const result = validateDeadline(String(tooFar));
    expect(result.ok).toBe(false);
    expect(result.error).toContain("365 days");
  });
});

// ============================================================================
// validateMaxSubmissions
// ============================================================================

describe("validateMaxSubmissions", () => {
  it("rejects null", () => {
    const result = validateMaxSubmissions(null);
    expect(result.ok).toBe(false);
  });

  it("rejects empty", () => {
    const result = validateMaxSubmissions("");
    expect(result.ok).toBe(false);
  });

  it("rejects decimal", () => {
    const result = validateMaxSubmissions("3.5");
    expect(result.ok).toBe(false);
  });

  it("rejects zero (below minimum)", () => {
    const result = validateMaxSubmissions("0");
    expect(result.ok).toBe(false);
    expect(result.error).toContain(`at least ${MIN_MAX_SUBMISSIONS}`);
  });

  it("accepts minimum (1)", () => {
    const result = validateMaxSubmissions("1");
    expect(result.ok).toBe(true);
  });

  it("accepts valid number", () => {
    const result = validateMaxSubmissions("5");
    expect(result.ok).toBe(true);
  });

  it("accepts maximum (1000)", () => {
    const result = validateMaxSubmissions("1000");
    expect(result.ok).toBe(true);
  });

  it("rejects above maximum", () => {
    const result = validateMaxSubmissions("1001");
    expect(result.ok).toBe(false);
    expect(result.error).toContain(`no more than ${MAX_MAX_SUBMISSIONS}`);
  });

  it("accepts number type input", () => {
    const result = validateMaxSubmissions(10);
    expect(result.ok).toBe(true);
  });
});

// ============================================================================
// validateWorkUrl
// ============================================================================

describe("validateWorkUrl", () => {
  it("rejects null", () => {
    const result = validateWorkUrl(null);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Work URL is required.");
  });

  it("rejects empty", () => {
    const result = validateWorkUrl("");
    expect(result.ok).toBe(false);
  });

  it("rejects invalid URL", () => {
    const result = validateWorkUrl("not-a-url");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("not a valid URL");
  });

  it("rejects URL with unsupported protocol", () => {
    const result = validateWorkUrl("ftp://example.com/file");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("protocol");
  });

  it("accepts https URL", () => {
    const result = validateWorkUrl("https://github.com/user/repo");
    expect(result.ok).toBe(true);
  });

  it("accepts IPFS URL", () => {
    const result = validateWorkUrl("ipfs://QmXxxx1234ABCDEF");
    expect(result.ok).toBe(true);
  });

  it("accepts Arweave URL", () => {
    const result = validateWorkUrl("ar://txid12345abcdef");
    expect(result.ok).toBe(true);
  });

  it("rejects URL shorter than minimum", () => {
    const result = validateWorkUrl("https://a.b");
    expect(result.ok).toBe(false);
  });

  it("rejects URL longer than maximum", () => {
    const longUrl = "https://" + "a".repeat(MAX_DESCRIPTION_LENGTH);
    const result = validateWorkUrl(longUrl);
    expect(result.ok).toBe(false);
  });
});

// ============================================================================
// validateSubmissionDescription
// ============================================================================

describe("validateSubmissionDescription", () => {
  it("rejects null", () => {
    const result = validateSubmissionDescription(null);
    expect(result.ok).toBe(false);
  });

  it("rejects too short", () => {
    const result = validateSubmissionDescription("short");
    expect(result.ok).toBe(false);
  });

  it("accepts valid description", () => {
    const result = validateSubmissionDescription(
      "Implemented the complete DEX UI with wallet connect, swap, and liquidity features.",
    );
    expect(result.ok).toBe(true);
  });
});

// ============================================================================
// validateCreateTaskForm — Full Form Validator
// ============================================================================

describe("validateCreateTaskForm", () => {
  const validForm = {
    title: "Build a DEX Interface",
    description:
      "Create a React frontend for Stellar DEX with swap UI, wallet integration, and transaction history.",
    reward: "100",
    deadline: String(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60), // 30 days
    maxSubmissions: "3",
  };

  it("accepts a completely valid form", () => {
    const result = validateCreateTaskForm(validForm);
    expect(result.ok).toBe(true);
    expect(Object.keys(result.errors).length).toBe(0);
  });

  it("rejects empty title", () => {
    const result = validateCreateTaskForm({ ...validForm, title: "" });
    expect(result.ok).toBe(false);
    expect(result.errors.title).toBeDefined();
  });

  it("rejects short title", () => {
    const result = validateCreateTaskForm({ ...validForm, title: "ab" });
    expect(result.ok).toBe(false);
    expect(result.errors.title).toBeDefined();
  });

  it("rejects empty description", () => {
    const result = validateCreateTaskForm({ ...validForm, description: "" });
    expect(result.ok).toBe(false);
    expect(result.errors.description).toBeDefined();
  });

  it("rejects invalid reward", () => {
    const result = validateCreateTaskForm({ ...validForm, reward: "0" });
    expect(result.ok).toBe(false);
    expect(result.errors.reward).toBeDefined();
  });

  it("rejects past deadline", () => {
    const past = String(Math.floor(Date.now() / 1000) - 3600);
    const result = validateCreateTaskForm({ ...validForm, deadline: past });
    expect(result.ok).toBe(false);
    expect(result.errors.deadline).toBeDefined();
  });

  it("rejects invalid max submissions", () => {
    const result = validateCreateTaskForm({ ...validForm, maxSubmissions: "0" });
    expect(result.ok).toBe(false);
    expect(result.errors.maxSubmissions).toBeDefined();
  });

  it("validates token address if provided", () => {
    const result = validateCreateTaskForm({
      ...validForm,
      token: "invalid-token",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.token).toBeDefined();
  });

  it("accepts valid token address", () => {
    const result = validateCreateTaskForm({
      ...validForm,
      token: "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
    });
    expect(result.ok).toBe(true);
  });

  it("accepts empty token address (optional)", () => {
    const result = validateCreateTaskForm({ ...validForm, token: "" });
    expect(result.ok).toBe(true);
  });

  it("validates poster address if provided", () => {
    const result = validateCreateTaskForm({
      ...validForm,
      posterAddress: "bad-address",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.posterAddress).toBeDefined();
  });

  it("returns multiple errors at once", () => {
    const result = validateCreateTaskForm({
      title: "",
      description: "",
      reward: "",
      deadline: "",
      maxSubmissions: "",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.title).toBeDefined();
    expect(result.errors.description).toBeDefined();
    expect(result.errors.reward).toBeDefined();
    expect(result.errors.deadline).toBeDefined();
    expect(result.errors.maxSubmissions).toBeDefined();
  });
});

// ============================================================================
// validateWorkSubmissionForm
// ============================================================================

describe("validateWorkSubmissionForm", () => {
  const validForm = {
    workUrl: "https://github.com/user/task-submission",
    description:
      "Implemented all required features for the DEX interface including swap, liquidity pools, and wallet integration.",
  };

  it("accepts a completely valid submission form", () => {
    const result = validateWorkSubmissionForm(validForm);
    expect(result.ok).toBe(true);
  });

  it("rejects empty work URL", () => {
    const result = validateWorkSubmissionForm({ ...validForm, workUrl: "" });
    expect(result.ok).toBe(false);
    expect(result.errors.workUrl).toBeDefined();
  });

  it("rejects invalid work URL", () => {
    const result = validateWorkSubmissionForm({
      ...validForm,
      workUrl: "not-a-url",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.workUrl).toBeDefined();
  });

  it("rejects empty description", () => {
    const result = validateWorkSubmissionForm({
      ...validForm,
      description: "",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.description).toBeDefined();
  });

  it("validates contributor address if provided", () => {
    const result = validateWorkSubmissionForm({
      ...validForm,
      contributorAddress: "bad",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.contributorAddress).toBeDefined();
  });

  it("accepts empty contributor address (optional)", () => {
    const result = validateWorkSubmissionForm({
      ...validForm,
      contributorAddress: "",
    });
    expect(result.ok).toBe(true);
  });

  it("accepts valid contributor address", () => {
    const result = validateWorkSubmissionForm({
      ...validForm,
      contributorAddress:
        "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
    });
    expect(result.ok).toBe(true);
  });
});

// ============================================================================
// validateWaitlistForm
// ============================================================================

describe("validateWaitlistForm", () => {
  it("rejects empty email", () => {
    const result = validateWaitlistForm("");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Email address is required.");
  });

  it("rejects invalid email", () => {
    const result = validateWaitlistForm("not-email");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Please enter a valid email address.");
  });

  it("accepts valid email", () => {
    const result = validateWaitlistForm("user@example.com");
    expect(result.ok).toBe(true);
  });
});

