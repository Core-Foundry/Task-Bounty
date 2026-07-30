import { afterEach, describe, expect, it } from "vitest";

import {
  addComment,
  approveSubmission,
  createTask,
  rejectSubmission,
  resetTaskWorkflowStore,
  submitTaskWork,
} from "@/lib/task-workflow";
import { listNotifications, resetNotificationStore } from "@/lib/notification-store";

const POSTER = "GPOSTER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CONTRIBUTOR = "GCONTRIB1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function futureDeadline(offsetSeconds = 86_400) {
  return Math.floor(Date.now() / 1000) + offsetSeconds;
}

function createSampleTask() {
  const result = createTask({
    poster: POSTER,
    title: "Design a logo",
    description: "Deliver an SVG logo",
    reward: 5_000_000,
    deadline: futureDeadline(),
    maxSubmissions: 2,
  });
  if (!result.ok) throw new Error("setup: createTask failed");
  return result.task;
}

function submitSampleWork(taskId: string) {
  const result = submitTaskWork(
    {
      taskId,
      contributor: CONTRIBUTOR,
      description: "Here is the logo",
      workUrl: "ipfs://logo",
    },
    [],
  );
  if (!result.ok) throw new Error("setup: submitTaskWork failed");
  return result.submission;
}

describe("task-workflow notification triggers", () => {
  afterEach(() => {
    resetTaskWorkflowStore();
    resetNotificationStore();
  });

  it("broadcasts a bounty_created notification when a task is created", () => {
    const task = createSampleTask();

    const everyoneSees = listNotifications("anyone-at-all");
    expect(everyoneSees).toHaveLength(1);
    expect(everyoneSees[0]).toMatchObject({
      type: "bounty_created",
      taskId: task.id,
    });
  });

  it("notifies the poster when a submission is received", () => {
    const task = createSampleTask();
    const submission = submitSampleWork(task.id);

    const posterNotifications = listNotifications(POSTER).filter(
      (n) => n.type === "submission_received",
    );
    expect(posterNotifications).toHaveLength(1);
    expect(posterNotifications[0]).toMatchObject({
      taskId: task.id,
      submissionId: submission.id,
    });
  });

  it("notifies the contributor of approval and reward payment", () => {
    const task = createSampleTask();
    const submission = submitSampleWork(task.id);

    const result = approveSubmission(task.id, submission.id, POSTER);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.submission.status).toBe("approved");
    expect(result.task.status).toBe("completed");

    const contributorNotifications = listNotifications(CONTRIBUTOR).map((n) => n.type);
    expect(contributorNotifications).toContain("submission_approved");
    expect(contributorNotifications).toContain("reward_paid");
  });

  it("notifies the contributor when a submission is rejected", () => {
    const task = createSampleTask();
    const submission = submitSampleWork(task.id);

    const result = rejectSubmission(task.id, submission.id, POSTER);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.submission.status).toBe("rejected");

    const contributorNotifications = listNotifications(CONTRIBUTOR).filter(
      (n) => n.type === "submission_rejected",
    );
    expect(contributorNotifications).toHaveLength(1);
  });

  it("rejects approval attempts from a non-poster actor", () => {
    const task = createSampleTask();
    const submission = submitSampleWork(task.id);

    const result = approveSubmission(task.id, submission.id, "GSOMEONE-ELSE");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(409);
  });

  it("prevents reviewing a submission twice", () => {
    const task = createSampleTask();
    const submission = submitSampleWork(task.id);

    approveSubmission(task.id, submission.id, POSTER);
    const second = approveSubmission(task.id, submission.id, POSTER);

    expect(second.ok).toBe(false);
  });

  it("notifies the poster when a contributor comments, and vice versa", () => {
    const task = createSampleTask();
    const submission = submitSampleWork(task.id);

    const fromContributor = addComment({
      taskId: task.id,
      submissionId: submission.id,
      author: CONTRIBUTOR,
      message: "Any feedback?",
    });
    expect(fromContributor.ok).toBe(true);

    const posterComments = listNotifications(POSTER).filter(
      (n) => n.type === "comment_added",
    );
    expect(posterComments).toHaveLength(1);

    const fromPoster = addComment({
      taskId: task.id,
      submissionId: submission.id,
      author: POSTER,
      message: "Looks great!",
    });
    expect(fromPoster.ok).toBe(true);

    const contributorComments = listNotifications(CONTRIBUTOR).filter(
      (n) => n.type === "comment_added",
    );
    expect(contributorComments).toHaveLength(1);
  });

  it("rejects comments with an empty message", () => {
    const task = createSampleTask();

    const result = addComment({ taskId: task.id, author: POSTER, message: "   " });
    expect(result.ok).toBe(false);
  });
});
