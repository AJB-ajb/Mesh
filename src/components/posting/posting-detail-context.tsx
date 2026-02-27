"use client";

import { createContext, useContext, type ReactNode } from "react";
import type {
  PostingDetail,
  Application,
  MatchedProfile,
  PostingFormState,
} from "@/lib/hooks/use-posting-detail";
import type { ScoreBreakdown, Profile } from "@/lib/supabase/types";
import type { ExtractedPosting } from "@/lib/types/posting";
import type { SaveStatus } from "@/lib/hooks/use-auto-save";

// ---------------------------------------------------------------------------
// Context value type — captures ALL props currently threaded from page.tsx
// through owner/visitor views down to leaf components.
// ---------------------------------------------------------------------------

export type PostingDetailContextValue = {
  // Core data
  posting: PostingDetail;
  postingId: string;
  isOwner: boolean;
  currentUserId: string | null;
  currentUserName: string | null;
  currentUserProfile: Profile | null;
  matchBreakdown: ScoreBreakdown | null;

  // Application data
  effectiveApplications: Application[];
  matchedProfiles: MatchedProfile[];
  hasApplied: boolean;
  myApplication: Application | null;
  waitlistPosition: number | null;

  // UI state
  isLoading: boolean;
  isEditing: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  isExtending: boolean;
  isReposting: boolean;
  isApplying: boolean;
  showApplyForm: boolean;
  coverMessage: string;
  error: string | null;
  isUpdatingApplication: string | null;
  isAcceptedMember: boolean;
  projectEnabled: boolean;

  // Edit state (for owner)
  form: PostingFormState;
  saveStatus: SaveStatus;
  isApplyingUpdate: boolean;

  // Tab state
  activeTab: string;

  // Navigation
  backHref: string;
  backLabel: string;

  // Actions (callbacks)
  onFormChange: (field: keyof PostingFormState, value: string) => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
  onExtendDeadline: (days: number) => void;
  onRepost: () => void;
  onApply: () => void;
  onWithdraw: () => void;
  onShowApplyForm: () => void;
  onHideApplyForm: () => void;
  onCoverMessageChange: (value: string) => void;
  onUpdateStatus: (
    applicationId: string,
    newStatus: "accepted" | "rejected",
  ) => Promise<void>;
  onStartConversation: (otherUserId: string) => Promise<void>;
  onContactCreator: () => void;
  onApplyUpdate: (
    updatedText: string,
    extracted: ExtractedPosting,
  ) => Promise<void>;
  onUndoUpdate: () => Promise<void>;
  onTabChange: (tab: string) => void;
};

// ---------------------------------------------------------------------------
// Context + hook
// ---------------------------------------------------------------------------

const PostingDetailContext = createContext<PostingDetailContextValue | null>(
  null,
);

export function usePostingDetailContext(): PostingDetailContextValue {
  const ctx = useContext(PostingDetailContext);
  if (!ctx) {
    throw new Error(
      "usePostingDetailContext must be used within a <PostingDetailProvider>",
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

type PostingDetailProviderProps = {
  value: PostingDetailContextValue;
  children: ReactNode;
};

export function PostingDetailProvider({
  value,
  children,
}: PostingDetailProviderProps) {
  return (
    <PostingDetailContext.Provider value={value}>
      {children}
    </PostingDetailContext.Provider>
  );
}
