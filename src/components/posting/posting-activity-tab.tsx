"use client";

import { usePostingDetailContext } from "./posting-detail-context";
import { PostingTeamCard } from "@/components/posting/posting-team-card";
import { PostingAboutCard } from "@/components/posting/posting-about-card";
import { GroupChatPanel } from "@/components/posting/group-chat-panel";
import { PostingSidebar } from "@/components/posting/posting-sidebar";
import { TeamSchedulingSection } from "@/components/posting/team-scheduling-section";

export function PostingActivityTab() {
  const {
    posting,
    postingId,
    isOwner,
    currentUserId,
    currentUserName,
    effectiveApplications,
  } = usePostingDetailContext();

  const teamMembers = [
    {
      user_id: posting.creator_id,
      full_name: posting.profiles?.full_name ?? null,
      role: "creator" as const,
    },
    ...effectiveApplications
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
        <PostingTeamCard />

        {currentUserId && (
          <TeamSchedulingSection
            postingId={postingId}
            postingTitle={posting.title}
            isOwner={isOwner}
            currentUserId={currentUserId}
          />
        )}

        <PostingAboutCard />

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

      <PostingSidebar />
    </div>
  );
}
