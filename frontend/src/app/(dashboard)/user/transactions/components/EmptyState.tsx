import { Receipt } from "lucide-react";
import BaseEmptyState from "@/components/EmptyState";

export default function EmptyState() {
  return (
    <BaseEmptyState
      icon={Receipt}
      title="No transactions yet"
      description="Your transactions will appear here once you start using Paymesh."
    />
  );
}
