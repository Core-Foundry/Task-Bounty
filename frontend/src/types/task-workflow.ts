export type TaskStatus = "open" | "in_progress" | "completed" | "cancelled" | "disputed";

export type SubmissionStatus = "pending" | "approved" | "rejected";

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
}

export interface SubmitTaskInput {
  taskId: string;
  contributor: string;
  description: string;
  workUrl?: string;
}
