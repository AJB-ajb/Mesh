"use client";

import { createContext, useContext } from "react";

import type { PostingDetail } from "@/lib/hooks/use-posting-detail";
import type { ScoreBreakdown, Profile } from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// PostingCoreContext — posting, identity, navigation, and conversation
// ---------------------------------------------------------------------------

export type PostingCoreContextValue = {
  posting: PostingDetail;
  postingId: string;
  isOwner: boolean;
  currentUserId: string | null;
  currentUserProfile: Profile | null;
  currentUserName: string | null;
  matchBreakdown: ScoreBreakdown | null;
  // Navigation
  backHref: string;
  backLabel: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  // Conversations
  onContactCreator: () => void;
  onStartConversation: (otherUserId: string) => Promise<void>;
  // Error state
  error: string | null;
  // Data refresh
  onMutate: () => void;
  // Derived state
  isAcceptedMember: boolean;
  projectEnabled: boolean;
  acceptedCount: number;
};

const PostingCoreContext = createContext<PostingCoreContextValue | null>(null);

export function PostingCoreProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: PostingCoreContextValue;
}) {
  return (
    <PostingCoreContext.Provider value={value}>
      {children}
    </PostingCoreContext.Provider>
  );
}

export function usePostingCoreContext(): PostingCoreContextValue {
  const ctx = useContext(PostingCoreContext);
  if (!ctx) {
    throw new Error(
      "usePostingCoreContext must be used within a PostingCoreProvider",
    );
  }
  return ctx;
}
