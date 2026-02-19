"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { labels } from "@/lib/labels";

import { Button } from "@/components/ui/button";
import { useProfile } from "@/lib/hooks/use-profile";
import { useGithubSync } from "@/lib/hooks/use-github-sync";
import { useLocation } from "@/lib/hooks/use-location";
import { ProfileForm } from "@/components/profile/profile-form";
import { ProfileView } from "@/components/profile/profile-view";
import { GitHubIntegrationCard } from "@/components/profile/github-integration-card";
import { IntegrationsSection } from "@/components/profile/integrations-section";
import { FreeFormUpdate } from "@/components/shared/free-form-update";
import { InputModeToggle } from "@/components/posting/input-mode-toggle";
import { AiExtractionCard } from "@/components/posting/ai-extraction-card";
import type { InputMode } from "@/components/posting/input-mode-toggle";
import { mapExtractedToFormState } from "@/lib/types/profile";

export default function ProfilePage() {
  const {
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
    isGithubProvider,
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

  const {
    githubSync,
    isGithubSyncing,
    githubSyncError,
    fetchGithubSyncStatus,
    handleGithubSync,
    applySuggestion,
  } = useGithubSync(setForm, setIsEditing);

  const location = useLocation(setForm, () => {});

  // AI extraction state
  const [inputMode, setInputMode] = useState<InputMode>("form");
  const [aiText, setAiText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionSuccess, setExtractionSuccess] = useState(false);

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
        setInputMode("form");
        setExtractionSuccess(false);
      }, 1500);
    } catch {
      // Error is shown via the profile hook's error state
    } finally {
      setIsExtracting(false);
    }
  };

  // Fetch GitHub sync status once we know the user has a GitHub provider
  useEffect(() => {
    if (isGithubProvider) {
      fetchGithubSyncStatus();
    }
  }, [isGithubProvider, fetchGithubSyncStatus]);

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
        href="/active"
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
          <InputModeToggle inputMode={inputMode} onModeChange={setInputMode} />

          {inputMode === "ai" ? (
            <AiExtractionCard
              aiText={aiText}
              onAiTextChange={setAiText}
              isExtracting={isExtracting}
              extractionSuccess={extractionSuccess}
              onExtract={handleAiExtract}
              onSwitchToForm={() => setInputMode("form")}
              variant="profile"
            />
          ) : (
            <>
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
              />
              <IntegrationsSection
                connectedProviders={connectedProviders}
                isEditing={true}
                onLinkProvider={handleLinkProvider}
              />
            </>
          )}
        </>
      ) : (
        <>
          <GitHubIntegrationCard
            isGithubProvider={isGithubProvider}
            githubSync={githubSync}
            isGithubSyncing={isGithubSyncing}
            githubSyncError={githubSyncError}
            onSync={handleGithubSync}
            onApplySuggestion={applySuggestion}
          />
          <FreeFormUpdate
            entityType="profile"
            sourceText={sourceText}
            canUndo={canUndo}
            isApplying={isApplyingUpdate}
            onUpdate={applyFreeFormUpdate}
            onUndo={undoLastUpdate}
          />
          <ProfileView form={form} availabilityWindows={availabilityWindows} />
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
