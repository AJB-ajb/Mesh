"use client";

import { useRouter } from "next/navigation";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { labels } from "@/lib/labels";
import type {
  PostingDetail,
  Application,
  MatchedProfile,
} from "@/lib/hooks/use-posting-detail";
import type { PostingFormState } from "@/lib/types/posting";
import type { ScoreBreakdown } from "@/lib/supabase/types";
import type { ExtractedPosting } from "@/lib/types/posting";
import { PostingDetailHeader } from "./posting-detail-header";
import { PostingEditTab } from "./posting-edit-tab";
import { PostingManageTab } from "./posting-manage-tab";
import { PostingActivityTab } from "./posting-activity-tab";

type PostingOwnerViewProps = {
  posting: PostingDetail;
  postingId: string;
  isOwner: boolean;
  currentUserId: string | null;
  currentUserName: string | null;
  matchBreakdown: ScoreBreakdown | null;
  // Edit state
  isEditing: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  isExtending: boolean;
  isReposting: boolean;
  form: PostingFormState;
  onFormChange: (field: keyof PostingFormState, value: string) => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
  onExtendDeadline: (days: number) => void;
  onRepost: () => void;
  // Apply state (for header)
  hasApplied: boolean;
  myApplication: Application | null;
  waitlistPosition: number | null;
  showApplyForm: boolean;
  coverMessage: string;
  isApplying: boolean;
  onShowApplyForm: () => void;
  onHideApplyForm: () => void;
  onCoverMessageChange: (value: string) => void;
  onApply: () => void;
  onWithdraw: () => void;
  error: string | null;
  // Tab content
  effectiveApplications: Application[];
  matchedProfiles: MatchedProfile[];
  isLoading: boolean;
  isUpdatingApplication: string | null;
  onUpdateStatus: (
    applicationId: string,
    newStatus: "accepted" | "rejected",
  ) => Promise<void>;
  onStartConversation: (otherUserId: string) => Promise<void>;
  onContactCreator: () => void;
  // AI update
  isApplyingUpdate: boolean;
  onApplyUpdate: (
    updatedText: string,
    extracted: ExtractedPosting,
  ) => Promise<void>;
  onUndoUpdate: () => Promise<void>;
  // Tab state
  activeTab: string;
  onTabChange: (tab: string) => void;
  projectEnabled: boolean;
  backHref: string;
  backLabel: string;
};

export function PostingOwnerView({
  posting,
  postingId,
  isOwner,
  currentUserId,
  currentUserName,
  matchBreakdown,
  isEditing,
  isSaving,
  isDeleting,
  isExtending,
  isReposting,
  form,
  onFormChange,
  onSave,
  onCancelEdit,
  onStartEdit,
  onDelete,
  onExtendDeadline,
  onRepost,
  hasApplied,
  myApplication,
  waitlistPosition,
  showApplyForm,
  coverMessage,
  isApplying,
  onShowApplyForm,
  onHideApplyForm,
  onCoverMessageChange,
  onApply,
  onWithdraw,
  error,
  effectiveApplications,
  matchedProfiles,
  isLoading,
  isUpdatingApplication,
  onUpdateStatus,
  onStartConversation,
  onContactCreator,
  isApplyingUpdate,
  onApplyUpdate,
  onUndoUpdate,
  activeTab,
  onTabChange,
  projectEnabled,
  backHref,
  backLabel,
}: PostingOwnerViewProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <PostingDetailHeader
        posting={posting}
        isOwner={isOwner}
        matchBreakdown={matchBreakdown}
        isEditing={isEditing}
        isSaving={isSaving}
        isDeleting={isDeleting}
        isExtending={isExtending}
        isReposting={isReposting}
        editTitle={form.title}
        onEditTitleChange={(value) => onFormChange("title", value)}
        onSave={onSave}
        onCancelEdit={onCancelEdit}
        onStartEdit={onStartEdit}
        onDelete={onDelete}
        onExtendDeadline={onExtendDeadline}
        onRepost={onRepost}
        hasApplied={hasApplied}
        myApplication={myApplication}
        waitlistPosition={waitlistPosition}
        showApplyForm={showApplyForm}
        coverMessage={coverMessage}
        isApplying={isApplying}
        onShowApplyForm={onShowApplyForm}
        onHideApplyForm={onHideApplyForm}
        onCoverMessageChange={onCoverMessageChange}
        onApply={onApply}
        onWithdraw={onWithdraw}
        error={error}
        hideApplySection={false}
        backHref={backHref}
        backLabel={backLabel}
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          onTabChange(v);
          router.replace(`?tab=${v}`, { scroll: false });
        }}
      >
        <TabsList variant="line">
          <TabsTrigger value="edit">
            {labels.postingDetail.tabs.edit}
          </TabsTrigger>
          <TabsTrigger value="manage">
            {labels.postingDetail.tabs.manage}
          </TabsTrigger>
          <TabsTrigger
            value="project"
            disabled={!projectEnabled}
            title={
              !projectEnabled ? labels.postingDetail.projectDisabled : undefined
            }
          >
            {labels.postingDetail.tabs.project}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit">
          <PostingEditTab
            posting={posting}
            postingId={postingId}
            isOwner={isOwner}
            isEditing={isEditing}
            form={form}
            onFormChange={onFormChange}
            onContactCreator={onContactCreator}
            isApplyingUpdate={isApplyingUpdate}
            onApplyUpdate={onApplyUpdate}
            onUndoUpdate={onUndoUpdate}
          />
        </TabsContent>

        <TabsContent value="manage">
          <PostingManageTab
            posting={posting}
            postingId={postingId}
            isOwner={isOwner}
            currentUserId={currentUserId}
            applications={effectiveApplications}
            matchedProfiles={matchedProfiles}
            isLoading={isLoading}
            isUpdatingApplication={isUpdatingApplication}
            onUpdateStatus={onUpdateStatus}
            onStartConversation={onStartConversation}
            onContactCreator={onContactCreator}
          />
        </TabsContent>

        <TabsContent value="project">
          <PostingActivityTab
            posting={posting}
            postingId={postingId}
            isOwner={isOwner}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            applications={effectiveApplications}
            form={form}
            onFormChange={onFormChange}
            onContactCreator={onContactCreator}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
