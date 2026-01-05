import { memo, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "recording";
  icon?: ReactNode;
  pulse?: boolean;
  className?: string;
}

export const StatusBadge = memo(({
  children,
  variant = "default",
  icon,
  pulse = false,
  className,
}: StatusBadgeProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "warning":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "danger":
        return "bg-rose-500/20 text-rose-400 border-rose-500/30";
      case "info":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
      case "recording":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-primary/20 text-primary-light border-primary/30";
    }
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-sm",
        "font-medium text-sm",
        getVariantStyles(),
        pulse && "animate-pulse",
        className
      )}
    >
      {icon && (
        <span className={cn(pulse && "animate-bounce")}>
          {icon}
        </span>
      )}
      {children}
    </div>
  );
});

StatusBadge.displayName = "StatusBadge";
