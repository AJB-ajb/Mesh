"use client";

import { useEffect, useMemo } from "react";

import type { SpaceMember } from "@/lib/supabase/types";
import type { SpaceDetail } from "@/lib/hooks/use-space";
import { useSpaceMessages } from "@/lib/hooks/use-space-messages";
import { useSpacePostings } from "@/lib/hooks/use-space-postings";
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

  // Build a Map<postingId, SpacePosting> for quick lookup in timeline
  const postingsMap = useMemo(() => {
    const map = new Map<string, (typeof postingsList)[number]>();
    for (const p of postingsList) {
      map.set(p.id, p);
    }
    return map;
  }, [postingsList]);

  const userId = currentMember?.user_id ?? null;
  const canEdit = currentMember?.role === "admin";

  // Mark as read when entering the space
  useEffect(() => {
    if (currentMember && currentMember.unread_count > 0) {
      markAsRead().catch((err) => {
        console.warn("[space-view] Failed to mark as read:", err);
      });
    }
  }, [currentMember, markAsRead]);

  return (
    <div className="-m-4 sm:-m-6 flex flex-col h-[calc(100dvh-4rem)]">
      <SpaceHeader
        space={space}
        memberCount={space.members.length}
        currentMember={currentMember}
      />

      <StateTextBanner stateText={space.state_text} canEdit={canEdit} />

      {isPostingOnly ? (
        <>
          <PostingBrowser
            spaceId={space.id}
            postings={postingsList}
            isLoading={postingsLoading}
            matchingEnabled={space.settings?.matching_enabled ?? false}
            userId={userId}
            className="flex-1"
          />
          {currentMember && userId && (
            <ComposeArea
              spaceId={space.id}
              senderId={userId}
              senderName={
                space.members.find((m) => m.user_id === userId)?.profiles
                  ?.full_name ?? null
              }
              postingOnly={true}
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
          />

          {currentMember && userId && (
            <ComposeArea
              spaceId={space.id}
              senderId={userId}
              senderName={
                space.members.find((m) => m.user_id === userId)?.profiles
                  ?.full_name ?? null
              }
              postingOnly={space.settings.posting_only ?? false}
            />
          )}
        </>
      )}
    </div>
  );
}
