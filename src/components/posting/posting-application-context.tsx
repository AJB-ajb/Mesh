"use client";

import { createContext, useContext } from "react";

import type {
  Application,
  MatchedProfile,
} from "@/lib/hooks/use-posting-detail";

// ---------------------------------------------------------------------------
// PostingApplicationContext — applications, matching, apply/withdraw
// ---------------------------------------------------------------------------

export type PostingApplicationContextValue = {
  effectiveApplications: Application[];
  matchedProfiles: MatchedProfile[];
  myApplication: Application | null;
  hasApplied: boolean;
  waitlistPosition: number | null;
  // Apply form state
  showApplyForm: boolean;
  coverMessage: string;
  isApplying: boolean;
  onShowApplyForm: () => void;
  onHideApplyForm: () => void;
  onCoverMessageChange: (value: string) => void;
  // Apply/withdraw callbacks
  onApply: () => void;
  onWithdraw: () => void;
  // Application management (owner)
  isUpdatingApplication: string | null;
  onUpdateStatus: (
    applicationId: string,
    newStatus: "accepted" | "rejected",
  ) => Promise<void>;
  isLoading: boolean;
};

const PostingApplicationContext =
  createContext<PostingApplicationContextValue | null>(null);

export function PostingApplicationProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: PostingApplicationContextValue;
}) {
  return (
    <PostingApplicationContext.Provider value={value}>
      {children}
    </PostingApplicationContext.Provider>
  );
}

export function usePostingApplicationContext(): PostingApplicationContextValue {
  const ctx = useContext(PostingApplicationContext);
  if (!ctx) {
    throw new Error(
      "usePostingApplicationContext must be used within a PostingApplicationProvider",
    );
  }
  return ctx;
}
