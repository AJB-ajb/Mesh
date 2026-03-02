"use client";

import { usePostingCoreContext } from "./posting-core-context";
import { PostingApplicationsCard } from "./posting-applications-card";
import { PostingMatchedProfilesCard } from "./posting-matched-profiles-card";
import { PostingSidebar } from "./posting-sidebar";
import { SequentialInviteCard } from "./sequential-invite-card";

export function PostingManageTab() {
  const { postingId, currentUserId } = usePostingCoreContext();

  return (
    <div className="grid gap-6 lg:grid-cols-3 mt-6">
      <div className="space-y-6 lg:col-span-2">
        <PostingApplicationsCard />

        {currentUserId && (
          <SequentialInviteCard
            postingId={postingId}
            currentUserId={currentUserId}
          />
        )}

        <PostingMatchedProfilesCard />
      </div>

      <PostingSidebar />
    </div>
  );
}
