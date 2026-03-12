"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type MessageBubbleProps = {
  sender: string;
  senderInitials: string;
  content: string;
  time: string;
  isOwn: boolean;
};

export function MessageBubble({
  sender,
  senderInitials,
  content,
  time,
  isOwn,
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
          <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
          <p
            className={cn(
              "text-[10px] mt-1",
              isOwn ? "text-primary-foreground/60" : "text-muted-foreground",
            )}
          >
            {time}
          </p>
        </div>
      </div>
    </div>
  );
}
