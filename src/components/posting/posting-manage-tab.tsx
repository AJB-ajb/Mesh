"use client";

import { useRouter } from "next/navigation";
import type {
  PostingDetail,
  Application,
  MatchedProfile,
} from "@/lib/hooks/use-posting-detail";
import { PostingApplicationsCard } from "@/components/posting/posting-applications-card";
import { PostingMatchedProfilesCard } from "@/components/posting/posting-matched-profiles-card";
import { PostingSidebar } from "@/components/posting/posting-sidebar";
import { SequentialInviteCard } from "@/components/posting/sequential-invite-card";

interface PostingManageTabProps {
  posting: PostingDetail;
  postingId: string;
  isOwner: boolean;
  currentUserId: string | null;
  applications: Application[];
  matchedProfiles: MatchedProfile[];
  isLoading: boolean;
  isUpdatingApplication: string | null;
  onUpdateStatus: (
    applicationId: string,
    newStatus: "accepted" | "rejected",
  ) => Promise<void>;
  onStartConversation: (otherUserId: string) => Promise<void>;
  onContactCreator: () => void;
}

export function PostingManageTab({
  posting,
  postingId,
  isOwner,
  currentUserId,
  applications,
  matchedProfiles,
  isLoading,
  isUpdatingApplication,
  onUpdateStatus,
  onStartConversation,
  onContactCreator,
}: PostingManageTabProps) {
  const router = useRouter();

  return (
    <div className="grid gap-6 lg:grid-cols-3 mt-6">
      <div className="space-y-6 lg:col-span-2">
        <PostingApplicationsCard
          applications={applications}
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

      <PostingSidebar
        posting={posting}
        isOwner={isOwner}
        onContactCreator={onContactCreator}
      />
    </div>
  );
}
