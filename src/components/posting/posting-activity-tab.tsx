"use client";

import type {
  PostingDetail,
  Application,
} from "@/lib/hooks/use-posting-detail";
import type { PostingFormState } from "@/lib/hooks/use-posting-detail";
import { PostingTeamCard } from "@/components/posting/posting-team-card";
import { PostingAboutCard } from "@/components/posting/posting-about-card";
import { GroupChatPanel } from "@/components/posting/group-chat-panel";
import { PostingSidebar } from "@/components/posting/posting-sidebar";
import { TeamSchedulingSection } from "@/components/posting/team-scheduling-section";

interface PostingActivityTabProps {
  posting: PostingDetail;
  postingId: string;
  isOwner: boolean;
  currentUserId: string | null;
  currentUserName: string | null;
  applications: Application[];
  form: PostingFormState;
  onFormChange: (field: keyof PostingFormState, value: string) => void;
  onContactCreator: () => void;
}

export function PostingActivityTab({
  posting,
  postingId,
  isOwner,
  currentUserId,
  currentUserName,
  applications,
  form,
  onFormChange,
  onContactCreator,
}: PostingActivityTabProps) {
  const teamMembers = [
    {
      user_id: posting.creator_id,
      full_name: posting.profiles?.full_name ?? null,
      role: "creator" as const,
    },
    ...applications
      .filter((a) => a.status === "accepted")
      .map((a) => ({
        user_id: a.applicant_id,
        full_name: a.profiles?.full_name ?? null,
        role: "member" as const,
      })),
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3 mt-6">
      <div className="space-y-6 lg:col-span-2">
        <PostingTeamCard
          applications={applications}
          creatorName={posting.profiles?.full_name ?? null}
          teamSizeMin={posting.team_size_min}
          teamSizeMax={posting.team_size_max}
        />

        {currentUserId && (
          <TeamSchedulingSection
            postingId={postingId}
            postingTitle={posting.title}
            isOwner={isOwner}
            currentUserId={currentUserId}
          />
        )}

        <PostingAboutCard
          posting={posting}
          isEditing={false}
          form={form}
          onFormChange={onFormChange}
        />

        {currentUserId && (
          <GroupChatPanel
            postingId={postingId}
            postingTitle={posting.title}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            teamMembers={teamMembers}
          />
        )}
      </div>

      <PostingSidebar
        posting={posting}
        isOwner={isOwner}
        onContactCreator={onContactCreator}
      />
    </div>
  );
}
