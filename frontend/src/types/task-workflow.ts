export type TaskStatus = "open" | "in_progress" | "completed" | "cancelled" | "disputed";

export type SubmissionStatus = "pending" | "approved" | "rejected";

export type TaskDifficulty = "beginner" | "intermediate" | "advanced";

export interface TaskRecord {
  id: string;
  poster: string;
  title: string;
  description: string;
  reward: number;
  deadline: number;
  maxSubmissions: number;
  submissionCount: number;
  status: TaskStatus;
  createdAt: string;
  difficulty: TaskDifficulty;
  /** Technology/skill tags, e.g. ["Rust", "Soroban"]. */
  technologies: string[];
  /** Name of the organization or team posting the bounty, if any. */
  organization: string;
}

export interface SubmissionRecord {
  id: string;
  taskId: string;
  contributor: string;
  workUrl: string;
  description: string;
  submittedAt: string;
  status: SubmissionStatus;
  files: Array<{
    name: string;
    size: number;
    extension: string;
    kind: string;
    detectedMimeType: string;
  }>;
}

export interface CreateTaskInput {
  poster: string;
  title: string;
  description: string;
  reward: number;
  deadline: number;
  maxSubmissions: number;
  difficulty?: TaskDifficulty;
  technologies?: string[];
  organization?: string;
}

export interface SubmitTaskInput {
  taskId: string;
  contributor: string;
  description: string;
  workUrl?: string;
}

export interface CommentRecord {
  id: string;
  taskId: string;
  submissionId?: string;
  author: string;
  message: string;
  createdAt: string;
}

export interface AddCommentInput {
  taskId: string;
  submissionId?: string;
  author: string;
  message: string;
}
