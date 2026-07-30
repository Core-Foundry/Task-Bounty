/**
 * Reusable test fixtures for common testing scenarios.
 *
 * This file provides helper functions and setup utilities to reduce
 * duplicated test code across the test suite.
 */

import { vi } from "vitest";

// ============================================================================
// File Creation Helpers
// ============================================================================

/**
 * Creates a mock PDF file with valid PDF magic bytes.
 *
 * @param name - The filename for the PDF file (default: "submission.pdf")
 * @returns A File object representing a PDF
 */
export function createPdfFile(name = "submission.pdf"): File {
  return new File(
    [
      new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]),
      "\nMock pdf payload",
    ],
    name,
    {
      type: "application/pdf",
    },
  );
}

/**
 * Creates a mock ZIP file with valid ZIP magic bytes.
 *
 * @param name - The filename for the ZIP file (default: "submission.zip")
 * @returns A File object representing a ZIP
 */
export function createZipFile(name = "submission.zip"): File {
  return new File(
    [new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00])],
    name,
    {
      type: "application/zip",
    },
  );
}

/**
 * Creates a mock markdown file.
 *
 * @param name - The filename for the markdown file (default: "proof.md")
 * @param content - The content of the markdown file
 * @returns A File object representing a markdown file
 */
export function createMarkdownFile(
  name = "proof.md",
  content = "# Task proof\nCompleted all requested changes.",
): File {
  return new File([content], name, {
    type: "application/octet-stream",
  });
}

/**
 * Creates an oversized file for testing size limits.
 *
 * @param size - The size of the file in bytes
 * @param name - The filename for the oversized file (default: "oversized.pdf")
 * @returns A File object of the specified size
 */
export function createOversizedFile(
  size: number,
  name = "oversized.pdf",
): File {
  return new File([new Uint8Array(size)], name, {
    type: "application/pdf",
  });
}

// ============================================================================
// Date/Time Helpers
// ============================================================================

/**
 * Returns a Unix timestamp for a future deadline.
 *
 * @param offsetSeconds - Seconds from now for the deadline (default: 86400 = 1 day)
 * @returns Unix timestamp as a number
 */
export function futureDeadline(offsetSeconds = 86_400): number {
  return Math.floor(Date.now() / 1000) + offsetSeconds;
}

/**
 * Returns a Unix timestamp for a past deadline.
 *
 * @param offsetSeconds - Seconds in the past (default: 3600 = 1 hour ago)
 * @returns Unix timestamp as a number
 */
export function pastDeadline(offsetSeconds = 3600): number {
  return Math.floor(Date.now() / 1000) - offsetSeconds;
}

/**
 * Returns an ISO date string for a future date.
 *
 * @param offsetMs - Milliseconds from now (default: 86400000 = 1 day)
 * @returns ISO date string
 */
export function futureDateIso(offsetMs = 86_400_000): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

/**
 * Returns an ISO date string for a past date.
 *
 * @param offsetMs - Milliseconds in the past (default: 86400000 = 1 day ago)
 * @returns ISO date string
 */
export function pastDateIso(offsetMs = 86_400_000): string {
  return new Date(Date.now() - offsetMs).toISOString();
}

// ============================================================================
// API Route Context Helpers
// ============================================================================

/**
 * Creates a mock route context object for Next.js API routes.
 *
 * @param params - The route parameters object
 * @returns A mock route context with params as a Promise
 */
export function createRouteContext(params: Record<string, string>) {
  return { params: Promise.resolve(params) };
}

/**
 * Creates a task route context with a taskId.
 *
 * @param taskId - The task ID for the route
 * @returns A mock route context for task routes
 */
export function taskRouteContext(taskId: string) {
  return { params: Promise.resolve({ taskId }) };
}

// ============================================================================
// localStorage Mock Setup
// ============================================================================

/**
 * Creates a localStorage mock for Node.js test environments.
 *
 * @returns A localStorage mock object with getItem, setItem, removeItem, clear, length, and key
 */
export function createLocalStorageMock() {
  const store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
}

/**
 * Sets up localStorage as a global mock in the test environment.
 * This should be called in beforeEach hooks.
 *
 * @param localStorageMock - The localStorage mock to use (creates one if not provided)
 */
export function setupLocalStorageMock(localStorageMock = createLocalStorageMock()) {
  vi.stubGlobal("window", { localStorage: localStorageMock });
  vi.stubGlobal("localStorage", localStorageMock);
  return localStorageMock;
}

/**
 * Cleans up localStorage global mocks.
 * This should be called in afterEach hooks.
 */
export function cleanupLocalStorageMock() {
  vi.unstubAllGlobals();
}

// ============================================================================
// FormData Helpers
// ============================================================================

/**
 * Creates a FormData object with task submission data.
 *
 * @param contributor - The contributor's Stellar address
 * @param description - The submission description
 * @param workUrl - The URL to the work
 * @param files - Optional files to attach
 * @returns A FormData object populated with submission data
 */
export function createSubmissionFormData(
  contributor: string,
  description: string,
  workUrl: string,
  files?: File | File[],
): FormData {
  const formData = new FormData();
  formData.append("contributor", contributor);
  formData.append("description", description);
  formData.append("workUrl", workUrl);
  
  if (files) {
    if (Array.isArray(files)) {
      files.forEach((file) => formData.append("files", file));
    } else {
      formData.append("files", files);
    }
  }
  
  return formData;
}

/**
 * Creates a minimal FormData object for task submission validation.
 *
 * @param file - The file to validate
 * @returns A FormData object with a file
 */
export function createFileValidationFormData(file: File): FormData {
  const formData = new FormData();
  formData.append("files", file);
  return formData;
}

// ============================================================================
// Request Helpers
// ============================================================================

/**
 * Creates a mock Request object for API route testing.
 *
 * @param url - The request URL
 * @param options - RequestInit options (method, headers, body, etc.)
 * @returns A Request object
 */
export function createRequest(
  url: string,
  options: RequestInit = {},
): Request {
  return new Request(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
}

/**
 * Creates a POST request with JSON body.
 *
 * @param url - The request URL
 * @param body - The JSON body object
 * @returns A Request object with POST method and JSON body
 */
export function createJsonPostRequest(url: string, body: Record<string, unknown>): Request {
  return createRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Creates a POST request with FormData body.
 *
 * @param url - The request URL
 * @param formData - The FormData body
 * @returns A Request object with POST method and FormData body
 */
export function createFormDataPostRequest(url: string, formData: FormData): Request {
  return new Request(url, {
    method: "POST",
    body: formData,
  });
}
