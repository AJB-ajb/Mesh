"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { labels } from "@/lib/labels";
import type { SpaceMessageWithSender } from "@/lib/hooks/use-space-messages";
import type { SpacePostingWithCreator } from "@/lib/supabase/types";
import type { SpaceMemberWithProfile } from "@/lib/hooks/use-space";
import { MessageBubble } from "./message-bubble";
import { PostingCardInline } from "./posting-card-inline";
import { SystemMessage } from "./system-message";

interface ConversationTimelineProps {
  messages: SpaceMessageWithSender[];
  userId: string | null;
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  postings?: Map<string, SpacePostingWithCreator>;
  spaceId?: string;
  isAdmin?: boolean;
  typingUsers?: string[];
  members?: SpaceMemberWithProfile[];
}

export function ConversationTimeline({
  messages,
  userId,
  hasMore,
  isLoading,
  onLoadMore,
  postings,
  spaceId,
  isAdmin,
  typingUsers,
  members,
}: ConversationTimelineProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(messages.length);

  // Auto-scroll: instant on initial load, smooth on new messages
  useEffect(() => {
    if (!isLoading && bottomRef.current) {
      const isInitial = prevMessageCount.current === 0;
      bottomRef.current.scrollIntoView({
        behavior: isInitial ? "instant" : "smooth",
      });
    }
    prevMessageCount.current = messages.length;
  }, [isLoading, messages.length]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
    >
      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pb-2">
          <Button variant="ghost" size="sm" onClick={onLoadMore}>
            Load earlier messages
          </Button>
        </div>
      )}

      {/* Messages */}
      {messages.map((msg) => {
        if (msg.type === "system") {
          return <SystemMessage key={msg.id} content={msg.content ?? ""} />;
        }

        const isOwn = msg.sender_id === userId;
        const senderName = msg.profiles?.full_name ?? "Unknown";

        // Render posting messages as inline cards
        const posting = msg.posting_id
          ? postings?.get(msg.posting_id)
          : undefined;
        if (msg.type === "posting" && posting) {
          return (
            <PostingCardInline
              key={msg.id}
              posting={posting}
              creatorName={senderName}
              createdAt={msg.created_at}
              isOwn={isOwn}
              spaceId={spaceId}
              isAdmin={isAdmin}
              replyCount={posting.replyCount}
            />
          );
        }

        const senderInitials = senderName
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();

        return (
          <MessageBubble
            key={msg.id}
            sender={senderName}
            senderInitials={senderInitials}
            content={msg.content ?? ""}
            createdAt={msg.created_at}
            isOwn={isOwn}
          />
        );
      })}

      {/* Typing indicator */}
      {typingUsers && typingUsers.length > 0 && (
        <p className="text-xs text-muted-foreground px-1 animate-pulse">
          {labels.spaces.typingIndicator(
            typingUsers.map((uid) => {
              const member = members?.find((m) => m.user_id === uid);
              return member?.profiles?.full_name ?? "Someone";
            }),
          )}
        </p>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
