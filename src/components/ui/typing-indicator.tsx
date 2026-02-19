"use client";

import { labels } from "@/lib/labels";
import { cn } from "@/lib/utils";

type TypingIndicatorProps = {
  userName?: string;
  className?: string;
};

export function TypingIndicator({ userName, className }: TypingIndicatorProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground",
        className,
      )}
    >
      <div className="flex items-center gap-1">
        <span
          className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
      <span className="text-xs">
        {userName ? labels.status.isTyping(userName) : labels.status.typing}
      </span>
    </div>
  );
}
