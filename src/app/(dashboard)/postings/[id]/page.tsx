"use client";

import { useState, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { labels } from "@/lib/labels";
import { usePostingDetail } from "@/lib/hooks/use-posting-detail";
import type { PostingFormState } from "@/lib/hooks/use-posting-detail";
import type { RecurringWindow } from "@/lib/types/availability";
import { PostingDetailHeader } from "@/components/posting/posting-detail-header";
import { PostingAboutCard } from "@/components/posting/posting-about-card";
import { PostingCompatibilityCard } from "@/components/posting/posting-compatibility-card";
import { PostingSidebar } from "@/components/posting/posting-sidebar";
import { PostingTeamCard } from "@/components/posting/posting-team-card";
import { usePostingAiUpdate } from "@/lib/hooks/use-posting-ai-update";
import { SequentialInviteResponseCard } from "@/components/posting/sequential-invite-response-card";
import { GroupChatPanel } from "@/components/posting/group-chat-panel";
import { PostingEditTab } from "@/components/posting/posting-edit-tab";
import { PostingManageTab } from "@/components/posting/posting-manage-tab";
import { PostingActivityTab } from "@/components/posting/posting-activity-tab";

// ---------------------------------------------------------------------------
// Inner component that uses useSearchParams (needs Suspense boundary)
// ---------------------------------------------------------------------------

function PostingDetailInner() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const postingId = params.id as string;

  const {
    posting,
    isOwner,
    currentUserId,
    currentUserProfile,
    matchBreakdown,
    applications,
    matchedProfiles,
    myApplication: fetchedMyApplication,
    hasApplied: fetchedHasApplied,
    waitlistPosition: fetchedWaitlistPosition,
    acceptedCount: fetchedAcceptedCount,
    isLoading,
    mutate,
  } = usePostingDetail(postingId);

  // Determine active tab from URL or context
  const tabParam = searchParams.get("tab");
  const defaultTab =
    tabParam === "edit" || tabParam === "manage" || tabParam === "project"
      ? tabParam
      : "manage";
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Context-aware back navigation
  const fromParam = searchParams.get("from");
  const backHref = fromParam === "discover" ? "/discover" : "/my-postings";
  const backLabel =
    fromParam === "discover"
      ? labels.common.backToDiscover
      : labels.common.backToPostings;

  // Local UI state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PostingFormState>({
    title: "",
    description: "",
    skills: "",
    estimatedTime: "",
    teamSizeMin: "1",
    teamSizeMax: "5",
    lookingFor: "3",
    category: "personal",
    visibility: "public",
    mode: "open",
    status: "open",
    expiresAt: "",
    locationMode: "either",
    locationName: "",
    locationLat: "",
    locationLng: "",
    maxDistanceKm: "",
    tags: "",
    contextIdentifier: "",
    skillLevelMin: "",
    autoAccept: "false",
    availabilityMode: "flexible",
    timezone: "",
    availabilityWindows: [],
    specificWindows: [],
    selectedSkills: [],
  });

  // AI update hook
  const { isApplyingUpdate, applyFreeFormUpdate, undoLastUpdate } =
    usePostingAiUpdate(postingId, form, posting?.source_text ?? null, mutate);

  // Application UI state
  const [localWaitlistPosition, setLocalWaitlistPosition] = useState<
    number | null | undefined
  >(undefined);
  const [localHasApplied, setLocalHasApplied] = useState<boolean | null>(null);
  const [localMyApplication, setLocalMyApplication] = useState<
    typeof fetchedMyApplication | undefined
  >(undefined);
  const [isApplying, setIsApplying] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [coverMessage, setCoverMessage] = useState("");
  const [isUpdatingApplication, setIsUpdatingApplication] = useState<
    string | null
  >(null);
  const [localApplications, setLocalApplications] = useState<
    typeof applications | null
  >(null);

  // Derive effective values (local overrides or fetched)
  const hasApplied = localHasApplied ?? fetchedHasApplied;
  const myApplication =
    localMyApplication !== undefined
      ? localMyApplication
      : fetchedMyApplication;
  const effectiveApplications = localApplications ?? applications;
  const waitlistPosition =
    localWaitlistPosition !== undefined
      ? localWaitlistPosition
      : fetchedWaitlistPosition;

  // Accepted count for project tab gating
  // For owners, derive from local applications; for non-owners, use the DB count
  const acceptedCount =
    fetchedAcceptedCount !== null
      ? fetchedAcceptedCount
      : effectiveApplications.filter((a) => a.status === "accepted").length;

  // Check if non-owner is an accepted member (can see Project tab)
  const isAcceptedMember = !isOwner && myApplication?.status === "accepted";

  // Project tab disabled when min team not reached
  const projectEnabled =
    posting != null && acceptedCount >= posting.team_size_min;

  const handleFormChange = (field: keyof PostingFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleStartEdit = async () => {
    if (!posting) return;

    // Fetch availability windows for this posting
    const supabase = createClient();
    const { data: windowRows } = await supabase
      .from("availability_windows")
      .select("*")
      .eq("posting_id", postingId)
      .eq("window_type", "recurring");

    const windows: RecurringWindow[] = (windowRows ?? []).map((w) => ({
      window_type: "recurring" as const,
      day_of_week: w.day_of_week!,
      start_minutes: w.start_minutes!,
      end_minutes: w.end_minutes!,
    }));

    setForm({
      title: posting.title,
      description: posting.description,
      skills: posting.skills?.join(", ") || "",
      estimatedTime: posting.estimated_time || "",
      teamSizeMin: posting.team_size_min?.toString() || "1",
      teamSizeMax: posting.team_size_max?.toString() || "5",
      lookingFor: posting.team_size_max?.toString() || "3",
      category: posting.category || "personal",
      visibility:
        posting.visibility ??
        (posting.mode === "friend_ask" ? "private" : "public"),
      mode: posting.mode || "open",
      status: posting.status || "open",
      expiresAt: posting.expires_at ? posting.expires_at.slice(0, 10) : "",
      locationMode: posting.location_mode || "either",
      locationName: posting.location_name || "",
      locationLat: posting.location_lat?.toString() || "",
      locationLng: posting.location_lng?.toString() || "",
      maxDistanceKm: posting.max_distance_km?.toString() || "",
      tags: posting.tags?.join(", ") || "",
      contextIdentifier: posting.context_identifier || "",
      skillLevelMin: "",
      autoAccept: posting.auto_accept ? "true" : "false",
      availabilityMode:
        (posting.availability_mode as PostingFormState["availabilityMode"]) ||
        "flexible",
      timezone: posting.timezone || "",
      availabilityWindows: windows,
      specificWindows: [],
      selectedSkills: posting.selectedPostingSkills ?? [],
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);

    try {
      const res = await fetch(`/api/postings/${postingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setIsSaving(false);
        setError(
          data.error?.message || "Failed to update posting. Please try again.",
        );
        return;
      }

      setIsSaving(false);
      setIsEditing(false);
      mutate();
    } catch {
      setIsSaving(false);
      setError("Failed to update posting. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this posting? This action cannot be undone.",
      )
    )
      return;

    setIsDeleting(true);

    try {
      const res = await fetch(`/api/postings/${postingId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setIsDeleting(false);
        setError(
          data.error?.message || "Failed to delete posting. Please try again.",
        );
        return;
      }

      router.push("/my-postings");
    } catch {
      setIsDeleting(false);
      setError("Failed to delete posting. Please try again.");
    }
  };

  const handleExtendDeadline = async (days: number) => {
    setIsExtending(true);
    setError(null);

    try {
      const res = await fetch(`/api/postings/${postingId}/extend-deadline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error?.message || "Failed to extend deadline.");
        setIsExtending(false);
        return;
      }

      setIsExtending(false);
      mutate();
    } catch {
      setError("Failed to extend deadline. Please try again.");
      setIsExtending(false);
    }
  };

  const handleRepost = async () => {
    setIsReposting(true);
    setError(null);

    try {
      const res = await fetch(`/api/postings/${postingId}/repost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 7 }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error?.message || "Failed to repost.");
        setIsReposting(false);
        return;
      }

      setIsReposting(false);
      mutate();
    } catch {
      setError("Failed to repost. Please try again.");
      setIsReposting(false);
    }
  };

  const handleApply = async () => {
    if (!currentUserId) {
      router.push("/login");
      return;
    }

    setIsApplying(true);
    setError(null);

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posting_id: postingId,
          cover_message: coverMessage.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "Failed to submit request");
      }

      const {
        application,
        status,
        waitlistPosition: wlPos,
      } = await response.json();

      setLocalHasApplied(true);
      setLocalMyApplication(application);
      setShowApplyForm(false);
      setCoverMessage("");

      if (status === "waitlisted" && wlPos != null) {
        setLocalWaitlistPosition(wlPos);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to submit request. Please try again.",
      );
    } finally {
      setIsApplying(false);
    }
  };

  const handleWithdrawApplication = async () => {
    if (!myApplication) return;
    const confirmMsg =
      myApplication.status === "waitlisted"
        ? "Are you sure you want to leave the waitlist?"
        : "Are you sure you want to withdraw your request?";
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(
        `/api/applications/${myApplication.id}/withdraw`,
        {
          method: "PATCH",
        },
      );

      if (!res.ok) {
        const data = await res.json();
        setError(
          data.error?.message ||
            "Failed to withdraw request. Please try again.",
        );
        return;
      }

      setLocalMyApplication({ ...myApplication, status: "withdrawn" });
      mutate();
    } catch {
      setError("Failed to withdraw request. Please try again.");
    }
  };

  const handleUpdateApplicationStatus = async (
    applicationId: string,
    newStatus: "accepted" | "rejected",
  ) => {
    setIsUpdatingApplication(applicationId);

    try {
      const res = await fetch(`/api/applications/${applicationId}/decide`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(
          data.error?.message || "Failed to update request. Please try again.",
        );
        setIsUpdatingApplication(null);
        return;
      }

      setLocalApplications((prev) =>
        (prev ?? applications).map((app) =>
          app.id === applicationId ? { ...app, status: newStatus } : app,
        ),
      );
      setIsUpdatingApplication(null);
      mutate();
    } catch {
      setError("Failed to update request. Please try again.");
      setIsUpdatingApplication(null);
    }
  };

  const handleStartConversation = async (otherUserId: string) => {
    if (!currentUserId || !posting) return;

    const supabase = createClient();

    const { data: existingConv } = await supabase
      .from("conversations")
      .select("id")
      .eq("posting_id", postingId)
      .or(
        `and(participant_1.eq.${currentUserId},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${currentUserId})`,
      )
      .single();

    if (existingConv) {
      router.push(`/connections?conversation=${existingConv.id}`);
      return;
    }

    const { data: newConv, error: convError } = await supabase
      .from("conversations")
      .insert({
        posting_id: postingId,
        participant_1: currentUserId,
        participant_2: otherUserId,
      })
      .select()
      .single();

    if (convError) {
      setError("Failed to start conversation. Please try again.");
      return;
    }

    router.push(`/connections?conversation=${newConv.id}`);
  };

  const handleContactCreator = () => {
    if (posting) {
      handleStartConversation(posting.creator_id);
    }
  };

  // --- Render ---

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!posting) {
    return (
      <div className="space-y-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          {backLabel}
        </Link>
        <Card>
          <CardContent className="flex min-h-[200px] flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Posting not found.</p>
            <Button asChild className="mt-4">
              <Link href="/my-postings">Browse Postings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Non-owner view: flat layout (no tabs) — unless accepted member who sees Project
  if (!isOwner) {
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
          onShowApplyForm={() => setShowApplyForm(true)}
          onHideApplyForm={() => {
            setShowApplyForm(false);
            setError(null);
          }}
          onCoverMessageChange={setCoverMessage}
          onApply={handleApply}
          onWithdraw={handleWithdrawApplication}
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
              onFormChange={handleFormChange}
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
            onContactCreator={handleContactCreator}
          />
        </div>
      </div>
    );
  }

  // Owner view: tabbed layout
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
        onEditTitleChange={(value) => handleFormChange("title", value)}
        onSave={handleSave}
        onCancelEdit={() => setIsEditing(false)}
        onStartEdit={handleStartEdit}
        onDelete={handleDelete}
        onExtendDeadline={handleExtendDeadline}
        onRepost={handleRepost}
        hasApplied={hasApplied}
        myApplication={myApplication}
        waitlistPosition={waitlistPosition}
        showApplyForm={showApplyForm}
        coverMessage={coverMessage}
        isApplying={isApplying}
        onShowApplyForm={() => setShowApplyForm(true)}
        onHideApplyForm={() => {
          setShowApplyForm(false);
          setError(null);
        }}
        onCoverMessageChange={setCoverMessage}
        onApply={handleApply}
        onWithdraw={handleWithdrawApplication}
        error={error}
        hideApplySection={false}
        backHref={backHref}
        backLabel={backLabel}
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
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
            onFormChange={handleFormChange}
            onContactCreator={handleContactCreator}
            isApplyingUpdate={isApplyingUpdate}
            onApplyUpdate={applyFreeFormUpdate}
            onUndoUpdate={undoLastUpdate}
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
            onUpdateStatus={handleUpdateApplicationStatus}
            onStartConversation={handleStartConversation}
            onContactCreator={handleContactCreator}
          />
        </TabsContent>

        <TabsContent value="project">
          <PostingActivityTab
            posting={posting}
            postingId={postingId}
            isOwner={isOwner}
            currentUserId={currentUserId}
            currentUserName={currentUserProfile?.full_name ?? null}
            applications={effectiveApplications}
            form={form}
            onFormChange={handleFormChange}
            onContactCreator={handleContactCreator}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component with Suspense boundary for useSearchParams
// ---------------------------------------------------------------------------

export default function PostingDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <PostingDetailInner />
    </Suspense>
  );
}
