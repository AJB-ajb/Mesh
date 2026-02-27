"use client";

import { usePostingDetailContext } from "./posting-detail-context";
import { PostingDetailHeader } from "./posting-detail-header";
import { PostingAboutCard } from "./posting-about-card";
import { PostingCompatibilityCard } from "./posting-compatibility-card";
import { PostingSidebar } from "./posting-sidebar";
import { PostingTeamCard } from "./posting-team-card";
import { SequentialInviteResponseCard } from "./sequential-invite-response-card";
import { GroupChatPanel } from "./group-chat-panel";
import { SkillGapPrompt } from "./skill-gap-prompt";

export function PostingVisitorView() {
  const {
    posting,
    postingId,
    isOwner,
    currentUserId,
    currentUserProfile,
    effectiveApplications,
    isAcceptedMember,
    projectEnabled,
  } = usePostingDetailContext();

  return (
    <div className="space-y-6">
      <PostingDetailHeader />

      {(posting.visibility === "private" || posting.mode === "friend_ask") &&
        currentUserId && (
          <SequentialInviteResponseCard
            postingId={postingId}
            currentUserId={currentUserId}
          />
        )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <PostingAboutCard />

          {currentUserId && !isOwner && (
            <SkillGapPrompt
              postingId={postingId}
              postingSkills={posting.skills ?? []}
              currentUserId={currentUserId}
              onProfileUpdated={() => {
                // Profile updated — could trigger a refetch if needed
              }}
            />
          )}

          {currentUserProfile && <PostingCompatibilityCard />}

          {/* Accepted members can see the Project section */}
          {isAcceptedMember && projectEnabled && currentUserId && (
            <>
              <PostingTeamCard />
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

        <PostingSidebar />
      </div>
    </div>
  );
}
