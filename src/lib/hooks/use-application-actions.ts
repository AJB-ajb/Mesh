"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { KeyedMutator } from "swr";

import { createClient } from "@/lib/supabase/client";
import {
  type NotificationPreferences,
  shouldNotify,
} from "@/lib/notifications/preferences";
import type {
  PostingDetail,
  Application,
  PostingDetailData,
} from "@/lib/hooks/use-posting-detail";

export function useApplicationActions(
  postingId: string,
  posting: PostingDetail | null,
  fetchedHasApplied: boolean,
  fetchedMyApplication: Application | null,
  fetchedWaitlistPosition: number | null,
  applications: Application[],
  mutate: KeyedMutator<PostingDetailData>,
  setError: (error: string | null) => void,
) {
  const router = useRouter();

  const [localWaitlistPosition, setLocalWaitlistPosition] = useState<
    number | null | undefined
  >(undefined);
  const [localHasApplied, setLocalHasApplied] = useState<boolean | null>(null);
  const [localMyApplication, setLocalMyApplication] = useState<
    Application | null | undefined
  >(undefined);
  const [isApplying, setIsApplying] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [coverMessage, setCoverMessage] = useState("");
  const [isUpdatingApplication, setIsUpdatingApplication] = useState<
    string | null
  >(null);
  const [localApplications, setLocalApplications] = useState<
    Application[] | null
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
    const { data: waitlisted } = await supabase
      .from("applications")
      .select("id, applicant_id")
      .eq("posting_id", pId)
      .eq("status", "waitlisted")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!waitlisted) {
      if (p.status === "filled") {
        await supabase
          .from("postings")
          .update({ status: "open" })
          .eq("id", pId);
      }
      return;
    }

    if (p.auto_accept) {
      await supabase
        .from("applications")
        .update({ status: "accepted" })
        .eq("id", waitlisted.id);

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
          title: "You're in! \uD83C\uDF89",
          body: `A spot opened on "${p.title}" and you've been promoted from the waitlist!`,
          related_posting_id: pId,
          related_application_id: waitlisted.id,
        });
      }
    } else {
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
          title: "Spot opened \u2014 waitlist ready",
          body: `A spot opened on "${p.title}". You have waitlisted people ready to accept.`,
          related_posting_id: pId,
        });
      }

      if (p.status === "filled") {
        await supabase
          .from("postings")
          .update({ status: "open" })
          .eq("id", pId);
      }
    }

    mutate();
  };

  const handleApply = async () => {
    if (!router) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
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

  return {
    // State
    hasApplied,
    myApplication,
    effectiveApplications,
    waitlistPosition,
    isApplying,
    showApplyForm,
    setShowApplyForm,
    coverMessage,
    setCoverMessage,
    isUpdatingApplication,
    // Actions
    handleApply,
    handleWithdrawApplication,
    handleUpdateApplicationStatus,
  };
}
