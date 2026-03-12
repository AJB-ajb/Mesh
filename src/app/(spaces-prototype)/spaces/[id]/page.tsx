"use client";

import { use } from "react";
import { SpaceHeader } from "@/components/spaces-prototype/space-header";
import { StateTextBanner } from "@/components/spaces-prototype/state-text-banner";
import { SpaceConversation } from "@/components/spaces-prototype/space-conversation";
import { ComposeArea } from "@/components/spaces-prototype/compose-area";
import { LargeSpaceView } from "@/components/spaces-prototype/large-space-view";
import {
  SPACES,
  MESSAGES,
  LARGE_SPACE_POSTINGS,
} from "@/components/spaces-prototype/mock-data";

export default function SpaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const space = SPACES.find((s) => s.id === id);

  if (!space) {
    return (
      <>
        <SpaceHeader title="Space not found" showBack />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          This space does not exist.
        </div>
      </>
    );
  }

  const isLarge = space.type === "large" || space.type === "global";
  const messages = MESSAGES[id] ?? [];
  const postings = LARGE_SPACE_POSTINGS[id] ?? [];

  const subtitle =
    space.type === "dm"
      ? space.online
        ? "Online"
        : "Offline"
      : `${space.memberCount} members`;

  return (
    <>
      <SpaceHeader title={space.name} showBack subtitle={subtitle} />
      {space.stateText && (
        <StateTextBanner text={space.stateText} defaultExpanded={isLarge} />
      )}
      {isLarge ? (
        <>
          <LargeSpaceView postings={postings} />
          <ComposeArea postingOnly />
        </>
      ) : (
        <>
          <SpaceConversation messages={messages} />
          <ComposeArea postingOnly={space.postingOnly} />
        </>
      )}
    </>
  );
}
