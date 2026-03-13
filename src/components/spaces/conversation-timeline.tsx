"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SpaceMessageWithSender } from "@/lib/hooks/use-space-messages";
import type { SpacePosting } from "@/lib/supabase/types";
import { MessageBubble } from "./message-bubble";
import { PostingCardInline } from "./posting-card-inline";
import { SystemMessage } from "./system-message";

interface ConversationTimelineProps {
  messages: SpaceMessageWithSender[];
  userId: string | null;
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  postings?: Map<string, SpacePosting>;
}

export function ConversationTimeline({
  messages,
  userId,
  hasMore,
  isLoading,
  onLoadMore,
  postings,
}: ConversationTimelineProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(messages.length);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCount.current = messages.length;
  }, [messages.length]);

  // Scroll to bottom on initial load or when message count changes
  const messageCount = messages.length;
  useEffect(() => {
    if (!isLoading && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [isLoading, messageCount]);

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

      <div ref={bottomRef} />
    </div>
  );
}
