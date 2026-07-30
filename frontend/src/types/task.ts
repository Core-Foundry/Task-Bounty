
export interface CompletedTask {
  id: string;
  title: string;
  description: string;
  category: string;
  contributor: {
    id: string;
    name: string;
    address: string;
  };
  reward: number;
  rewardToken: string;
  completionDate: Date;
  createdAt: Date;
  poster: string;
}
