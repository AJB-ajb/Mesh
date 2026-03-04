"use client";

import { createContext, useContext } from "react";

import type { PostingFormState } from "@/lib/types/posting";
import type { ExtractedPosting } from "@/lib/types/posting";
import type { SaveStatus } from "@/lib/hooks/use-auto-save";

// ---------------------------------------------------------------------------
// PostingEditContext — form state, editing, saving, mutations
// ---------------------------------------------------------------------------

export type PostingEditContextValue = {
  form: PostingFormState;
  onFormChange: (field: keyof PostingFormState, value: string) => void;
  // Edit state flags (always-editable: isEditing=true for owners)
  isEditing: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  isExtending: boolean;
  isReposting: boolean;
  // Auto-save status
  saveStatus: SaveStatus;
  // Edit action callbacks
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onDelete: () => void;
  onExtendDeadline: (days: number) => void;
  onRepost: () => void;
  // AI update
  isApplyingUpdate: boolean;
  onApplyUpdate: (
    updatedText: string,
    extracted: ExtractedPosting,
  ) => Promise<void>;
  onUndoUpdate: () => Promise<void>;
};

const PostingEditContext = createContext<PostingEditContextValue | null>(null);

export function PostingEditProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: PostingEditContextValue;
}) {
  return (
    <PostingEditContext.Provider value={value}>
      {children}
    </PostingEditContext.Provider>
  );
}

export function usePostingEditContext(): PostingEditContextValue {
  const ctx = useContext(PostingEditContext);
  if (!ctx) {
    throw new Error(
      "usePostingEditContext must be used within a PostingEditProvider",
    );
  }
  return ctx;
}
