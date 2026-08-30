import type {
  AddCommentInput,
  CommentRecord,
  CreateTaskInput,
  ListTasksQuery,
  ListTasksResult,
  SubmissionRecord,
  SubmitTaskInput,
  TaskDifficulty,
  TaskRecord,
  TaskStatus,
} from "@/types/task-workflow";
import type { ValidatedTaskSubmissionFile } from "@/lib/task-submission-files";
import {
  BROADCAST_USER_ID,
  createNotification,
} from "@/lib/notification-store";

export const MIN_TASK_REWARD = 1_000_000;
export const MAX_TASK_DEADLINE_OFFSET_SECONDS = 365 * 24 * 60 * 60;

export const DEFAULT_TASK_DIFFICULTY: TaskDifficulty = "intermediate";
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;
const TASK_DIFFICULTIES: TaskDifficulty[] = ["beginner", "intermediate", "advanced"];

type WorkflowSuccess<T> = { ok: true } & T;

type WorkflowFailure = {
  ok: false;
  status: 400 | 404 | 409;
  error: string;
  details?: string[];
};

export type WorkflowResult<T> = WorkflowSuccess<T> | WorkflowFailure;

const tasks = new Map<string, TaskRecord>();
const submissions = new Map<string, SubmissionRecord>();
const taskSubmissions = new Map<string, string[]>();
const contributorSubmissions = new Map<string, Set<string>>();
const comments = new Map<string, CommentRecord>();

const DEFAULT_TASK_RETENTION_DAYS = 180;

function readRetentionDays(envKey: string, fallback: number): number {
  const raw = process.env?.[envKey];
  const value = Number(raw ?? "");
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getTaskRetentionDays(): number {
  return readRetentionDays(
    "NEXT_PUBLIC_TASK_RETENTION_DAYS",
    DEFAULT_TASK_RETENTION_DAYS,
  );
}

export const TASK_RETENTION_DAYS = getTaskRetentionDays();

let nextTaskId = 1;
let nextSubmissionId = 1;
let nextCommentId = 1;

function isFinalizedTask(task: TaskRecord): boolean {
  return task.status === "completed" || task.status === "cancelled" || task.status === "disputed";
}

function isExpiredTaskRecord(task: TaskRecord, now: Date): boolean {
  if (!isFinalizedTask(task)) {
    return false;
  }

  const createdAt = Date.parse(task.createdAt);
  if (!Number.isFinite(createdAt)) {
    return false;
  }

  const cutoff = now.getTime() - getTaskRetentionDays() * 24 * 60 * 60 * 1000;
  return createdAt < cutoff;
}

export function pruneExpiredTaskRecords(now: Date = new Date()): number {
  let removed = 0;

  for (const [taskId, task] of tasks.entries()) {
    if (!isExpiredTaskRecord(task, now)) {
      continue;
    }

    tasks.delete(taskId);
    taskSubmissions.delete(taskId);
    contributorSubmissions.delete(taskId);

    for (const [submissionId, submission] of submissions.entries()) {
      if (submission.taskId === taskId) {
        submissions.delete(submissionId);
      }
    }

    for (const [commentId, comment] of comments.entries()) {
      if (comment.taskId === taskId) {
        comments.delete(commentId);
      }
    }

    removed += 1;
  }

  return removed;
}

function validateCreateTaskInput(input: CreateTaskInput, nowSeconds: number): string[] {
  const errors: string[] = [];

  if (!input.poster.trim()) {
    errors.push("Poster address is required.");
  }

  if (!input.title.trim()) {
    errors.push("Task title is required.");
  }

  if (!input.description.trim()) {
    errors.push("Task description is required.");
  }

  if (!Number.isFinite(input.reward) || input.reward < MIN_TASK_REWARD) {
    errors.push(`Reward must be at least ${MIN_TASK_REWARD} stroops (0.1 XLM).`);
  }

  if (!Number.isFinite(input.deadline)) {
    errors.push("Deadline must be a valid Unix timestamp.");
  } else if (input.deadline <= nowSeconds) {
    errors.push("Deadline must be in the future.");
  } else if (input.deadline > nowSeconds + MAX_TASK_DEADLINE_OFFSET_SECONDS) {
    errors.push("Deadline cannot be more than 365 days from now.");
  }

  if (!Number.isInteger(input.maxSubmissions) || input.maxSubmissions < 1) {
    errors.push("Max submissions must be at least 1.");
  }

  return errors;
}

export function createTask(
  input: CreateTaskInput,
  now: Date = new Date(),
): WorkflowResult<{ task: TaskRecord }> {
  pruneExpiredTaskRecords(now);

  const nowSeconds = Math.floor(now.getTime() / 1000);
  const errors = validateCreateTaskInput(input, nowSeconds);

  if (errors.length > 0) {
    return {
      ok: false,
      status: 400,
      error: "Invalid task payload.",
      details: errors,
    };
  }

  const id = String(nextTaskId++);
  const task: TaskRecord = {
    id,
    poster: input.poster.trim(),
    title: input.title.trim(),
    description: input.description.trim(),
    reward: input.reward,
    deadline: input.deadline,
    maxSubmissions: input.maxSubmissions,
    submissionCount: 0,
    status: "open",
    createdAt: now.toISOString(),
    difficulty:
      input.difficulty && TASK_DIFFICULTIES.includes(input.difficulty)
        ? input.difficulty
        : DEFAULT_TASK_DIFFICULTY,
    technologies: (input.technologies ?? [])
      .map((tech) => tech.trim())
      .filter((tech) => tech.length > 0),
    organizationId: input.organizationId?.trim() ?? "",
  };

  tasks.set(id, task);
  taskSubmissions.set(id, []);
  contributorSubmissions.set(id, new Set());

  createNotification(
    {
      userId: BROADCAST_USER_ID,
      type: "bounty_created",
      title: "New bounty created",
      message: `${task.title} is now open for submissions.`,
      taskId: task.id,
    },
    now,
  );

  return { ok: true, task };
}

export function getTask(taskId: string): WorkflowResult<{ task: TaskRecord }> {
  pruneExpiredTaskRecords(new Date());

  const task = tasks.get(taskId);

  if (!task) {
    return {
      ok: false,
      status: 404,
      error: "Task not found.",
    };
  }

  return { ok: true, task: { ...task } };
}

/**
 * Advanced bounty discovery: filters combine with AND semantics, results
 * are sorted, then paginated. Pure/read-only — safe to call repeatedly as
 * filter state changes.
 */
export function listTasks(query: ListTasksQuery = {}): ListTasksResult {
  pruneExpiredTaskRecords(new Date());

  const search = query.search?.trim().toLowerCase();
  const technology = query.technology?.trim().toLowerCase();
  const organizationId = query.organizationId?.trim();

  const filtered = Array.from(tasks.values()).filter((task) => {
    if (typeof query.minReward === "number" && task.reward < query.minReward) {
      return false;
    }
    if (typeof query.maxReward === "number" && task.reward > query.maxReward) {
      return false;
    }
    if (query.difficulty && task.difficulty !== query.difficulty) {
      return false;
    }
    if (
      technology &&
      !task.technologies.some((tech) => tech.toLowerCase().includes(technology))
    ) {
      return false;
    }
    if (organizationId && task.organizationId !== organizationId) {
      return false;
    }
    if (search) {
      const haystack = `${task.title} ${task.description}`.toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }
    return true;
  });

  const sort = query.sort ?? "newest";
  filtered.sort((a, b) => {
    switch (sort) {
      case "reward_desc":
        return b.reward - a.reward;
      case "deadline_asc":
        return a.deadline - b.deadline;
      case "newest":
      default:
        return b.createdAt.localeCompare(a.createdAt);
    }
  });

  const total = filtered.length;
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(
      1,
      Number.isFinite(query.pageSize) && query.pageSize
        ? Math.floor(query.pageSize)
        : DEFAULT_PAGE_SIZE,
    ),
  );
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(
    totalPages,
    Math.max(
      1,
      Number.isFinite(query.page) && query.page ? Math.floor(query.page) : 1,
    ),
  );

  const start = (page - 1) * pageSize;
  const pageTasks = filtered.slice(start, start + pageSize).map((task) => ({ ...task }));

  return { tasks: pageTasks, total, page, pageSize, totalPages };
}

export function submitTaskWork(
  input: SubmitTaskInput,
  files: ValidatedTaskSubmissionFile[],
  now: Date = new Date(),
): WorkflowResult<{ task: TaskRecord; submission: SubmissionRecord }> {
  const taskResult = getTask(input.taskId);

  if (!taskResult.ok) {
    return taskResult;
  }

  const task = tasks.get(input.taskId)!;

  if (task.status !== "open" && task.status !== "in_progress") {
    return {
      ok: false,
      status: 409,
      error: "Task is not accepting submissions.",
      details: [`Current status: ${task.status}`],
    };
  }

  const nowSeconds = Math.floor(now.getTime() / 1000);

  if (nowSeconds > task.deadline) {
    return {
      ok: false,
      status: 409,
      error: "Task deadline has passed.",
    };
  }

  const contributor = input.contributor.trim();

  if (!contributor) {
    return {
      ok: false,
      status: 400,
      error: "Contributor address is required.",
    };
  }

  if (!input.description.trim()) {
    return {
      ok: false,
      status: 400,
      error: "Submission description is required.",
    };
  }

  const contributors = contributorSubmissions.get(task.id) ?? new Set<string>();

  if (contributors.has(contributor)) {
    return {
      ok: false,
      status: 409,
      error: "Contributor has already submitted work for this task.",
    };
  }

  if (task.submissionCount >= task.maxSubmissions) {
    return {
      ok: false,
      status: 409,
      error: "Maximum number of submissions reached for this task.",
    };
  }

  const submissionId = String(nextSubmissionId++);
  const submission: SubmissionRecord = {
    id: submissionId,
    taskId: task.id,
    contributor,
    workUrl: input.workUrl?.trim() ?? "",
    description: input.description.trim(),
    submittedAt: now.toISOString(),
    status: "pending",
    files: files.map((file) => ({
      name: file.name,
      size: file.size,
      extension: file.extension,
      kind: file.kind,
      detectedMimeType: file.detectedMimeType,
    })),
  };

  submissions.set(submissionId, submission);
  taskSubmissions.set(task.id, [...(taskSubmissions.get(task.id) ?? []), submissionId]);
  contributors.add(contributor);
  contributorSubmissions.set(task.id, contributors);

  const nextStatus: TaskStatus = task.status === "open" ? "in_progress" : task.status;
  const updatedTask: TaskRecord = {
    ...task,
    submissionCount: task.submissionCount + 1,
    status: nextStatus,
  };

  tasks.set(task.id, updatedTask);

  createNotification(
    {
      userId: task.poster,
      type: "submission_received",
      title: "New submission received",
      message: `${contributor} submitted work for "${task.title}".`,
      taskId: task.id,
      submissionId: submission.id,
    },
    now,
  );

  return {
    ok: true,
    task: { ...updatedTask },
    submission,
  };
}

export function approveSubmission(
  taskId: string,
  submissionId: string,
  actor: string,
  now: Date = new Date(),
): WorkflowResult<{ task: TaskRecord; submission: SubmissionRecord }> {
  const taskResult = getTask(taskId);
  if (!taskResult.ok) {
    return taskResult;
  }

  const task = tasks.get(taskId)!;
  const submission = submissions.get(submissionId);

  if (!submission || submission.taskId !== taskId) {
    return { ok: false, status: 404, error: "Submission not found." };
  }

  if (task.poster !== actor.trim()) {
    return {
      ok: false,
      status: 409,
      error: "Only the task poster can approve submissions.",
    };
  }

  if (submission.status !== "pending") {
    return {
      ok: false,
      status: 409,
      error: "Submission has already been reviewed.",
      details: [`Current status: ${submission.status}`],
    };
  }

  const updatedSubmission: SubmissionRecord = { ...submission, status: "approved" };
  submissions.set(submissionId, updatedSubmission);

  const updatedTask: TaskRecord = { ...task, status: "completed" };
  tasks.set(taskId, updatedTask);

  createNotification(
    {
      userId: submission.contributor,
      type: "submission_approved",
      title: "Submission approved",
      message: `Your submission for "${task.title}" was approved.`,
      taskId: task.id,
      submissionId: submission.id,
    },
    now,
  );

  createNotification(
    {
      userId: submission.contributor,
      type: "reward_paid",
      title: "Reward paid",
      message: `You received the reward for "${task.title}".`,
      taskId: task.id,
      submissionId: submission.id,
    },
    now,
  );

  return { ok: true, task: updatedTask, submission: updatedSubmission };
}

export function rejectSubmission(
  taskId: string,
  submissionId: string,
  actor: string,
  now: Date = new Date(),
): WorkflowResult<{ task: TaskRecord; submission: SubmissionRecord }> {
  const taskResult = getTask(taskId);
  if (!taskResult.ok) {
    return taskResult;
  }

  const task = tasks.get(taskId)!;
  const submission = submissions.get(submissionId);

  if (!submission || submission.taskId !== taskId) {
    return { ok: false, status: 404, error: "Submission not found." };
  }

  if (task.poster !== actor.trim()) {
    return {
      ok: false,
      status: 409,
      error: "Only the task poster can reject submissions.",
    };
  }

  if (submission.status !== "pending") {
    return {
      ok: false,
      status: 409,
      error: "Submission has already been reviewed.",
      details: [`Current status: ${submission.status}`],
    };
  }

  const updatedSubmission: SubmissionRecord = { ...submission, status: "rejected" };
  submissions.set(submissionId, updatedSubmission);

  createNotification(
    {
      userId: submission.contributor,
      type: "submission_rejected",
      title: "Submission rejected",
      message: `Your submission for "${task.title}" was rejected.`,
      taskId: task.id,
      submissionId: submission.id,
    },
    now,
  );

  return { ok: true, task: { ...task }, submission: updatedSubmission };
}

/**
 * Submission history for a contributor, newest first. Includes the task
 * title so the UI can show one row per submission attempt.
 */
export function listContributorSubmissions(
  contributor: string,
  now: Date = new Date(),
): WorkflowResult<{ submissions: Array<SubmissionRecord & { taskTitle: string; taskStatus: TaskStatus }> }> {
  const who = contributor.trim();

  if (!who) {
    return {
      ok: false,
      status: 400,
      error: "Contributor address is required.",
    };
  }

  const rows = Array.from(submissions.values())
    .filter((submission) => submission.contributor === who)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .map((submission) => {
      const task = tasks.get(submission.taskId);
      return {
        ...submission,
        taskTitle: task?.title ?? "",
        taskStatus: task?.status ?? ("open" as TaskStatus),
      };
    });

  return { ok: true, submissions: rows };
}

export function addComment(
  input: AddCommentInput,
  now: Date = new Date(),
): WorkflowResult<{ comment: CommentRecord }> {
  const taskResult = getTask(input.taskId);
  if (!taskResult.ok) {
    return taskResult;
  }

  const task = tasks.get(input.taskId)!;
  const author = input.author.trim();

  if (!author) {
    return { ok: false, status: 400, error: "Comment author is required." };
  }

  if (!input.message.trim()) {
    return { ok: false, status: 400, error: "Comment message is required." };
  }

  let submission: SubmissionRecord | undefined;
  if (input.submissionId) {
    submission = submissions.get(input.submissionId);
    if (!submission || submission.taskId !== input.taskId) {
      return { ok: false, status: 404, error: "Submission not found." };
    }
  }

  const comment: CommentRecord = {
    id: String(nextCommentId++),
    taskId: input.taskId,
    submissionId: input.submissionId,
    author,
    message: input.message.trim(),
    createdAt: now.toISOString(),
  };

  comments.set(comment.id, comment);

  const recipient = submission
    ? author === submission.contributor
      ? task.poster
      : submission.contributor
    : task.poster;

  if (recipient !== author) {
    createNotification(
      {
        userId: recipient,
        type: "comment_added",
        title: "New comment",
        message: `${author} commented on "${task.title}".`,
        taskId: task.id,
        submissionId: input.submissionId,
      },
      now,
    );
  }

  return { ok: true, comment };
}

export function resetTaskWorkflowStore() {
  tasks.clear();
  submissions.clear();
  taskSubmissions.clear();
  contributorSubmissions.clear();
  comments.clear();
  nextTaskId = 1;
  nextSubmissionId = 1;
  nextCommentId = 1;
}
