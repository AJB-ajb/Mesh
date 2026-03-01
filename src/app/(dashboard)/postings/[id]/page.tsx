"use client";

import { useState, useMemo, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { labels } from "@/lib/labels";
import { usePostingDetail } from "@/lib/hooks/use-posting-detail";
import { usePostingActions } from "@/lib/hooks/use-posting-actions";
import { useApplicationActions } from "@/lib/hooks/use-application-actions";
import { useConversationStart } from "@/lib/hooks/use-conversation-start";
import { PostingVisitorView } from "@/components/posting/posting-visitor-view";
import { PostingOwnerView } from "@/components/posting/posting-owner-view";
import {
  PostingDetailProvider,
  type PostingDetailContextValue,
} from "@/components/posting/posting-detail-context";

// ---------------------------------------------------------------------------
// Inner component that uses useSearchParams (needs Suspense boundary)
// ---------------------------------------------------------------------------

function PostingDetailInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const postingId = params.id as string;

  const {
    posting,
    isOwner,
    currentUserId,
    currentUserProfile,
    matchBreakdown,
    applications,
    matchedProfiles,
    myApplication: fetchedMyApplication,
    hasApplied: fetchedHasApplied,
    waitlistPosition: fetchedWaitlistPosition,
    acceptedCount: fetchedAcceptedCount,
    isLoading,
    mutate,
  } = usePostingDetail(postingId);

  // Determine active tab from URL or context
  const tabParam = searchParams.get("tab");
  const defaultTab =
    tabParam === "edit" || tabParam === "manage" || tabParam === "project"
      ? tabParam
      : "manage";
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Context-aware back navigation
  const fromParam = searchParams.get("from");
  const backHref = fromParam === "discover" ? "/discover" : "/posts";
  const backLabel =
    fromParam === "discover"
      ? labels.common.backToDiscover
      : labels.common.backToPostings;

  // Owner-side editing/mutation logic (always-editable)
  const {
    isDeleting,
    isExtending,
    isReposting,
    error,
    setError,
    form,
    saveStatus,
    isApplyingUpdate,
    applyFreeFormUpdate,
    undoLastUpdate,
    handleFormChange,
    handleDelete,
    handleExtendDeadline,
    handleRepost,
  } = usePostingActions(postingId, posting, mutate);

  // Application management logic
  const {
    hasApplied,
    myApplication,
    effectiveApplications,
    waitlistPosition,
    isApplying,
    showApplyForm,
    setShowApplyForm,
    coverMessage,
    setCoverMessage,
    isUpdatingApplication,
    handleApply,
    handleWithdrawApplication,
    handleUpdateApplicationStatus,
  } = useApplicationActions(
    postingId,
    posting,
    fetchedHasApplied,
    fetchedMyApplication,
    fetchedWaitlistPosition,
    applications,
    mutate,
    setError,
  );

  // Conversation start logic
  const { handleStartConversation, handleContactCreator } =
    useConversationStart(
      postingId,
      currentUserId,
      posting?.creator_id ?? null,
      setError,
    );

  // Accepted count for project tab gating
  const acceptedCount =
    fetchedAcceptedCount !== null
      ? fetchedAcceptedCount
      : effectiveApplications.filter((a) => a.status === "accepted").length;

  // Check if non-owner is an accepted member (can see Project tab)
  const isAcceptedMember = !isOwner && myApplication?.status === "accepted";

  // Project tab disabled when min team not reached
  const projectEnabled =
    posting != null && acceptedCount >= posting.team_size_min;

  // Stable callback refs for the provider value
  const onShowApplyForm = useMemo(
    () => () => setShowApplyForm(true),
    [setShowApplyForm],
  );
  const onHideApplyForm = useMemo(
    () => () => {
      setShowApplyForm(false);
      setError(null);
    },
    [setShowApplyForm, setError],
  );
  // --- Render ---

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!posting) {
    return (
      <div className="space-y-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          {backLabel}
        </Link>
        <Card>
          <CardContent className="flex min-h-[200px] flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Posting not found.</p>
            <Button asChild className="mt-4">
              <Link href="/posts">Browse Postings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Build context value with all props for child components
  const contextValue: PostingDetailContextValue = {
    // Core data
    posting,
    postingId,
    isOwner,
    currentUserId,
    currentUserName: currentUserProfile?.full_name ?? null,
    currentUserProfile,
    matchBreakdown,
    // Application data
    effectiveApplications,
    matchedProfiles,
    hasApplied,
    myApplication,
    waitlistPosition,
    // UI state
    isLoading,
    isEditing: true,
    isSaving: false,
    isDeleting,
    isExtending,
    isReposting,
    isApplying,
    showApplyForm,
    coverMessage,
    error,
    isUpdatingApplication,
    isAcceptedMember,
    projectEnabled,
    // Edit state
    form,
    saveStatus,
    isApplyingUpdate,
    // Tab state
    activeTab,
    // Navigation
    backHref,
    backLabel,
    // Actions
    onFormChange: handleFormChange,
    onSave: () => {},
    onCancelEdit: () => {},
    onStartEdit: () => {},
    onDelete: handleDelete,
    onExtendDeadline: handleExtendDeadline,
    onRepost: handleRepost,
    onApply: handleApply,
    onWithdraw: handleWithdrawApplication,
    onShowApplyForm,
    onHideApplyForm,
    onCoverMessageChange: setCoverMessage,
    onUpdateStatus: handleUpdateApplicationStatus,
    onStartConversation: handleStartConversation,
    onContactCreator: handleContactCreator,
    onApplyUpdate: applyFreeFormUpdate,
    onUndoUpdate: undoLastUpdate,
    onTabChange: setActiveTab,
  };

  return (
    <PostingDetailProvider value={contextValue}>
      {isOwner ? <PostingOwnerView /> : <PostingVisitorView />}
    </PostingDetailProvider>
  );
}

// ---------------------------------------------------------------------------
// Page component with Suspense boundary for useSearchParams
// ---------------------------------------------------------------------------

export default function PostingDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <PostingDetailInner />
    </Suspense>
  );
}
