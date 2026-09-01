import type { ValidatedTaskSubmissionFile } from "@/lib/task-submission-files";
import {
  createOrganization,
  resetOrganizationStore,
} from "@/lib/organization-store";
import {
  resetActivityStore,
  recordActivity,
} from "@/lib/activity-store";
import {
  addComment,
  approveSubmission,
  createTask,
  resetTaskWorkflowStore,
  submitTaskWork,
} from "@/lib/task-workflow";
import {
  createNotification,
  resetNotificationStore,
} from "@/lib/notification-store";

export const DEMO_USERS = {
  foundation: "GCFND7DEMOFOUNDATION",
  poster: "GPOSTER7DEMOACCOUNT",
  contributor: "GCONTR7DEMOCONTRIB",
  reviewer: "GREVIEW7DEMOREVIEWER",
} as const;

export type DemoSeedSummary = {
  organizations: number;
  tasks: number;
  submissions: number;
  comments: number;
  notifications: number;
  activities: number;
};

const DEMO_FILE: ValidatedTaskSubmissionFile = {
  name: "implementation-notes.md",
  size: 1_024,
  extension: "md",
  kind: "md",
  detectedMimeType: "text/markdown",
  providedMimeType: "text/markdown",
};

/**
 * Clears every in-memory application store used by the local demo and tests.
 * This intentionally does not touch Stellar ledger state or production data.
 */
export function resetDemoData(): void {
  resetOrganizationStore();
  resetTaskWorkflowStore();
  resetNotificationStore();
  resetActivityStore();
}

/**
 * Replaces the current local data with a deterministic set of common bounty
 * marketplace scenarios: an open bounty, an in-review bounty, and a completed
 * bounty with a contributor, comment, notification, and activity history.
 */
export function seedDemoData(now: Date = new Date()): DemoSeedSummary {
  resetDemoData();

  const organization = createOrganization(
    {
      name: "Stellar Builders Collective",
      description: "A community fund supporting open-source Stellar tooling.",
      website: "https://stellar.builders.example",
    },
    now,
  );
  if (!organization.ok) throw new Error(organization.error);

  const secondOrganization = createOrganization(
    {
      name: "Open Payments Lab",
      description: "Research and product experiments for accessible payments.",
      website: "https://payments-lab.example",
    },
    new Date(now.getTime() - 86_400_000),
  );
  if (!secondOrganization.ok) throw new Error(secondOrganization.error);

  const create = (input: Parameters<typeof createTask>[0], createdAt: Date) => {
    const result = createTask(input, createdAt);
    if (!result.ok) throw new Error(result.error);
    return result.task;
  };

  const openTask = create(
    {
      poster: DEMO_USERS.poster,
      title: "Build a Soroban transaction history component",
      description:
        "Create a responsive React component that groups wallet transactions by date and clearly shows loading, empty, and error states.",
      reward: 250_000_000,
      deadline: Math.floor(now.getTime() / 1_000) + 21 * 86_400,
      maxSubmissions: 3,
      difficulty: "intermediate",
      technologies: ["React", "TypeScript", "Soroban"],
      organizationId: organization.organization.id,
    },
    new Date(now.getTime() - 2 * 3_600_000),
  );

  const reviewTask = create(
    {
      poster: DEMO_USERS.foundation,
      title: "Write an SDK quick-start guide",
      description:
        "Turn the existing API examples into a concise onboarding guide with copy-paste snippets and troubleshooting notes.",
      reward: 150_000_000,
      deadline: Math.floor(now.getTime() / 1_000) + 10 * 86_400,
      maxSubmissions: 2,
      difficulty: "beginner",
      technologies: ["Documentation", "JavaScript", "Stellar"],
      organizationId: organization.organization.id,
    },
    new Date(now.getTime() - 3 * 86_400_000),
  );

  const completedTask = create(
    {
      poster: DEMO_USERS.reviewer,
      title: "Audit token payment edge cases",
      description:
        "Review the payment flow for rounding, insufficient balance, and failed transfer handling, then report actionable fixes.",
      reward: 500_000_000,
      deadline: Math.floor(now.getTime() / 1_000) + 3 * 86_400,
      maxSubmissions: 2,
      difficulty: "advanced",
      technologies: ["Rust", "Soroban", "Security"],
      organizationId: secondOrganization.organization.id,
    },
    new Date(now.getTime() - 14 * 86_400_000),
  );

  const reviewSubmission = submitTaskWork(
    {
      taskId: reviewTask.id,
      contributor: DEMO_USERS.contributor,
      workUrl: "https://github.com/stellar-builders/sdk-guide/pull/12",
      description: "Added the quick-start guide, examples, and a troubleshooting section.",
    },
    [DEMO_FILE],
    new Date(now.getTime() - 2 * 3_600_000),
  );
  if (!reviewSubmission.ok) throw new Error(reviewSubmission.error);

  const completedSubmission = submitTaskWork(
    {
      taskId: completedTask.id,
      contributor: DEMO_USERS.contributor,
      workUrl: "https://github.com/open-payments-lab/token-audit/pull/7",
      description: "Documented three edge cases and supplied regression tests for each.",
    },
    [DEMO_FILE],
    new Date(now.getTime() - 7 * 86_400_000),
  );
  if (!completedSubmission.ok) throw new Error(completedSubmission.error);
  const approved = approveSubmission(
    completedTask.id,
    completedSubmission.submission.id,
    completedTask.poster,
    new Date(now.getTime() - 6 * 86_400_000),
  );
  if (!approved.ok) throw new Error(approved.error);

  const comment = addComment(
    {
      taskId: reviewTask.id,
      submissionId: reviewSubmission.submission.id,
      author: reviewTask.poster,
      message: "Thanks! Please add one example for failed transactions before approval.",
    },
    new Date(now.getTime() - 3_600_000),
  );
  if (!comment.ok) throw new Error(comment.error);

  createNotification(
    {
      userId: DEMO_USERS.contributor,
      type: "bounty_created",
      title: "New bounty available",
      message: "A new Soroban transaction history bounty is ready for submissions.",
      taskId: openTask.id,
    },
    new Date(now.getTime() - 30 * 60_000),
  );
  recordActivity(
    {
      userId: DEMO_USERS.contributor,
      type: "submission_reviewed",
      title: "Submission approved",
      description: `Your audit submission for “${completedTask.title}” was approved.`,
      metadata: { taskId: completedTask.id, taskTitle: completedTask.title, status: "approved" },
    },
    new Date(now.getTime() - 6 * 86_400_000),
  );
  recordActivity(
    {
      userId: DEMO_USERS.poster,
      type: "bounty_created",
      title: "Bounty published",
      description: openTask.title,
      metadata: { taskId: openTask.id, taskTitle: openTask.title },
    },
    new Date(now.getTime() - 2 * 3_600_000),
  );

  return {
    organizations: 2,
    tasks: 3,
    submissions: 2,
    comments: 1,
    notifications: 9,
    activities: 2,
  };
}

export function isDemoSeedEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_SEED_DEMO_DATA === "true";
}
