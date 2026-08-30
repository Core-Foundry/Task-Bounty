export type ActivityType =
  | "grant_saved"
  | "grant_unsaved"
  | "application_submitted"
  | "application_status_updated"
  | "account_updated"
  | "bounty_created"
  | "submission_created"
  | "submission_reviewed"
  | "comment_posted"
  | "profile_updated";

export interface ActivityRecord {
  id: string;
  /** Wallet address or user ID owning this activity */
  userId: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string; // ISO string
  metadata?: {
    grantId?: string;
    grantName?: string;
    applicationId?: string;
    status?: string;
    taskId?: string;
    taskTitle?: string;
    submissionId?: string;
    updatedFields?: string[];
    [key: string]: unknown;
  };
}

export interface CreateActivityInput {
  userId: string;
  type: ActivityType;
  title: string;
  description: string;
  metadata?: ActivityRecord["metadata"];
}

export interface ListActivitiesQuery {
  userId: string;
  type?: ActivityType;
  limit?: number;
  offset?: number;
}
