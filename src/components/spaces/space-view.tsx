"use client";

import { useEffect } from "react";

import type { SpaceMember } from "@/lib/supabase/types";
import type { SpaceDetail } from "@/lib/hooks/use-space";
import { useSpaceMessages } from "@/lib/hooks/use-space-messages";
import { SpaceHeader } from "./space-header";
import { ConversationTimeline } from "./conversation-timeline";
import { ComposeArea } from "./compose-area";

interface SpaceViewProps {
  space: SpaceDetail;
  currentMember: SpaceMember | null;
}

export function SpaceView({ space, currentMember }: SpaceViewProps) {
  const {
    messages,
    hasMore,
    isLoading: messagesLoading,
    loadMore,
    markAsRead,
  } = useSpaceMessages(space.id);

  const userId = currentMember?.user_id ?? null;

  // Mark as read when entering the space
  useEffect(() => {
    if (currentMember && currentMember.unread_count > 0) {
      markAsRead();
    }
  }, [currentMember, markAsRead]);

  return (
    <div className="-m-4 sm:-m-6 flex flex-col h-[calc(100dvh-4rem)]">
      <SpaceHeader space={space} memberCount={space.members.length} />

      <ConversationTimeline
        messages={messages}
        userId={userId}
        hasMore={hasMore}
        isLoading={messagesLoading}
        onLoadMore={loadMore}
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
    </div>
  );
}
