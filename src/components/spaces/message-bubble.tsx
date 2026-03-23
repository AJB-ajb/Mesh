"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RelativeTime } from "@/components/ui/relative-time";
import { formatTimeAgoShort } from "@/lib/format";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  sender: string;
  senderInitials: string;
  content: string;
  createdAt: string;
  isOwn: boolean;
  revealHidden?: boolean;
}

export function MessageBubble({
  sender,
  senderInitials,
  content,
  createdAt,
  isOwn,
  revealHidden = false,
}: MessageBubbleProps) {
  return (
    <div className={cn("flex gap-2", isOwn ? "justify-end" : "justify-start")}>
      {!isOwn && (
        <Avatar size="sm" className="mt-1 shrink-0">
          <AvatarFallback>{senderInitials}</AvatarFallback>
        </Avatar>
      )}
      <div className={cn("max-w-[75%]", !isOwn && "space-y-0.5")}>
        {!isOwn && (
          <p className="text-xs font-medium text-muted-foreground px-1">
            {sender}
          </p>
        )}
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2",
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted rounded-bl-md",
          )}
        >
          <MarkdownRenderer
            content={content}
            className="text-sm"
            revealHidden={revealHidden}
          />
          <RelativeTime
            date={createdAt}
            formatter={formatTimeAgoShort}
            className={cn(
              "text-[10px] mt-1 block",
              isOwn ? "text-primary-foreground/60" : "text-muted-foreground",
            )}
          />
        </div>
      </div>
    </div>
  );
}
