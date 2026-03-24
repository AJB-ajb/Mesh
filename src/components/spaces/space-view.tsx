"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { SpaceMember } from "@/lib/supabase/types";
import type { SpaceDetail } from "@/lib/hooks/use-space";
import type { CardSuggestion } from "@/lib/ai/card-suggest";
import { useAcceptedPostingIds } from "@/lib/hooks/use-accepted-posting-ids";
import { useSpaceMessages } from "@/lib/hooks/use-space-messages";
import { useSpacePostings } from "@/lib/hooks/use-space-postings";
import { useSpacePresence } from "@/lib/hooks/use-space-presence";
import { useSpaceCards } from "@/lib/hooks/use-space-cards";
import { SpaceErrorBoundary } from "@/components/shared/space-error-boundary";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SpaceHeader } from "./space-header";
import { StateTextBanner } from "./state-text-banner";
import { ConversationTimeline } from "./conversation-timeline";
import { ComposeArea } from "./compose-area";
import { PostingBrowser } from "./posting-browser";
import { SharedCalendarView } from "./shared-calendar-view";

interface SpaceViewProps {
  space: SpaceDetail;
  currentMember: SpaceMember | null;
}

export function SpaceView({ space, currentMember }: SpaceViewProps) {
  const isPostingOnly = space.settings?.posting_only ?? false;
  const showCalendarTab =
    !isPostingOnly && !space.is_global && space.members.length <= 10;

  const {
    messages,
    hasMore,
    isLoading: messagesLoading,
    loadMore,
    markAsRead,
  } = useSpaceMessages(space.id);

  const { postings: postingsList, isLoading: postingsLoading } =
    useSpacePostings(space.id);

  const { acceptedPostingIds } = useAcceptedPostingIds(space.id);

  const {
    cards,
    vote: voteOnCard,
    resolve: resolveCard,
    cancel: cancelCard,
    optOut,
    undoOptOut,
    commit,
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

  // Calendar tab state (controlled to allow programmatic switching)
  const [activeTab, setActiveTab] = useState("chat");

  // Calendar drag-to-create state
  const [calendarPrefill, setCalendarPrefill] = useState<{
    start: string;
    end: string;
  } | null>(null);

  const handleCalendarCreateCard = useCallback(
    (slot: { start: string; end: string }) => {
      setCalendarPrefill(slot);
      // Switch to chat tab so the ComposeArea dialog is visible
      setActiveTab("chat");
    },
    [],
  );

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

  // Mark as read when entering the space
  useEffect(() => {
    if (currentMember && currentMember.unread_count > 0) {
      markAsRead().catch((err) => {
        console.warn("[space-view] Failed to mark as read:", err);
      });
    }
  }, [currentMember, markAsRead]);

  // Shared ComposeArea props
  const composeAreaProps = {
    spaceId: space.id,
    senderId: userId!,
    senderName:
      space.members.find((m) => m.user_id === userId)?.profiles?.full_name ??
      null,
    onTyping: sendTyping,
    onStopTyping: stopTyping,
    calendarPrefill,
    onClearCalendarPrefill: useCallback(() => setCalendarPrefill(null), []),
  };

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
              isAdmin={isAdmin}
              acceptedPostingIds={acceptedPostingIds}
              className="flex-1"
            />
            {currentMember && userId && (
              <ComposeArea {...composeAreaProps} postingOnly={true} />
            )}
          </>
        ) : showCalendarTab ? (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 overflow-hidden flex flex-col min-h-0"
          >
            <TabsList variant="line" className="px-4 shrink-0 w-full">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
            </TabsList>
            <TabsContent
              value="chat"
              className="flex-1 overflow-hidden flex flex-col min-h-0"
            >
              <ConversationTimeline
                messages={messages}
                userId={userId}
                hasMore={hasMore}
                isLoading={messagesLoading}
                onLoadMore={loadMore}
                postings={postingsMap}
                acceptedPostingIds={acceptedPostingIds}
                cards={cardsMap}
                spaceId={space.id}
                isAdmin={isAdmin}
                typingUsers={typingUsers}
                members={space.members}
                onCardVote={handleCardVote}
                onCardResolve={handleCardResolve}
                onCardCancel={cancelCard}
                onCardOptOut={optOut}
                onCardUndoOptOut={undoOptOut}
                onCardCommit={commit}
              />
              {currentMember && userId && (
                <ComposeArea
                  {...composeAreaProps}
                  postingOnly={false}
                  followUpSuggestion={followUpSuggestion}
                  onClearFollowUp={() => setFollowUpSuggestion(null)}
                  latestMessage={latestMessage}
                />
              )}
            </TabsContent>
            <TabsContent
              value="calendar"
              className="flex-1 overflow-hidden min-h-0"
            >
              <SharedCalendarView
                spaceId={space.id}
                memberCount={space.members.length}
                onCreateCard={handleCalendarCreateCard}
              />
            </TabsContent>
          </Tabs>
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
              cards={cardsMap}
              spaceId={space.id}
              isAdmin={isAdmin}
              typingUsers={typingUsers}
              members={space.members}
              onCardVote={handleCardVote}
              onCardResolve={handleCardResolve}
              onCardCancel={cancelCard}
              onCardOptOut={optOut}
              onCardUndoOptOut={undoOptOut}
              onCardCommit={commit}
            />

            {currentMember && userId && (
              <ComposeArea
                {...composeAreaProps}
                postingOnly={space.settings?.posting_only ?? false}
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
