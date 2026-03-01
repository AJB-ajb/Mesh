"use client";

import { usePostingDetailContext } from "./posting-detail-context";
import { PostingApplicationsCard } from "@/components/posting/posting-applications-card";
import { PostingMatchedProfilesCard } from "@/components/posting/posting-matched-profiles-card";
import { PostingSidebar } from "@/components/posting/posting-sidebar";
import { SequentialInviteCard } from "@/components/posting/sequential-invite-card";

export function PostingManageTab() {
  const { postingId, currentUserId } = usePostingDetailContext();

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
