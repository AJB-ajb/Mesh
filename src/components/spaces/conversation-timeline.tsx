"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { labels } from "@/lib/labels";
import type { SpaceMessageWithSender } from "@/lib/hooks/use-space-messages";
import type { SpacePostingWithCreator, SpaceCard } from "@/lib/supabase/types";
import type { SpaceMemberWithProfile } from "@/lib/hooks/use-space";
import { MessageBubble } from "./message-bubble";
import { PostingCardInline } from "./posting-card-inline";
import { SystemMessage } from "./system-message";
import { SpaceCardInline } from "./cards/space-card-inline";

interface ConversationTimelineProps {
  messages: SpaceMessageWithSender[];
  userId: string | null;
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  postings?: Map<string, SpacePostingWithCreator>;
  acceptedPostingIds?: Set<string>;
  cards?: Map<string, SpaceCard>;
  spaceId?: string;
  isAdmin?: boolean;
  typingUsers?: string[];
  members?: SpaceMemberWithProfile[];
  onCardVote?: (cardId: string, optionIndex: number) => void;
  onCardResolve?: (cardId: string) => void;
  onCardCancel?: (cardId: string) => void;
  onCardOptOut?: (cardId: string, reason: "cant_make_any" | "pass") => void;
  onCardUndoOptOut?: (cardId: string) => void;
  onCardCommit?: (
    cardId: string,
    commitment: "attending" | "maybe" | "cant_make_it",
  ) => void;
}

export function ConversationTimeline({
  messages,
  userId,
  hasMore,
  isLoading,
  onLoadMore,
  postings,
  acceptedPostingIds,
  cards,
  spaceId,
  isAdmin,
  typingUsers,
  members,
  onCardVote,
  onCardResolve,
  onCardCancel,
  onCardOptOut,
  onCardUndoOptOut,
  onCardCommit,
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

        // Render card messages
        if (msg.type === "card" && msg.card_id) {
          const card = cards?.get(msg.card_id);
          if (card) {
            return (
              <SpaceCardInline
                key={msg.id}
                card={card}
                userId={userId}
                members={members}
                onVote={onCardVote ?? (() => {})}
                onResolve={onCardResolve ?? (() => {})}
                onCancel={onCardCancel ?? (() => {})}
                onOptOut={onCardOptOut}
                onUndoOptOut={onCardUndoOptOut}
                onCommit={onCardCommit}
              />
            );
          }
        }

        const isOwn = msg.sender_id === userId;
        const senderName = msg.profiles?.full_name ?? "Unknown";

        // Render posting messages as inline cards
        const posting = msg.posting_id
          ? postings?.get(msg.posting_id)
          : undefined;
        if (msg.type === "posting") {
          // Skip orphaned posting messages (posting was deleted but message remains)
          if (!posting) return null;
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
              revealHidden={
                isOwn || acceptedPostingIds?.has(posting.id) === true
              }
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
            revealHidden={true}
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
