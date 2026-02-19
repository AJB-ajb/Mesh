"use client";

import { labels } from "@/lib/labels";
import { cn } from "@/lib/utils";

type OnlineStatusProps = {
  isOnline: boolean;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
};

export function OnlineStatus({
  isOnline,
  showLabel = false,
  size = "md",
  className,
}: OnlineStatusProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "rounded-full shrink-0",
          sizeClasses[size],
          isOnline
            ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
            : "bg-gray-400",
        )}
      />
      {showLabel && (
        <span className="text-xs text-muted-foreground">
          {isOnline ? labels.status.online : labels.status.offline}
        </span>
      )}
    </div>
  );
}

type OnlineStatusBadgeProps = {
  isOnline: boolean;
  children: React.ReactNode;
  position?: "top-right" | "bottom-right";
  className?: string;
};

export function OnlineStatusBadge({
  isOnline,
  children,
  position = "bottom-right",
  className,
}: OnlineStatusBadgeProps) {
  const positionClasses = {
    "top-right": "-top-0.5 -right-0.5",
    "bottom-right": "-bottom-0.5 -right-0.5",
  };

  return (
    <div className={cn("relative inline-block", className)}>
      {children}
      <span
        className={cn(
          "absolute h-3 w-3 rounded-full border-2 border-background",
          positionClasses[position],
          isOnline ? "bg-green-500" : "bg-gray-400",
        )}
      />
    </div>
  );
}
