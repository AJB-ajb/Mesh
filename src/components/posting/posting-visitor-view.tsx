"use client";

import type {
  PostingDetail,
  Application,
} from "@/lib/hooks/use-posting-detail";
import type { PostingFormState } from "@/lib/types/posting";
import type { ScoreBreakdown } from "@/lib/supabase/types";
import type { Profile } from "@/lib/supabase/types";
import { PostingDetailHeader } from "./posting-detail-header";
import { PostingAboutCard } from "./posting-about-card";
import { PostingCompatibilityCard } from "./posting-compatibility-card";
import { PostingSidebar } from "./posting-sidebar";
import { PostingTeamCard } from "./posting-team-card";
import { SequentialInviteResponseCard } from "./sequential-invite-response-card";
import { GroupChatPanel } from "./group-chat-panel";

type PostingVisitorViewProps = {
  posting: PostingDetail;
  postingId: string;
  isOwner: boolean;
  currentUserId: string | null;
  currentUserProfile: Profile | null;
  matchBreakdown: ScoreBreakdown | null;
  form: PostingFormState;
  onFormChange: (field: keyof PostingFormState, value: string) => void;
  // Apply props
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
  effectiveApplications: Application[];
  isAcceptedMember: boolean;
  projectEnabled: boolean;
  onContactCreator: () => void;
  backHref: string;
  backLabel: string;
};

export function PostingVisitorView({
  posting,
  postingId,
  isOwner,
  currentUserId,
  currentUserProfile,
  matchBreakdown,
  form,
  onFormChange,
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
  isAcceptedMember,
  projectEnabled,
  onContactCreator,
  backHref,
  backLabel,
}: PostingVisitorViewProps) {
  return (
    <div className="space-y-6">
      <PostingDetailHeader
        posting={posting}
        isOwner={isOwner}
        matchBreakdown={matchBreakdown}
        isEditing={false}
        isSaving={false}
        isDeleting={false}
        isExtending={false}
        isReposting={false}
        editTitle=""
        onEditTitleChange={() => {}}
        onSave={() => {}}
        onCancelEdit={() => {}}
        onStartEdit={() => {}}
        onDelete={() => {}}
        onExtendDeadline={() => {}}
        onRepost={() => {}}
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
        hideApplySection={
          (posting.visibility ??
            (posting.mode === "friend_ask" ? "private" : "public")) ===
          "private"
        }
        backHref={backHref}
        backLabel={backLabel}
      />

      {(posting.visibility === "private" || posting.mode === "friend_ask") &&
        currentUserId && (
          <SequentialInviteResponseCard
            postingId={postingId}
            currentUserId={currentUserId}
          />
        )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <PostingAboutCard
            posting={posting}
            isEditing={false}
            form={form}
            onFormChange={onFormChange}
          />

          {currentUserProfile && (
            <PostingCompatibilityCard
              matchBreakdown={matchBreakdown}
              isComputingMatch={false}
            />
          )}

          {/* Accepted members can see the Project section */}
          {isAcceptedMember && projectEnabled && currentUserId && (
            <>
              <PostingTeamCard
                applications={effectiveApplications}
                creatorName={posting.profiles?.full_name ?? null}
                teamSizeMin={posting.team_size_min}
                teamSizeMax={posting.team_size_max}
              />
              <GroupChatPanel
                postingId={postingId}
                postingTitle={posting.title}
                currentUserId={currentUserId}
                currentUserName={currentUserProfile?.full_name ?? null}
                teamMembers={[
                  {
                    user_id: posting.creator_id,
                    full_name: posting.profiles?.full_name ?? null,
                    role: "creator",
                  },
                  ...effectiveApplications
                    .filter((a) => a.status === "accepted")
                    .map((a) => ({
                      user_id: a.applicant_id,
                      full_name: a.profiles?.full_name ?? null,
                      role: "member",
                    })),
                ]}
              />
            </>
          )}
        </div>

        <PostingSidebar
          posting={posting}
          isOwner={isOwner}
          onContactCreator={onContactCreator}
        />
      </div>
    </div>
  );
}
