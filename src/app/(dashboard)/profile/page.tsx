"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useProfile } from "@/lib/hooks/use-profile";
import { useGithubSync } from "@/lib/hooks/use-github-sync";
import { useLocation } from "@/lib/hooks/use-location";
import { ProfileForm } from "@/components/profile/profile-form";
import { ProfileView } from "@/components/profile/profile-view";
import { GitHubIntegrationCard } from "@/components/profile/github-integration-card";
import { IntegrationsSection } from "@/components/profile/integrations-section";

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
    fetchProfile,
  } = useProfile();

  const {
    githubSync,
    isGithubSyncing,
    githubSyncError,
    fetchGithubSyncStatus,
    handleGithubSync,
    applySuggestion,
  } = useGithubSync(setForm, setIsEditing);

  const location = useLocation(setForm, (_val) => {});

  useEffect(() => {
    fetchProfile().then(({ hasGithubProvider }) => {
      if (hasGithubProvider) {
        fetchGithubSyncStatus();
      }
    });
  }, [fetchProfile, fetchGithubSyncStatus]);

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
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
          <p className="mt-1 text-muted-foreground">
            {userEmail && <span className="text-sm">{userEmail}</span>}
          </p>
        </div>
        {!isEditing && (
          <Button
            data-testid="profile-edit-button"
            onClick={() => setIsEditing(true)}
          >
            Edit Profile
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
          Profile updated successfully!
        </p>
      )}

      {isEditing ? (
        <>
          <ProfileForm
            form={form}
            isSaving={isSaving}
            onSubmit={handleSubmit}
            onChange={handleChange}
            onCancel={() => setIsEditing(false)}
            location={location}
          />
          <IntegrationsSection
            connectedProviders={connectedProviders}
            isEditing={true}
            onLinkProvider={handleLinkProvider}
          />
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
          <ProfileView form={form} />
          <IntegrationsSection
            connectedProviders={connectedProviders}
            isEditing={false}
          />
        </>
      )}
    </div>
  );
}
