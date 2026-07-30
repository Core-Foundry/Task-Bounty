import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET as getTaskById } from "@/app/api/tasks/[taskId]/route";
import { POST as submitTaskWork } from "@/app/api/tasks/[taskId]/submissions/route";
import { POST as createTask } from "@/app/api/tasks/route";
import { resetTaskWorkflowStore } from "@/lib/task-workflow";
import {
  createPdfFile,
  futureDeadline,
  taskRouteContext,
} from "@/test/fixtures";
import {
  CONTRIBUTOR_ADDRESS,
  POSTER_ADDRESS,
  VALID_TASK_DATA,
} from "@/test/mock-data";

async function createTaskRequest(overrides: Record<string, unknown> = {}) {
  return createTask(
    new Request("http://localhost/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        poster: POSTER_ADDRESS,
        ...VALID_TASK_DATA,
        ...overrides,
      }),
    }),
  );
}

describe("task submission workflow (e2e)", () => {
  beforeEach(() => {
    resetTaskWorkflowStore();
  });

  afterEach(() => {
    resetTaskWorkflowStore();
  });

  it("creates a task, submits work, and updates task status to in_progress", async () => {
    const createResponse = await createTaskRequest();
    expect(createResponse.status).toBe(201);

    const created = await createResponse.json();
    expect(created).toMatchObject({
      ok: true,
      task: {
        id: "1",
        poster: POSTER_ADDRESS,
        status: "open",
        submissionCount: 0,
      },
    });

    const taskId = created.task.id as string;

    const initialTaskResponse = await getTaskById(
      new Request(`http://localhost/api/tasks/${taskId}`),
      taskRouteContext(taskId),
    );

    expect(initialTaskResponse.status).toBe(200);
    const initialTaskBody = await initialTaskResponse.json();
    expect(initialTaskBody.task.status).toBe("open");

    const formData = new FormData();
    formData.append("contributor", CONTRIBUTOR_ADDRESS);
    formData.append("description", "Delivered the requested implementation with proof attached.");
    formData.append("workUrl", "https://example.com/proof");
    formData.append("files", createPdfFile());

    const submitResponse = await submitTaskWork(
      new Request(`http://localhost/api/tasks/${taskId}/submissions`, {
        method: "POST",
        body: formData,
      }),
      taskRouteContext(taskId),
    );

    expect(submitResponse.status).toBe(201);
    expect(submitResponse.headers.get("Cache-Control")).toBe("no-store");

    const submitted = await submitResponse.json();
    expect(submitted).toMatchObject({
      ok: true,
      task: {
        id: taskId,
        status: "in_progress",
        submissionCount: 1,
      },
      submission: {
        id: "1",
        taskId,
        contributor: CONTRIBUTOR_ADDRESS,
        status: "pending",
        workUrl: "https://example.com/proof",
      },
    });
    expect(submitted.submission.files[0]).toMatchObject({
      name: "submission.pdf",
      detectedMimeType: "application/pdf",
    });

    const updatedTaskResponse = await getTaskById(
      new Request(`http://localhost/api/tasks/${taskId}`),
      taskRouteContext(taskId),
    );

    expect(updatedTaskResponse.status).toBe(200);
    const updatedTaskBody = await updatedTaskResponse.json();
    expect(updatedTaskBody.task).toMatchObject({
      id: taskId,
      status: "in_progress",
      submissionCount: 1,
    });
  });

  it("rejects duplicate submissions from the same contributor", async () => {
    const createResponse = await createTaskRequest();
    const created = await createResponse.json();
    const taskId = created.task.id as string;

    const formData = new FormData();
    formData.append("contributor", CONTRIBUTOR_ADDRESS);
    formData.append("description", "First submission.");
    formData.append("files", createPdfFile("first.pdf"));

    const firstSubmit = await submitTaskWork(
      new Request(`http://localhost/api/tasks/${taskId}/submissions`, {
        method: "POST",
        body: formData,
      }),
      taskRouteContext(taskId),
    );
    expect(firstSubmit.status).toBe(201);

    const duplicateFormData = new FormData();
    duplicateFormData.append("contributor", CONTRIBUTOR_ADDRESS);
    duplicateFormData.append("description", "Duplicate submission.");
    duplicateFormData.append("files", createPdfFile("second.pdf"));

    const duplicateSubmit = await submitTaskWork(
      new Request(`http://localhost/api/tasks/${taskId}/submissions`, {
        method: "POST",
        body: duplicateFormData,
      }),
      taskRouteContext(taskId),
    );

    expect(duplicateSubmit.status).toBe(409);
    const duplicateBody = await duplicateSubmit.json();
    expect(duplicateBody).toMatchObject({
      ok: false,
      error: "Contributor has already submitted work for this task.",
    });

    const taskResponse = await getTaskById(
      new Request(`http://localhost/api/tasks/${taskId}`),
      taskRouteContext(taskId),
    );
    const taskBody = await taskResponse.json();
    expect(taskBody.task.submissionCount).toBe(1);
    expect(taskBody.task.status).toBe("in_progress");
  });

  it("rejects task creation when required fields are invalid", async () => {
    const response = await createTaskRequest({
      title: "",
      reward: 1,
      deadline: futureDeadline(-60),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.details).toEqual(
      expect.arrayContaining([
        "Task title is required.",
        expect.stringContaining("Reward must be at least"),
        "Deadline must be in the future.",
      ]),
    );
  });

  it("rejects submissions with invalid files before changing task status", async () => {
    const createResponse = await createTaskRequest();
    const created = await createResponse.json();
    const taskId = created.task.id as string;

    const formData = new FormData();
    formData.append("contributor", CONTRIBUTOR_ADDRESS);
    formData.append("description", "Missing proof files.");

    const submitResponse = await submitTaskWork(
      new Request(`http://localhost/api/tasks/${taskId}/submissions`, {
        method: "POST",
        body: formData,
      }),
      taskRouteContext(taskId),
    );

    expect(submitResponse.status).toBe(400);

    const taskResponse = await getTaskById(
      new Request(`http://localhost/api/tasks/${taskId}`),
      taskRouteContext(taskId),
    );
    const taskBody = await taskResponse.json();
    expect(taskBody.task.status).toBe("open");
    expect(taskBody.task.submissionCount).toBe(0);
  });
});
