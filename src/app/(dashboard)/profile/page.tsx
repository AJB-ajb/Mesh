"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { labels } from "@/lib/labels";

import { Button } from "@/components/ui/button";
import { useProfile } from "@/lib/hooks/use-profile";
import { useLocation } from "@/lib/hooks/use-location";
import { ProfileForm } from "@/components/profile/profile-form";
import { ProfileView } from "@/components/profile/profile-view";
import { IntegrationsSection } from "@/components/profile/integrations-section";
import { FreeFormUpdate } from "@/components/shared/free-form-update";
import { NlInputPanel } from "@/components/shared/nl-input-panel";
import { mapExtractedToFormState } from "@/lib/types/profile";
import { useCalendarBusyBlocks } from "@/lib/hooks/use-calendar-busy-blocks";
import { useProfileExtractionReview } from "@/lib/hooks/use-profile-extraction-review";
import { ProfileExtractionReviewCard } from "@/components/profile/profile-extraction-review-card";

function ProfilePageContent() {
  const searchParams = useSearchParams();
  const shouldExtract = searchParams.get("extraction") === "pending";

  const {
    profileId,
    form,
    setForm,
    isLoading,
    isSaving,
    error,
    success,
    isEditing,
    setIsEditing,
    userEmail,
    connectedProviders,
    handleChange,
    handleSubmit,
    handleLinkProvider,
    sourceText,
    canUndo,
    isApplyingUpdate,
    applyFreeFormUpdate,
    undoLastUpdate,
    availabilityWindows,
    onAvailabilityWindowsChange,
  } = useProfile();

  const { busyWindows } = useCalendarBusyBlocks(profileId);

  const location = useLocation(setForm, () => {});

  // AI extraction state
  const [aiText, setAiText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionSuccess, setExtractionSuccess] = useState(false);

  // Profile extraction review (triggered after text-first onboarding)
  const extractionReview = useProfileExtractionReview({
    profileId: profileId ?? null,
    sourceText: form.bio || sourceText || "",
    shouldExtract,
  });

  const handleAiExtract = async () => {
    if (!aiText.trim()) {
      return;
    }

    setIsExtracting(true);
    setExtractionSuccess(false);

    try {
      const response = await fetch("/api/extract/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to extract profile");
      }

      const extracted = data.profile;
      setForm((prev) => mapExtractedToFormState(extracted, prev));

      setExtractionSuccess(true);
      setTimeout(() => {
        setExtractionSuccess(false);
      }, 1500);
    } catch {
      // Error is shown via the profile hook's error state
    } finally {
      setIsExtracting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <Link
        href="/posts"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {labels.common.backToDashboard}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {labels.profile.title}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {userEmail && <span className="text-sm">{userEmail}</span>}
          </p>
        </div>
        {!isEditing && (
          <Button
            data-testid="profile-edit-button"
            onClick={() => setIsEditing(true)}
          >
            {labels.profile.editButton}
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {success && (
        <p className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
          {labels.profile.updateSuccess}
        </p>
      )}

      {isEditing ? (
        <>
          {/* NL input — always visible on top when editing */}
          <NlInputPanel
            nlText={aiText}
            onNlTextChange={setAiText}
            isExtracting={isExtracting}
            extractionSuccess={extractionSuccess}
            onExtract={handleAiExtract}
            variant="profile"
          />

          {/* Form — always visible below */}
          <ProfileForm
            form={form}
            setForm={setForm}
            isSaving={isSaving}
            onSubmit={handleSubmit}
            onChange={handleChange}
            onCancel={() => setIsEditing(false)}
            location={location}
            availabilityWindows={availabilityWindows}
            onAvailabilityWindowsChange={onAvailabilityWindowsChange}
            busyBlocks={busyWindows}
          />
          <IntegrationsSection
            connectedProviders={connectedProviders}
            isEditing={true}
            onLinkProvider={handleLinkProvider}
          />
        </>
      ) : (
        <>
          {/* Extraction review card (shown after text-first onboarding) */}
          {extractionReview.status !== "idle" && (
            <ProfileExtractionReviewCard
              status={extractionReview.status}
              extracted={extractionReview.extracted}
              acceptAll={extractionReview.acceptAll}
              acceptField={extractionReview.acceptField}
              dismiss={extractionReview.dismiss}
              retry={extractionReview.retry}
            />
          )}

          <FreeFormUpdate
            entityType="profile"
            sourceText={sourceText}
            canUndo={canUndo}
            isApplying={isApplyingUpdate}
            onUpdate={applyFreeFormUpdate}
            onUndo={undoLastUpdate}
            currentFormState={form as unknown as Record<string, unknown>}
          />
          <ProfileView
            form={form}
            availabilityWindows={availabilityWindows}
            busyBlocks={busyWindows}
          />
          <IntegrationsSection
            connectedProviders={connectedProviders}
            isEditing={false}
            onLinkProvider={handleLinkProvider}
          />
        </>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}
