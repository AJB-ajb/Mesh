"use client";

import { usePostingCoreContext } from "./posting-core-context";
import { usePostingApplicationContext } from "./posting-application-context";
import { PostingDetailHeader } from "./posting-detail-header";
import { PostingAboutCard } from "./posting-about-card";
import { PostingCompatibilityCard } from "./posting-compatibility-card";
import { PostingSidebar } from "./posting-sidebar";
import { PostingTeamCard } from "./posting-team-card";
import { SequentialInviteResponseCard } from "./sequential-invite-response-card";
import { GroupChatPanel } from "./group-chat-panel";

export function PostingVisitorView() {
  const {
    posting,
    postingId,
    currentUserId,
    currentUserProfile,
    matchBreakdown,
    isAcceptedMember,
    projectEnabled,
  } = usePostingCoreContext();

  const { effectiveApplications } = usePostingApplicationContext();

  const hideApplySection =
    (posting.visibility ??
      (posting.mode === "friend_ask" ? "private" : "public")) === "private";

  return (
    <div className="space-y-6">
      <PostingDetailHeader hideApplySection={hideApplySection} />

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

        <PostingSidebar />
      </div>
    </div>
  );
}
