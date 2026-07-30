# Test Fixtures and Mock Data

This directory contains reusable test utilities to reduce duplicated setup code across the test suite.

## Files

- **fixtures.ts** - Helper functions for common test scenarios
- **mock-data.ts** - Pre-configured mock data objects for testing

## Fixtures (`fixtures.ts`)

### File Creation Helpers

- `createPdfFile(name?)` - Creates a mock PDF file with valid magic bytes
- `createZipFile(name?)` - Creates a mock ZIP file with valid magic bytes
- `createMarkdownFile(name?, content?)` - Creates a mock markdown file
- `createOversizedFile(size, name?)` - Creates an oversized file for testing size limits

### Date/Time Helpers

- `futureDeadline(offsetSeconds?)` - Returns a Unix timestamp for a future deadline (default: 1 day)
- `pastDeadline(offsetSeconds?)` - Returns a Unix timestamp for a past deadline (default: 1 hour)
- `futureDateIso(offsetMs?)` - Returns an ISO date string for a future date
- `pastDateIso(offsetMs?)` - Returns an ISO date string for a past date

### API Route Context Helpers

- `createRouteContext(params)` - Creates a mock route context object for Next.js API routes
- `taskRouteContext(taskId)` - Creates a task route context with a taskId

### localStorage Mock Setup

- `createLocalStorageMock()` - Creates a localStorage mock for Node.js test environments
- `setupLocalStorageMock(localStorageMock?)` - Sets up localStorage as a global mock (call in beforeEach)
- `cleanupLocalStorageMock()` - Cleans up localStorage global mocks (call in afterEach)

### FormData Helpers

- `createSubmissionFormData(contributor, description, workUrl, files?)` - Creates FormData with task submission data
- `createFileValidationFormData(file)` - Creates FormData for file validation

### Request Helpers

- `createRequest(url, options?)` - Creates a mock Request object for API route testing
- `createJsonPostRequest(url, body)` - Creates a POST request with JSON body
- `createFormDataPostRequest(url, formData)` - Creates a POST request with FormData body

## Mock Data (`mock-data.ts`)

### Stellar Addresses

- `VALID_STELLAR_ADDRESS` - A valid Stellar public key (56 chars, starts with G)
- `STANDARD_STELLAR_ADDRESS` - Standard-format G... address with valid base32 characters
- `INVALID_STELLAR_ADDRESS_*` - Various invalid Stellar addresses for testing validation
- `POSTER_ADDRESS` - Mock poster address for task creation tests
- `CONTRIBUTOR_ADDRESS` - Mock contributor address for submission tests

### Email Addresses

- `VALID_EMAIL` - A valid email address
- `VALID_EMAIL_SUBDOMAIN` - Valid email with subdomain
- `VALID_EMAIL_PLUS` - Valid email with plus sign
- `INVALID_EMAIL_*` - Various invalid email addresses for testing validation

### Task Data

- `VALID_TASK_DATA` - A valid task объект for task creation tests
- `VALID_TASK_DATA_WITH_OPTIONALS` - Valid task with all optional fields
- `INVALID_TASK_*` - Various invalid task data objects for testing validation
- `VALID_TASK_SCHEMA_DATA` - Task data for Zod schema validation tests
- `INVALID_TASK_SCHEMA_*` - Invalid task schema data for testing

### Work Submissions

- `VALID_WORK_SUBMISSION` - A valid work submission form object
- `VALID_WORK_SUBMISSION_WITH_CONTRIBUTOR` - Valid submission with contributor address
- `INVALID_WORK_SUBMISSION_*` - Various invalid work submission objects

### URLs

- `VALID_HTTPS_URL` - A valid HTTPS URL
- `VALID_IPFS_URL` - A valid IPFS URL
- `VALID_ARWEAVE_URL` - A valid Arweave URL
- `INVALID_URL_*` - Various invalid URLs for testing validation

### Contributor Profiles

- `PARTIAL_CONTRIBUTOR_PROFILE` - A partially complete contributor profile
- `COMPLETE_CONTRIBUTOR_PROFILE` - A fully complete contributor profile
- `PROFILE_FIELD_DEFINITIONS` - Profile field definitions for completion calculation

### Notification Preferences

- `DEFAULT_NOTIFICATION_PREFS` - Default notification preferences (all enabled)
- `MODIFIED_NOTIFICATION_PREFS` - Modified preferences (some disabled)
- `ALL_DISABLED_NOTIFICATION_PREFS` - All notification preferences disabled

### Auth Credentials

- `VALID_USER_CREDENTIALS` - Valid user credentials for auth tests
- `VALID_USER_CREDENTIALS_2` - Another valid user for testing multiple users
- `VALID_USER_CREDENTIALS_3` - Another valid user for testing session expiration
- `INVALID_PASSWORD` - Invalid password for authentication failure tests

### Dashboard Stats

- `EXPECTED_DASHBOARD_STATS` - Expected dashboard statistics values
- `EXPECTED_DASHBOARD_GROUP` - Expected dashboard group data

## Usage Examples

### Using File Helpers

```typescript
import { createPdfFile, createZipFile } from "@/test/fixtures";

const pdf = createPdfFile("submission.pdf");
const zip = createZipFile("archive.zip");
```

### Using Date Helpers

```typescript
import { futureDeadline, pastDeadline } from "@/test/fixtures";

const future = futureDeadline(86400); // 1 day from now
const past = pastDeadline(3600); // 1 hour ago
```

### Using Mock Data

```typescript
import { VALID_TASK_DATA, INVALID_TASK_EMPTY_TITLE } from "@/test/mock-data";

// Use valid data
const result = validateCreateTaskForm(VALID_TASK_DATA);

// Use invalid data for testing error cases
const errorResult = validateCreateTaskForm(INVALID_TASK_EMPTY_TITLE);
```

### Using localStorage Mock

```typescript
import { createLocalStorageMock, setupLocalStorageMock, cleanupLocalStorageMock } from "@/test/fixtures";

describe("my test suite", () => {
  const localStorageMock = createLocalStorageMock();

  beforeEach(() => {
    setupLocalStorageMock(localStorageMock);
  });

  afterEach(() => {
    cleanupLocalStorageMock();
  });

  it("tests localStorage behavior", () => {
    localStorageMock.setItem("key", "value");
    expect(localStorageMock.getItem("key")).toBe("value");
  });
});
```

### Using FormData Helpers

```typescript
import { createSubmissionFormData, createPdfFile } from "@/test/fixtures";
import { CONTRIBUTOR_ADDRESS } from "@/test/mock-data";

const formData = createSubmissionFormData(
  CONTRIBUTOR_ADDRESS,
  "My submission description",
  "https://github.com/user/repo",
  createPdfFile()
);
```

## Benefits

- **Reduced duplication**: Common test setup code is centralized
- **Improved readability**: Tests are more concise and focused on behavior
- **Easier maintenance**: Changes to test data only need to be made in one place
- **Consistency**: All tests use the same mock data format
- **Type safety**: TypeScript provides autocomplete and type checking
