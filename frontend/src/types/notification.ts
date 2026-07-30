export type NotificationType =
  | "bounty_created"
  | "submission_received"
  | "submission_approved"
  | "submission_rejected"
  | "reward_paid"
  | "comment_added";

export interface NotificationRecord {
  id: string;
  /** Recipient wallet address, or "*" for a platform-wide broadcast. */
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  /** Related task/submission ids, if any, so the UI can deep-link. */
  taskId?: string;
  submissionId?: string;
  read: boolean;
  createdAt: string;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  taskId?: string;
  submissionId?: string;
}
