"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { usePostingDetail } from "@/lib/hooks/use-posting-detail";
import {
  type NotificationPreferences,
  shouldNotify,
} from "@/lib/notifications/preferences";
import type { PostingFormState } from "@/lib/hooks/use-posting-detail";
import { PostingDetailHeader } from "@/components/posting/posting-detail-header";
import { PostingAboutCard } from "@/components/posting/posting-about-card";
import { PostingApplicationsCard } from "@/components/posting/posting-applications-card";
import { PostingCompatibilityCard } from "@/components/posting/posting-compatibility-card";
import { PostingMatchedProfilesCard } from "@/components/posting/posting-matched-profiles-card";
import { PostingSidebar } from "@/components/posting/posting-sidebar";
import { FreeFormPostingUpdate } from "@/components/posting/free-form-posting-update";
import { usePostingAiUpdate } from "@/lib/hooks/use-posting-ai-update";

export default function PostingDetailPage() {
  const router = useRouter();
  const params = useParams();
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
    isLoading,
    mutate,
  } = usePostingDetail(postingId);

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

  // Promote the first waitlisted user when a spot opens
  const promoteFromWaitlist = async (
    supabase: ReturnType<typeof createClient>,
    pId: string,
    p: NonNullable<typeof posting>,
  ) => {
    // Get first waitlisted user (FIFO)
    const { data: waitlisted } = await supabase
      .from("applications")
      .select("id, applicant_id")
      .eq("posting_id", pId)
      .eq("status", "waitlisted")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!waitlisted) {
      // No one on waitlist — reopen the posting if it was filled
      if (p.status === "filled") {
        await supabase
          .from("postings")
          .update({ status: "open" })
          .eq("id", pId);
      }
      return;
    }

    if (p.auto_accept) {
      // Auto-promote: instantly accept the first waitlisted user
      await supabase
        .from("applications")
        .update({ status: "accepted" })
        .eq("id", waitlisted.id);

      // Notify the promoted user
      const { data: promotedProfile } = await supabase
        .from("profiles")
        .select("notification_preferences")
        .eq("user_id", waitlisted.applicant_id)
        .single();

      const promotedPrefs =
        promotedProfile?.notification_preferences as NotificationPreferences | null;

      if (shouldNotify(promotedPrefs, "application_accepted", "in_app")) {
        await supabase.from("notifications").insert({
          user_id: waitlisted.applicant_id,
          type: "application_accepted",
          title: "You're in! 🎉",
          body: `A spot opened on "${p.title}" and you've been promoted from the waitlist!`,
          related_posting_id: pId,
          related_application_id: waitlisted.id,
        });
      }
    } else {
      // Manual review: notify the poster that a spot opened
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("notification_preferences")
        .eq("user_id", p.creator_id)
        .single();

      const ownerPrefs =
        ownerProfile?.notification_preferences as NotificationPreferences | null;

      if (shouldNotify(ownerPrefs, "interest_received", "in_app")) {
        await supabase.from("notifications").insert({
          user_id: p.creator_id,
          type: "application_received",
          title: "Spot opened — waitlist ready",
          body: `A spot opened on "${p.title}". You have waitlisted people ready to accept.`,
          related_posting_id: pId,
        });
      }

      // Reopen the posting since it needs manual review
      if (p.status === "filled") {
        await supabase
          .from("postings")
          .update({ status: "open" })
          .eq("id", pId);
      }
    }

    mutate();
  };

  const handleFormChange = (field: keyof PostingFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const parseList = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const handleStartEdit = () => {
    if (!posting) return;
    setForm({
      title: posting.title,
      description: posting.description,
      skills: posting.skills?.join(", ") || "",
      estimatedTime: posting.estimated_time || "",
      teamSizeMin: "1",
      teamSizeMax: posting.team_size_max?.toString() || "5",
      lookingFor: posting.team_size_max?.toString() || "3",
      category: posting.category || "personal",
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
      skillLevelMin: posting.skill_level_min?.toString() || "",
      autoAccept: posting.auto_accept ? "true" : "false",
      selectedSkills: [],
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);

    const supabase = createClient();
    const lookingFor = Math.max(1, Math.min(10, Number(form.lookingFor) || 3));
    const locationLat = parseFloat(form.locationLat);
    const locationLng = parseFloat(form.locationLng);
    const maxDistanceKm = parseInt(form.maxDistanceKm, 10);

    const { error: updateError } = await supabase
      .from("postings")
      .update({
        title: form.title.trim(),
        description: form.description.trim(),
        skills: parseList(form.skills),
        estimated_time: form.estimatedTime || null,
        team_size_min: 1,
        team_size_max: lookingFor,
        category: form.category,
        mode: form.mode,
        status: form.status,
        expires_at: form.expiresAt
          ? new Date(form.expiresAt + "T23:59:59").toISOString()
          : undefined,
        location_mode: form.locationMode || "either",
        location_name: form.locationName.trim() || null,
        location_lat: Number.isFinite(locationLat) ? locationLat : null,
        location_lng: Number.isFinite(locationLng) ? locationLng : null,
        max_distance_km:
          Number.isFinite(maxDistanceKm) && maxDistanceKm > 0
            ? maxDistanceKm
            : null,
        tags: form.tags
          ? form.tags
              .split(",")
              .map((t: string) => t.trim())
              .filter(Boolean)
          : [],
        context_identifier: form.contextIdentifier.trim() || null,
        skill_level_min: form.skillLevelMin
          ? parseInt(form.skillLevelMin, 10)
          : null,
        auto_accept: form.autoAccept === "true",
        updated_at: new Date().toISOString(),
      })
      .eq("id", postingId);

    setIsSaving(false);

    if (updateError) {
      setError("Failed to update posting. Please try again.");
      return;
    }

    setIsEditing(false);
    mutate();
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this posting? This action cannot be undone.",
      )
    )
      return;

    setIsDeleting(true);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("postings")
      .delete()
      .eq("id", postingId);

    if (deleteError) {
      setIsDeleting(false);
      setError("Failed to delete posting. Please try again.");
      return;
    }

    router.push("/postings");
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

    const wasAccepted = myApplication.status === "accepted";

    const supabase = createClient();
    const { error: withdrawError } = await supabase
      .from("applications")
      .update({ status: "withdrawn" })
      .eq("id", myApplication.id);

    if (withdrawError) {
      setError("Failed to withdraw request. Please try again.");
      return;
    }

    setLocalMyApplication({ ...myApplication, status: "withdrawn" });

    // If an accepted user withdraws, trigger waitlist promotion
    if (wasAccepted && posting) {
      await promoteFromWaitlist(supabase, postingId, posting);
    }
  };

  const handleUpdateApplicationStatus = async (
    applicationId: string,
    newStatus: "accepted" | "rejected",
  ) => {
    setIsUpdatingApplication(applicationId);
    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("applications")
      .update({ status: newStatus })
      .eq("id", applicationId);

    if (updateError) {
      setError("Failed to update request. Please try again.");
      setIsUpdatingApplication(null);
      return;
    }

    const application = effectiveApplications.find(
      (a) => a.id === applicationId,
    );

    if (application && posting) {
      const notifType =
        newStatus === "accepted"
          ? ("application_accepted" as const)
          : ("application_rejected" as const);

      // Check recipient preferences
      const { data: recipientProfile } = await supabase
        .from("profiles")
        .select("notification_preferences")
        .eq("user_id", application.applicant_id)
        .single();

      const recipientPrefs =
        recipientProfile?.notification_preferences as NotificationPreferences | null;

      if (shouldNotify(recipientPrefs, notifType, "in_app")) {
        await supabase.from("notifications").insert({
          user_id: application.applicant_id,
          type: notifType,
          title:
            newStatus === "accepted"
              ? "Request Accepted! \uD83C\uDF89"
              : "Request Update",
          body:
            newStatus === "accepted"
              ? `Your request to join "${posting.title}" has been accepted!`
              : `Your request to join "${posting.title}" was not selected.`,
          related_posting_id: postingId,
          related_application_id: applicationId,
          related_user_id: posting.creator_id,
        });
      }
    }

    // If accepting a new member, check if posting should be marked as filled
    if (newStatus === "accepted" && posting) {
      const { count } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("posting_id", postingId)
        .eq("status", "accepted");

      if (count && count >= posting.team_size_max) {
        await supabase
          .from("postings")
          .update({ status: "filled" })
          .eq("id", postingId);
      }
    }

    setLocalApplications((prev) =>
      (prev ?? applications).map((app) =>
        app.id === applicationId ? { ...app, status: newStatus } : app,
      ),
    );
    setIsUpdatingApplication(null);
    mutate();
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
      router.push(`/inbox?conversation=${existingConv.id}`);
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

    router.push(`/inbox?conversation=${newConv.id}`);
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
          href="/postings"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          Back to postings
        </Link>
        <Card>
          <CardContent className="flex min-h-[200px] flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Posting not found.</p>
            <Button asChild className="mt-4">
              <Link href="/postings">Browse Postings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {isOwner && !isEditing && (
            <FreeFormPostingUpdate
              postingId={postingId}
              sourceText={posting.source_text ?? null}
              canUndo={!!posting.previous_source_text}
              isApplying={isApplyingUpdate}
              onUpdate={applyFreeFormUpdate}
              onUndo={undoLastUpdate}
            />
          )}

          <PostingAboutCard
            posting={posting}
            isEditing={isEditing}
            form={form}
            onFormChange={handleFormChange}
          />

          {isOwner && (
            <PostingApplicationsCard
              applications={effectiveApplications}
              isUpdatingApplication={isUpdatingApplication}
              onUpdateStatus={handleUpdateApplicationStatus}
              onMessage={handleStartConversation}
            />
          )}

          {!isOwner && currentUserProfile && (
            <PostingCompatibilityCard
              matchBreakdown={matchBreakdown}
              isComputingMatch={false}
            />
          )}

          {isOwner && (
            <PostingMatchedProfilesCard
              matchedProfiles={matchedProfiles}
              isLoadingMatches={isLoading}
              onViewProfile={(userId) => router.push(`/profile/${userId}`)}
              onMessage={handleStartConversation}
            />
          )}
        </div>

        {/* Sidebar */}
        <PostingSidebar
          posting={posting}
          isOwner={isOwner}
          onContactCreator={handleContactCreator}
        />
      </div>
    </div>
  );
}
