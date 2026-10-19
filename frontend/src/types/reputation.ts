/**
 * Represents a contributor's reputation score.
 * The score increases when a submission is accepted.
 * Designed to be extensible for future badge logic.
 */
export interface ContributorReputation {
  /** The contributor's wallet address. */
  contributor: string;
  /** The total reputation score accumulated from accepted submissions. */
  score: number;
  /** The number of completed (accepted) tasks. */
  completedTasks: number;
}

/**
 * Represents a badge that a contributor can earn.
 * Extensible: new badge types can be added without breaking existing code.
 */
export interface Badge {
  /** Unique identifier for the badge. */
  id: string;
  /** Display name of the badge. */
  name: string;
  /** Description of how to earn the badge. */
  description: string;
  /** Icon identifier for the badge. */
  icon: string;
}

/**
 * Response from the reputation API endpoint.
 */
export interface ReputationApiResponse {
  ok: boolean;
  reputation?: ContributorReputation;
  error?: string;
}