"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { KeyedMutator } from "swr";

import { createClient } from "@/lib/supabase/client";
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

    try {
      const res = await fetch(
        `/api/applications/${myApplication.id}/withdraw`,
        {
          method: "PATCH",
        },
      );

      if (!res.ok) {
        const body = await res.json();
        setError(body.error?.message || "Failed to withdraw request.");
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
        const body = await res.json();
        setError(body.error?.message || "Failed to update request.");
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
