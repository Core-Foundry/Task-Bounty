import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET as getMySubmissions } from "@/app/api/my-submissions/route";
import { POST as createTaskRoute } from "@/app/api/tasks/route";
import { POST as submitTaskWorkRoute } from "@/app/api/tasks/[taskId]/submissions/route";
import { POST as approveRoute } from "@/app/api/tasks/[taskId]/submissions/[submissionId]/approve/route";
import { resetTaskWorkflowStore } from "@/lib/task-workflow";
import { createPdfFile, taskRouteContext } from "@/test/fixtures";
import {
  CONTRIBUTOR_ADDRESS,
  POSTER_ADDRESS,
  VALID_TASK_DATA,
} from "@/test/mock-data";

let submissionCounter = 0;

async function createTaskRequest() {
  return createTaskRoute(
    new Request("http://localhost/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        poster: POSTER_ADDRESS,
        ...VALID_TASK_DATA,
        reward: 1_000_000,
      }),
    }),
  );
}

async function submitWork(taskId: string, description: string) {
  const formData = new FormData();
  formData.append("contributor", CONTRIBUTOR_ADDRESS);
  formData.append("description", description);
  formData.append("files", createPdfFile(`history-${submissionCounter++}.pdf`));
  return submitTaskWorkRoute(
    new Request(`http://localhost/api/tasks/${taskId}/submissions`, {
      method: "POST",
      body: formData,
    }),
    taskRouteContext(taskId),
  );
}

function historyRequest(contributor: string) {
  const params = new URLSearchParams({ contributor });
  return new Request(`http://localhost/api/my-submissions?${params.toString()}`);
}

describe("submission history (my-submissions)", () => {
  beforeEach(() => {
    resetTaskWorkflowStore();
    submissionCounter = 0;
  });

  afterEach(() => {
    resetTaskWorkflowStore();
  });

  it("returns the contributor's submissions with task title, submitted date and status", async () => {
    const created = await (await createTaskRequest()).json();
    const taskId = created.task.id as string;

    const submitResponse = await submitWork(taskId, "History check submission.");
    expect(submitResponse.status).toBe(201);

    const historyResponse = await getMySubmissions(historyRequest(CONTRIBUTOR_ADDRESS));
    expect(historyResponse.status).toBe(200);
    expect(historyResponse.headers.get("Cache-Control")).toBe("no-store");

    const body = await historyResponse.json();
    expect(body.ok).toBe(true);
    expect(body.submissions).toHaveLength(1);
    expect(body.submissions[0]).toMatchObject({
      id: "1",
      taskId,
      contributor: CONTRIBUTOR_ADDRESS,
      status: "pending",
      taskTitle: VALID_TASK_DATA.title,
      taskStatus: "in_progress",
    });
    // Submitted date must be present and parseable.
    expect(typeof body.submissions[0].submittedAt).toBe("string");
    expect(new Date(body.submissions[0].submittedAt).toString()).not.toBe("Invalid Date");
  });

  it("reflects approval status changes in the history", async () => {
    const created = await (await createTaskRequest()).json();
    const taskId = created.task.id as string;
    const submitted = await (await submitWork(taskId, "Approve me.")).json();
    const submissionId = submitted.submission.id as string;

    const approveResponse = await approveRoute(
      new Request(`http://localhost/api/tasks/${taskId}/submissions/${submissionId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor: POSTER_ADDRESS }),
      }),
      { params: Promise.resolve({ taskId, submissionId }) },
    );
    expect(approveResponse.status).toBe(200);

    const body = await (await getMySubmissions(historyRequest(CONTRIBUTOR_ADDRESS))).json();
    expect(body.submissions[0]).toMatchObject({
      id: submissionId,
      status: "approved",
      taskStatus: "completed",
    });
  });

  it("returns an empty list for an unknown contributor", async () => {
    const body = await (
      await getMySubmissions(historyRequest("GUNKNOWN000000000000000000000000000000000000000000000"))
    ).json();
    expect(body).toMatchObject({ ok: true, submissions: [] });
  });

  it("returns 400 when the contributor parameter is missing", async () => {
    const response = await getMySubmissions(
      new Request("http://localhost/api/my-submissions"),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toMatchObject({ ok: false, error: "Contributor address is required." });
  });
});
