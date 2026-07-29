import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className,
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#5B63D6]/20 to-[#5B63D6]/5 border border-[#5B63D6]/15 flex items-center justify-center mb-5">
        <Icon className="w-7 h-7 text-[#8B92E8]" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-[#5A6578] max-w-sm mb-6">{description}</p>
      {action && (
        <Button
          variant="default"
          className="bg-[#5B63D6] hover:bg-[#4A52C5] text-white px-6 cursor-pointer"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );

  return content;
}
