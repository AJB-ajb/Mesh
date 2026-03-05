"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";

import { createClient } from "@/lib/supabase/client";
import type {
  PostingDetail,
  Application,
} from "@/lib/hooks/use-posting-detail";
import { apiMutate } from "@/lib/swr/api-mutate";
import { cacheKeys } from "@/lib/swr/keys";
import type { ApplicationResponses } from "@/lib/types/acceptance-card";

export function useApplicationActions(
  postingId: string,
  posting: PostingDetail | null,
  fetchedHasApplied: boolean,
  fetchedMyApplication: Application | null,
  fetchedWaitlistPosition: number | null,
  applications: Application[],
  setError: (error: string | null) => void,
) {
  const { mutate } = useSWRConfig();
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

  const handleApply = async (responses?: ApplicationResponses) => {
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
      const { data: responseData } = await apiMutate<{
        application: Application;
        status: string;
        waitlistPosition?: number;
      }>("/api/applications", {
        method: "POST",
        body: {
          posting_id: postingId,
          cover_message: coverMessage.trim() || undefined,
          ...(responses ? { responses } : {}),
        },
        successToast: "applicationSubmitted",
        errorFallback: "Failed to submit request",
      });

      const { application, status, waitlistPosition: wlPos } = responseData;

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
      await apiMutate(`/api/applications/${myApplication.id}/withdraw`, {
        method: "PATCH",
        successToast: "applicationWithdrawn",
        errorFallback: "Failed to withdraw request.",
      });

      setLocalMyApplication({ ...myApplication, status: "withdrawn" });
      mutate(cacheKeys.posting(postingId));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to withdraw request.",
      );
    }
  };

  const handleUpdateApplicationStatus = async (
    applicationId: string,
    newStatus: "accepted" | "rejected",
  ) => {
    setIsUpdatingApplication(applicationId);

    try {
      await apiMutate(`/api/applications/${applicationId}/decide`, {
        method: "PATCH",
        body: { status: newStatus },
        successToast:
          newStatus === "accepted"
            ? "applicationAccepted"
            : "applicationRejected",
        errorFallback: "Failed to update request.",
      });

      setLocalApplications((prev) =>
        (prev ?? applications).map((app) =>
          app.id === applicationId ? { ...app, status: newStatus } : app,
        ),
      );
      setIsUpdatingApplication(null);
      mutate(cacheKeys.posting(postingId));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update request.",
      );
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
