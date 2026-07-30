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

export type TaskSortOrder = "newest" | "reward_desc" | "deadline_asc";

export interface ListTasksQuery {
  /** Case-insensitive substring match against title and description. */
  search?: string;
  minReward?: number;
  maxReward?: number;
  difficulty?: TaskDifficulty;
  /** Matches tasks whose technologies list includes this value (case-insensitive). */
  technology?: string;
  /** Case-insensitive substring match against organization. */
  organization?: string;
  sort?: TaskSortOrder;
  /** 1-based page number. Defaults to 1. */
  page?: number;
  /** Items per page. Defaults to 10, clamped to [1, 50]. */
  pageSize?: number;
}

export interface ListTasksResult {
  tasks: TaskRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
