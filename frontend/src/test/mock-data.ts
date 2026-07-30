/**
 * Reusable mock data objects for common testing scenarios.
 *
 * This file provides pre-configured mock data objects to reduce
 * duplicated test data across the test suite.
 */

// ============================================================================
// Stellar Address Mocks
// ============================================================================

/**
 * A valid Stellar public key (56 characters, starts with G).
 */
export const VALID_STELLAR_ADDRESS = "GBDIT6QJ3HYH6C7OAVJ4XKZXONJ6PUVL2PVIOQHHGLK6M2S6TQXAAAAAAAA";

/**
 * A standard-format G... address of 56 chars with valid base32 characters.
 */
export const STANDARD_STELLAR_ADDRESS = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * An invalid Stellar address (doesn't start with G).
 */
export const INVALID_STELLAR_ADDRESS_NO_G = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * An invalid Stellar address (too short).
 */
export const INVALID_STELLAR_ADDRESS_TOO_SHORT = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * An invalid Stellar address (too long).
 */
export const INVALID_STELLAR_ADDRESS_TOO_LONG = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWXYZ234567EXTRA";

/**
 * An invalid Stellar address with lowercase characters.
 */
export const INVALID_STELLAR_ADDRESS_LOWERCASE = "gABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWXYZ23456";

/**
 * An invalid Stellar address with ambiguous characters (contains '0').
 */
export const INVALID_STELLAR_ADDRESS_AMBIGUOUS = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWXYZ234560";

/**
 * Mock poster address for task creation tests.
 */
export const POSTER_ADDRESS = "GPOSTER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Mock contributor address for submission tests.
 */
export const CONTRIBUTOR_ADDRESS = "GCONTRIB1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// ============================================================================
// Email Mocks
// ============================================================================

/**
 * A valid email address.
 */
export const VALID_EMAIL = "user@example.com";

/**
 * A valid email with subdomain.
 */
export const VALID_EMAIL_SUBDOMAIN = "user@sub.example.com";

/**
 * A valid email with plus sign.
 */
export const VALID_EMAIL_PLUS = "user+tag@example.com";

/**
 * An invalid email (no @ symbol).
 */
export const INVALID_EMAIL_NO_AT = "notanemail";

/**
 * An invalid email (no domain).
 */
export const INVALID_EMAIL_NO_DOMAIN = "user@";

/**
 * An invalid email (no name).
 */
export const INVALID_EMAIL_NO_NAME = "@domain.com";

/**
 * An extremely long email that should be rejected.
 */
export const INVALID_EMAIL_TOO_LONG = "a".repeat(250) + "@b.com";

// ============================================================================
// Task Data Mocks
// ============================================================================

/**
 * A valid task object for task creation tests.
 */
export const VALID_TASK_DATA = {
  title: "Build a DEX Interface",
  description: "Create a React frontend for Stellar DEX with swap UI, wallet integration, and transaction history.",
  reward: "100",
  deadline: String(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60), // 30 days
  maxSubmissions: "3",
};

/**
 * A valid task object with all optional fields.
 */
export const VALID_TASK_DATA_WITH_OPTIONALS = {
  ...VALID_TASK_DATA,
  token: STANDARD_STELLAR_ADDRESS,
  posterAddress: POSTER_ADDRESS,
};

/**
 * Invalid task data with empty title.
 */
export const INVALID_TASK_EMPTY_TITLE = {
  ...VALID_TASK_DATA,
  title: "",
};

/**
 * Invalid task data with short title.
 */
export const INVALID_TASK_SHORT_TITLE = {
  ...VALID_TASK_DATA,
  title: "ab",
};

/**
 * Invalid task data with empty description.
 */
export const INVALID_TASK_EMPTY_DESCRIPTION = {
  ...VALID_TASK_DATA,
  description: "",
};

/**
 * Invalid task data with short description.
 */
export const INVALID_TASK_SHORT_DESCRIPTION = {
  ...VALID_TASK_DATA,
  description: "short",
};

/**
 * Invalid task data with zero reward.
 */
export const INVALID_TASK_ZERO_REWARD = {
  ...VALID_TASK_DATA,
  reward: "0",
};

/**
 * Invalid task data with negative reward.
 */
export const INVALID_TASK_NEGATIVE_REWARD = {
  ...VALID_TASK_DATA,
  reward: "-50",
};

/**
 * Invalid task data with reward below minimum (0.09 XLM).
 */
export const INVALID_TASK_LOW_REWARD = {
  ...VALID_TASK_DATA,
  reward: "0.09",
};

/**
 * Invalid task data with past deadline.
 */
export const INVALID_TASK_PAST_DEADLINE = {
  ...VALID_TASK_DATA,
  deadline: String(Math.floor(Date.now() / 1000) - 3600),
};

/**
 * Invalid task data with zero max submissions.
 */
export const INVALID_TASK_ZERO_SUBMISSIONS = {
  ...VALID_TASK_DATA,
  maxSubmissions: "0",
};

/**
 * Invalid task data with decimal max submissions.
 */
export const INVALID_TASK_DECIMAL_SUBMISSIONS = {
  ...VALID_TASK_DATA,
  maxSubmissions: "3.5",
};

/**
 * Invalid task data with invalid token address.
 */
export const INVALID_TASK_BAD_TOKEN = {
  ...VALID_TASK_DATA,
  token: "invalid-token",
};

/**
 * Invalid task data with invalid poster address.
 */
export const INVALID_TASK_BAD_POSTER = {
  ...VALID_TASK_DATA,
  posterAddress: "bad-address",
};

/**
 * Task data for Zod schema validation tests.
 */
export const VALID_TASK_SCHEMA_DATA = {
  title: "Valid Task Title",
  description: "This is a valid task description.",
  tokenAddress: "GBVVRXLMNCJTIGXBP2K3C6KHK6BOMW2G5B2ZNYAQUV4K3QY4K6SDBPQD",
  reward: 100,
  deadline: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
  maxSubmissions: 5,
};

/**
 * Invalid task schema data with zero reward.
 */
export const INVALID_TASK_SCHEMA_ZERO_REWARD = {
  ...VALID_TASK_SCHEMA_DATA,
  reward: 0,
};

/**
 * Invalid task schema data with negative reward.
 */
export const INVALID_TASK_SCHEMA_NEGATIVE_REWARD = {
  ...VALID_TASK_SCHEMA_DATA,
  reward: -50,
};

/**
 * Invalid task schema data with past deadline.
 */
export const INVALID_TASK_SCHEMA_PAST_DEADLINE = {
  ...VALID_TASK_SCHEMA_DATA,
  deadline: new Date(Date.now() - 86400000).toISOString(), // Yesterday
};

/**
 * Invalid task schema data with present deadline.
 */
export const INVALID_TASK_SCHEMA_PRESENT_DEADLINE = {
  ...VALID_TASK_SCHEMA_DATA,
  deadline: new Date(Date.now() - 1000).toISOString(), // Just a second ago
};

/**
 * Invalid task schema data with missing required fields.
 */
export const INVALID_TASK_SCHEMA_MISSING_FIELDS = {
  title: "Valid Task Title",
  // missing description and others
};

// ============================================================================
// Work Submission Mocks
// ============================================================================

/**
 * A valid work submission form object.
 */
export const VALID_WORK_SUBMISSION = {
  workUrl: "https://github.com/user/task-submission",
  description: "Implemented all required features for the DEX interface including swap, liquidity pools, and wallet integration.",
};

/**
 * Valid work submission with contributor address.
 */
export const VALID_WORK_SUBMISSION_WITH_CONTRIBUTOR = {
  ...VALID_WORK_SUBMISSION,
  contributorAddress: CONTRIBUTOR_ADDRESS,
};

/**
 * Invalid work submission with empty work URL.
 */
export const INVALID_WORK_SUBMISSION_EMPTY_URL = {
  ...VALID_WORK_SUBMISSION,
  workUrl: "",
};

/**
 * Invalid work submission with invalid URL.
 */
export const INVALID_WORK_SUBMISSION_INVALID_URL = {
  ...VALID_WORK_SUBMISSION,
  workUrl: "not-a-url",
};

/**
 * Invalid work submission with empty description.
 */
export const INVALID_WORK_SUBMISSION_EMPTY_DESCRIPTION = {
  ...VALID_WORK_SUBMISSION,
  description: "",
};

/**
 * Invalid work submission with short description.
 */
export const INVALID_WORK_SUBMISSION_SHORT_DESCRIPTION = {
  ...VALID_WORK_SUBMISSION,
  description: "short",
};

/**
 * Invalid work submission with bad contributor address.
 */
export const INVALID_WORK_SUBMISSION_BAD_CONTRIBUTOR = {
  ...VALID_WORK_SUBMISSION,
  contributorAddress: "bad",
};

// ============================================================================
// URL Mocks
// ============================================================================

/**
 * A valid HTTPS URL.
 */
export const VALID_HTTPS_URL = "https://github.com/user/repo";

/**
 * A valid IPFS URL.
 */
export const VALID_IPFS_URL = "ipfs://QmXxxx1234ABCDEF";

/**
 * A valid Arweave URL.
 */
export const VALID_ARWEAVE_URL = "ar://txid12345abcdef";

/**
 * An invalid URL (not a URL).
 */
export const INVALID_URL = "not-a-url";

/**
 * An invalid URL with unsupported protocol (FTP).
 */
export const INVALID_URL_FTP = "ftp://example.com/file";

/**
 * A URL that's too short.
 */
export const INVALID_URL_TOO_SHORT = "https://a.b";

// ============================================================================
// Contributor Profile Mocks
// ============================================================================

/**
 * A partially complete contributor profile.
 */
export const PARTIAL_CONTRIBUTOR_PROFILE = {
  name: "Ada Lovelace",
  headline: "Engineer",
  bio: "",
  location: "",
  skills: "",
  website: "",
};

/**
 * A fully complete contributor profile.
 */
export const COMPLETE_CONTRIBUTOR_PROFILE = {
  name: "Ada Lovelace",
  headline: "Engineer",
  bio: "First computer programmer",
  location: "London",
  skills: "Mathematics, Programming",
  website: "https://adalovelace.example.com",
};

/**
 * Profile field definitions for completion calculation.
 */
export const PROFILE_FIELD_DEFINITIONS = [
  { key: "name", label: "Full name" },
  { key: "headline", label: "Headline" },
  { key: "bio", label: "Bio" },
  { key: "location", label: "Location" },
  { key: "skills", label: "Skills" },
  { key: "website", label: "Website" },
];

// ============================================================================
// Notification Preferences Mocks
// ============================================================================

/**
 * Default notification preferences (all enabled).
 */
export const DEFAULT_NOTIFICATION_PREFS = {
  task_updates: true,
  submission_activity: true,
  payments: true,
  disputes: true,
  platform_announcements: true,
};

/**
 * Modified notification preferences (some disabled).
 */
export const MODIFIED_NOTIFICATION_PREFS = {
  ...DEFAULT_NOTIFICATION_PREFS,
  payments: false,
  disputes: false,
};

/**
 * All notification preferences disabled.
 */
export const ALL_DISABLED_NOTIFICATION_PREFS = {
  task_updates: false,
  submission_activity: false,
  payments: false,
  disputes: false,
  platform_announcements: false,
};

// ============================================================================
// Auth Mocks
// ============================================================================

/**
 * Valid user credentials for auth tests.
 */
export const VALID_USER_CREDENTIALS = {
  email: "alice@example.com",
  password: "super-secret",
};

/**
 * Another valid user for testing multiple users.
 */
export const VALID_USER_CREDENTIALS_2 = {
  email: "bob@example.com",
  password: "correct-horse-battery-staple",
};

/**
 * Another valid user for testing session expiration.
 */
export const VALID_USER_CREDENTIALS_3 = {
  email: "carol@example.com",
  password: "very-secret",
};

/**
 * Invalid password for authentication failure tests.
 */
export const INVALID_PASSWORD = "wrong-password";

// ============================================================================
// Dashboard Stats Mocks
// ============================================================================

/**
 * Expected dashboard statistics values.
 */
export const EXPECTED_DASHBOARD_STATS = {
  activeGroupCount: 5,
  totalFunds: 70050,
  totalMembers: 35,
  maxFunds: 24500,
  totalTransactions: 118,
};

/**
 * Expected dashboard group data.
 */
export const EXPECTED_DASHBOARD_GROUP = {
  id: "1",
  name: "Paymesh Core",
  totalFunds: 24500,
  members: 8,
  activity: "high",
};
