"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle, Check } from "lucide-react";

import { labels } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";
import { useSettings } from "@/lib/hooks/use-settings";
import { useNotificationPreferences } from "@/lib/hooks/use-notification-preferences";
import type {
  NotificationType,
  NotificationChannel,
  NotificationPreferences,
} from "@/lib/notifications/preferences";
import { CalendarSettingsCard } from "@/components/calendar/calendar-settings-card";
import { AccountInfoCard } from "@/components/settings/account-info-card";
import { ConnectedAccountsCard } from "@/components/settings/connected-accounts-card";
import { GithubSyncCard } from "@/components/settings/github-sync-card";
import { NotificationPreferencesCard } from "@/components/settings/notification-preferences-card";
import { DangerZoneCard } from "@/components/settings/danger-zone-card";

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    userEmail,
    persona,
    providers,
    githubSyncStatus,
    isLoading,
    mutate,
    mutateGithubSync,
  } = useSettings();

  const { preferences: notifPrefs, updatePreferences: updateNotifPrefs } =
    useNotificationPreferences();

  const [error, setError] = useState<string | null>(() => {
    const msg = searchParams.get("error");
    if (msg) {
      window.history.replaceState({}, "", "/settings");
      return decodeURIComponent(msg);
    }
    return null;
  });
  const [success, setSuccess] = useState<string | null>(() => {
    const msg = searchParams.get("success");
    if (msg) {
      window.history.replaceState({}, "", "/settings");
      return decodeURIComponent(msg);
    }
    return null;
  });

  const handleToggleNotification = async (
    type: NotificationType,
    channel: NotificationChannel,
    checked: boolean,
  ) => {
    const updated: NotificationPreferences = {
      ...notifPrefs,
      [channel]: {
        ...notifPrefs[channel],
        [type]: checked,
      },
    };
    try {
      await updateNotifPrefs(updated);
    } catch {
      setError("Failed to save notification preferences.");
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const githubConnected = providers.find(
    (p) => p.provider === "github",
  )?.connected;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/active"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {labels.common.backToDashboard}
      </Link>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {labels.settings.title}
        </h1>
        <p className="mt-1 text-muted-foreground">{labels.settings.subtitle}</p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400 flex items-start gap-2">
          <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <AccountInfoCard userEmail={userEmail} persona={persona} />

      <ConnectedAccountsCard
        providers={providers}
        onError={(msg) => {
          setError(msg || null);
          setSuccess(null);
        }}
        onSuccess={(msg) => {
          setSuccess(msg || null);
          setError(null);
        }}
        onMutate={mutate}
      />

      {githubConnected && (
        <GithubSyncCard
          githubSyncStatus={githubSyncStatus}
          onError={(msg) => {
            setError(msg || null);
            setSuccess(null);
          }}
          onSuccess={(msg) => {
            setSuccess(msg || null);
            setError(null);
          }}
          onMutateGithubSync={mutateGithubSync}
        />
      )}

      <CalendarSettingsCard
        onError={(msg) => {
          setError(msg);
          setSuccess(null);
        }}
        onSuccess={(msg) => {
          setSuccess(msg);
          setError(null);
        }}
      />

      <NotificationPreferencesCard
        preferences={notifPrefs}
        onToggle={handleToggleNotification}
      />

      <DangerZoneCard onSignOut={handleSignOut} />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
