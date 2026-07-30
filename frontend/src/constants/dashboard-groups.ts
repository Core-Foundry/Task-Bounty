export type GroupActivity = "high" | "medium" | "low";

export type DashboardGroup = {
  id: string;
  name: string;
  totalFunds: number;
  members: number;
  activity: GroupActivity;
  recentTransactions: number;
  tokens: Array<{ name: string; icon: string; amount: string }>;
};

/**
 * Canonical dashboard group records. In production this would be hydrated from
 * storage / contract reads; the query layer treats it as the data source.
 */
export const DASHBOARD_GROUPS: DashboardGroup[] = [
  {
    id: "1",
    name: "Paymesh Core",
    totalFunds: 24500,
    members: 8,
    activity: "high",
    recentTransactions: 42,
    tokens: [
      { name: "wBTC", icon: "/coin/Image (3).png", amount: "0.15" },
      { name: "ETH", icon: "/coin/Image (4).png", amount: "3.2" },
      { name: "USDC", icon: "/coin/Image (1).png", amount: "8,500" },
    ],
  },
  {
    id: "2",
    name: "TechFlow DAO",
    totalFunds: 18750,
    members: 12,
    activity: "high",
    recentTransactions: 36,
    tokens: [
      { name: "ETH", icon: "/coin/Image (4).png", amount: "5.1" },
      { name: "USDT", icon: "/coin/Image.png", amount: "6,200" },
      { name: "XLM", icon: "/Stellar.png", amount: "15,000" },
    ],
  },
  {
    id: "3",
    name: "Greenwave Fund",
    totalFunds: 12300,
    members: 5,
    activity: "medium",
    recentTransactions: 19,
    tokens: [
      { name: "USDC", icon: "/coin/Image (1).png", amount: "9,800" },
      { name: "XLM", icon: "/Stellar.png", amount: "8,000" },
    ],
  },
  {
    id: "4",
    name: "CryptoNest",
    totalFunds: 8900,
    members: 4,
    activity: "medium",
    recentTransactions: 14,
    tokens: [
      { name: "wBTC", icon: "/coin/Image (3).png", amount: "0.05" },
      { name: "USDT", icon: "/coin/Image.png", amount: "4,200" },
    ],
  },
  {
    id: "5",
    name: "DataPulse",
    totalFunds: 5600,
    members: 6,
    activity: "low",
    recentTransactions: 7,
    tokens: [
      { name: "ETH", icon: "/coin/Image (4).png", amount: "1.8" },
      { name: "USDC", icon: "/coin/Image (1).png", amount: "1,200" },
    ],
  },
];
