"use client";

import { useRouter } from "next/navigation";

import { usePostingCoreContext } from "./posting-core-context";
import { usePostingApplicationContext } from "./posting-application-context";
import { PostingApplicationsCard } from "./posting-applications-card";
import { PostingMatchedProfilesCard } from "./posting-matched-profiles-card";
import { PostingSidebar } from "./posting-sidebar";
import { SequentialInviteCard } from "./sequential-invite-card";

export function PostingManageTab() {
  const router = useRouter();
  const { postingId, currentUserId, onStartConversation } =
    usePostingCoreContext();
  const {
    effectiveApplications,
    matchedProfiles,
    isLoading,
    isUpdatingApplication,
    onUpdateStatus,
  } = usePostingApplicationContext();

  return (
    <div className="grid gap-6 lg:grid-cols-3 mt-6">
      <div className="space-y-6 lg:col-span-2">
        <PostingApplicationsCard
          applications={effectiveApplications}
          isUpdatingApplication={isUpdatingApplication}
          onUpdateStatus={onUpdateStatus}
          onMessage={onStartConversation}
        />

        {currentUserId && (
          <SequentialInviteCard
            postingId={postingId}
            currentUserId={currentUserId}
          />
        )}

        <PostingMatchedProfilesCard
          matchedProfiles={matchedProfiles}
          isLoadingMatches={isLoading}
          onViewProfile={(userId) => router.push(`/profile/${userId}`)}
          onMessage={onStartConversation}
        />
      </div>

      <PostingSidebar />
    </div>
  );
}
