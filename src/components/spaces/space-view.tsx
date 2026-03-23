"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { SpaceMember } from "@/lib/supabase/types";
import type { SpaceDetail } from "@/lib/hooks/use-space";
import type { CardSuggestion } from "@/lib/ai/card-suggest";
import { useSpaceMessages } from "@/lib/hooks/use-space-messages";
import { useSpacePostings } from "@/lib/hooks/use-space-postings";
import { useAcceptedPostingIds } from "@/lib/hooks/use-accepted-posting-ids";
import { SpaceHeader } from "./space-header";
import { StateTextBanner } from "./state-text-banner";
import { ConversationTimeline } from "./conversation-timeline";
import { ComposeArea } from "./compose-area";
import { PostingBrowser } from "./posting-browser";

interface SpaceViewProps {
  space: SpaceDetail;
  currentMember: SpaceMember | null;
}

export function SpaceView({ space, currentMember }: SpaceViewProps) {
  const isPostingOnly = space.settings?.posting_only ?? false;

  const {
    messages,
    hasMore,
    isLoading: messagesLoading,
    loadMore,
    markAsRead,
  } = useSpaceMessages(space.id);

  const { postings: postingsList, isLoading: postingsLoading } =
    useSpacePostings(space.id);

  const {
    cards,
    vote: voteOnCard,
    resolve: resolveCard,
    cancel: cancelCard,
  } = useSpaceCards(space.id, currentMember?.user_id);

  // Build a Map<postingId, SpacePosting> for quick lookup in timeline
  const postingsMap = useMemo(() => {
    const map = new Map<string, (typeof postingsList)[number]>();
    for (const p of postingsList) {
      map.set(p.id, p);
    }
    return map;
  }, [postingsList]);

  // Build a Map<cardId, SpaceCard> for quick lookup in timeline
  const cardsMap = useMemo(() => {
    const map = new Map<string, (typeof cards)[number]>();
    for (const c of cards) {
      map.set(c.id, c);
    }
    return map;
  }, [cards]);

  const userId = currentMember?.user_id ?? null;
  const isAdmin = currentMember?.role === "admin";
  const canEdit = isAdmin;

  // Follow-up suggestion state: set by vote/resolve responses, consumed by ComposeArea
  const [followUpSuggestion, setFollowUpSuggestion] =
    useState<CardSuggestion | null>(null);

  const handleCardVote = useCallback(
    async (cardId: string, optionIndex: number) => {
      const suggestion = await voteOnCard(cardId, optionIndex);
      if (suggestion) setFollowUpSuggestion(suggestion);
    },
    [voteOnCard],
  );

  const handleCardResolve = useCallback(
    async (cardId: string) => {
      const suggestion = await resolveCard(cardId);
      if (suggestion) setFollowUpSuggestion(suggestion);
    },
    [resolveCard],
  );

  const { typingUsers, sendTyping, stopTyping } = useSpacePresence(
    space.id,
    userId,
  );

  // Latest message for trigger C (detect intent on incoming messages)
  const latestMsg = messages.length > 0 ? messages[messages.length - 1] : null;
  const latestMessage = latestMsg
    ? {
        sender_id: latestMsg.sender_id,
        content: latestMsg.content,
        type: latestMsg.type,
      }
    : null;

  const { acceptedPostingIds } = useAcceptedPostingIds(space.id);

  // Mark as read when entering the space
  useEffect(() => {
    if (currentMember && currentMember.unread_count > 0) {
      markAsRead().catch((err) => {
        console.warn("[space-view] Failed to mark as read:", err);
      });
    }
  }, [currentMember, markAsRead]);

  return (
    <SpaceErrorBoundary>
      <div className="-m-4 sm:-m-6 flex flex-col h-[calc(100dvh-4rem-3.5rem)] md:h-[calc(100dvh-4rem)] overflow-hidden pb-[env(safe-area-inset-bottom)] md:pb-0">
        <SpaceHeader
          space={space}
          memberCount={space.members.length}
          currentMember={currentMember}
        />

      <StateTextBanner
        stateText={space.state_text}
        canEdit={canEdit}
        revealHidden={true}
      />

      {isPostingOnly ? (
        <>
          <PostingBrowser
            spaceId={space.id}
            postings={postingsList}
            isLoading={postingsLoading}
            matchingEnabled={space.settings?.matching_enabled ?? false}
            userId={userId}
            acceptedPostingIds={acceptedPostingIds}
            className="flex-1"
          />
          {currentMember && userId && (
            <ComposeArea
              spaceId={space.id}
              postings={postingsList}
              isLoading={postingsLoading}
              matchingEnabled={space.settings?.matching_enabled ?? false}
              userId={userId}
              isAdmin={isAdmin}
              className="flex-1"
            />
          )}
        </>
      ) : (
        <>
          <ConversationTimeline
            messages={messages}
            userId={userId}
            hasMore={hasMore}
            isLoading={messagesLoading}
            onLoadMore={loadMore}
            postings={postingsMap}
            acceptedPostingIds={acceptedPostingIds}
          />

          {currentMember && userId && (
            <ComposeArea
              spaceId={space.id}
              isAdmin={isAdmin}
              typingUsers={typingUsers}
              members={space.members}
              onCardVote={handleCardVote}
              onCardResolve={handleCardResolve}
              onCardCancel={cancelCard}
            />

            {currentMember && userId && (
              <ComposeArea
                spaceId={space.id}
                senderId={userId}
                senderName={
                  space.members.find((m) => m.user_id === userId)?.profiles
                    ?.full_name ?? null
                }
                postingOnly={space.settings?.posting_only ?? false}
                onTyping={sendTyping}
                onStopTyping={stopTyping}
                followUpSuggestion={followUpSuggestion}
                onClearFollowUp={() => setFollowUpSuggestion(null)}
                latestMessage={latestMessage}
              />
            )}
          </>
        )}
      </div>
    </SpaceErrorBoundary>
  );
}
