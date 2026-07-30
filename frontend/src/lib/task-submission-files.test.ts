import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/task-submissions/validate/route";
import {
  extractTaskSubmissionFiles,
  MAX_TASK_SUBMISSION_FILES,
  MAX_TASK_SUBMISSION_FILE_SIZE_BYTES,
  validateTaskSubmissionFiles,
} from "@/lib/task-submission-files";
import {
  createFileValidationFormData,
  createFormDataPostRequest,
  createMarkdownFile,
  createOversizedFile,
  createPdfFile,
  createZipFile,
} from "@/test/fixtures";

describe("validateTaskSubmissionFiles", () => {
  it("accepts a supported file when extension, MIME type, and content match", async () => {
    const result = await validateTaskSubmissionFiles([createPdfFile()]);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected validation success");
    }

    expect(result.files).toHaveLength(1);
    expect(result.files[0]).toMatchObject({
      extension: "pdf",
      kind: "pdf",
      detectedMimeType: "application/pdf",
    });
  });

  it("accepts UTF-8 markdown files even when the browser sends a generic MIME type", async () => {
    const result = await validateTaskSubmissionFiles([
      createMarkdownFile(),
    ]);

    expect(result.ok).toBe(true);
  });

  it("rejects missing files", async () => {
    await expect(validateTaskSubmissionFiles([])).resolves.toEqual({
      ok: false,
      status: 400,
      errors: ["At least one task submission file is required."],
    });
  });

  it("rejects more files than allowed", async () => {
    const files = Array.from({ length: MAX_TASK_SUBMISSION_FILES + 1 }, (_, index) =>
      createPdfFile(`submission-${index + 1}.pdf`),
    );

    const result = await validateTaskSubmissionFiles(files);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected validation failure");
    }

    expect(result.status).toBe(413);
    expect(result.errors[0]).toContain(String(MAX_TASK_SUBMISSION_FILES));
  });

  it("rejects path traversal and disguised dangerous extensions", async () => {
    const result = await validateTaskSubmissionFiles([
      createPdfFile("../payload.exe.pdf"),
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected validation failure");
    }

    expect(result.errors.join(" ")).toContain("invalid path sequence");
    expect(result.errors.join(" ")).toContain("blocked embedded extension .exe");
  });

  it("rejects files whose content does not match the extension", async () => {
    const result = await validateTaskSubmissionFiles([createZipFile("evidence.pdf")]);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected validation failure");
    }

    expect(result.errors[0]).toContain("does not match its .pdf extension");
  });

  it("rejects oversized files", async () => {
    const oversized = createOversizedFile(MAX_TASK_SUBMISSION_FILE_SIZE_BYTES + 1);

    const result = await validateTaskSubmissionFiles([oversized]);

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected validation failure");
    }

    expect(result.status).toBe(413);
    expect(result.errors[0]).toContain("10 MB limit");
  });
});

describe("extractTaskSubmissionFiles", () => {
  it("returns only File values from multipart form data", () => {
    const formData = new FormData();
    const file = createPdfFile();

    formData.append("taskId", "123");
    formData.append("files", file);

    expect(extractTaskSubmissionFiles(formData)).toEqual([file]);
  });
});

describe("POST /api/task-submissions/validate", () => {
  it("returns validation metadata for valid uploads", async () => {
    const formData = createFileValidationFormData(createPdfFile());

    const response = await POST(
      createFormDataPostRequest("http://localhost/api/task-submissions/validate", formData),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const body = await response.json();

    expect(body).toMatchObject({
      ok: true,
      totalSize: expect.any(Number),
    });
    expect(body.files[0]).toMatchObject({
      name: "submission.pdf",
      detectedMimeType: "application/pdf",
    });
  });

  it("returns a validation error for missing files", async () => {
    const formData = new FormData();
    formData.append("taskId", "123");

    const response = await POST(
      createFormDataPostRequest("http://localhost/api/task-submissions/validate", formData),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const body = await response.json();

    expect(body).toMatchObject({
      ok: false,
      error: "Invalid task submission upload.",
    });
    expect(body.details[0]).toContain("At least one task submission file is required");
  });
});
