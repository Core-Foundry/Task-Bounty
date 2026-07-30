
import type { CompletedTask } from "@/types/task";

export const MOCK_COMPLETED_TASKS: CompletedTask[] = [
  {
    id: "1",
    title: "Build Dashboard UI",
    description: "Create a responsive dashboard interface with Tailwind CSS",
    category: "Development",
    contributor: {
      id: "c1",
      name: "Alice Johnson",
      address: "0x1234...abcd",
    },
    reward: 100,
    rewardToken: "XLM",
    completionDate: new Date("2026-01-15"),
    createdAt: new Date("2026-01-01"),
    poster: "Bob Smith",
  },
  {
    id: "2",
    title: "Write Documentation",
    description: "Document the API endpoints and usage examples",
    category: "Documentation",
    contributor: {
      id: "c2",
      name: "Charlie Brown",
      address: "0x5678...efgh",
    },
    reward: 50,
    rewardToken: "XLM",
    completionDate: new Date("2026-02-05"),
    createdAt: new Date("2026-01-20"),
    poster: "Diana Prince",
  },
  {
    id: "3",
    title: "Design New Logo",
    description: "Create a modern logo for the platform",
    category: "Design",
    contributor: {
      id: "c3",
      name: "Eve Davis",
      address: "0x90ab...ijkl",
    },
    reward: 150,
    rewardToken: "XLM",
    completionDate: new Date("2026-02-20"),
    createdAt: new Date("2026-02-01"),
    poster: "Frank Miller",
  },
  {
    id: "4",
    title: "Optimize Smart Contract",
    description: "Review and optimize the smart contract gas costs",
    category: "Development",
    contributor: {
      id: "c4",
      name: "Grace Lee",
      address: "0xcdef...mnop",
    },
    reward: 200,
    rewardToken: "XLM",
    completionDate: new Date("2026-03-10"),
    createdAt: new Date("2026-02-25"),
    poster: "Henry Wilson",
  },
  {
    id: "5",
    title: "Create Marketing Video",
    description: "Produce a short promotional video for the product",
    category: "Marketing",
    contributor: {
      id: "c5",
      name: "Ivy Chen",
      address: "0xghij...qrst",
    },
    reward: 300,
    rewardToken: "XLM",
    completionDate: new Date("2026-03-25"),
    createdAt: new Date("2026-03-01"),
    poster: "Jack White",
  },
];

export const CATEGORIES = [
  "All",
  "Development",
  "Documentation",
  "Design",
  "Marketing",
  "Other",
];

export const CONTRIBUTORS = [
  "All",
  "Alice Johnson",
  "Charlie Brown",
  "Eve Davis",
  "Grace Lee",
  "Ivy Chen",
];
