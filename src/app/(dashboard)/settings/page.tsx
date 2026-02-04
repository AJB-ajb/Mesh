"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Check,
  X,
  Github,
  Linkedin,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon } from "@/components/icons/auth-icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Provider = "google" | "github" | "linkedin_oidc";

type ConnectedProvider = {
  provider: Provider;
  connected: boolean;
  isPrimary: boolean;
};

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [persona, setPersona] = useState<string | null>(null);
  const [providers, setProviders] = useState<ConnectedProvider[]>([]);
  const [linkingProvider, setLinkingProvider] = useState<Provider | null>(null);
  const [unlinkingProvider, setUnlinkingProvider] = useState<Provider | null>(
    null,
  );
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // GitHub sync state
  const [githubSyncStatus, setGithubSyncStatus] = useState<{
    synced: boolean;
    lastSyncedAt?: string;
    syncStatus?: string;
  } | null>(null);
  const [isGithubSyncing, setIsGithubSyncing] = useState(false);

  const fetchProviders = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const identities = user.identities || [];
    const primaryProvider = user.app_metadata?.provider;

    const providerList: ConnectedProvider[] = [
      {
        provider: "google",
        connected: identities.some(
          (id: { provider: string }) => id.provider === "google",
        ),
        isPrimary: primaryProvider === "google",
      },
      {
        provider: "github",
        connected: identities.some(
          (id: { provider: string }) => id.provider === "github",
        ),
        isPrimary: primaryProvider === "github",
      },
      {
        provider: "linkedin_oidc",
        connected: identities.some(
          (id: { provider: string }) => id.provider === "linkedin_oidc",
        ),
        isPrimary: primaryProvider === "linkedin_oidc",
      },
    ];

    setProviders(providerList);

    // Fetch GitHub sync status if GitHub is connected
    if (providerList.find((p) => p.provider === "github")?.connected) {
      fetchGithubSyncStatus();
    }
  }, []);

  const fetchGithubSyncStatus = async () => {
    try {
      const response = await fetch("/api/github/sync");
      if (response.ok) {
        const data = await response.json();
        setGithubSyncStatus(data);
      }
    } catch {
      console.error("Failed to fetch GitHub sync status");
    }
  };

  useEffect(() => {
    const supabase = createClient();

    // Check for success/error messages from OAuth redirect
    const successMessage = searchParams.get("success");
    const errorMessage = searchParams.get("error");

    if (successMessage) {
      setSuccess(decodeURIComponent(successMessage));
      // Clear URL params
      window.history.replaceState({}, "", "/settings");
    }

    if (errorMessage) {
      setError(decodeURIComponent(errorMessage));
      // Clear URL params
      window.history.replaceState({}, "", "/settings");
    }

    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (!user) {
          router.replace("/login");
          return;
        }

        setUserEmail(user.email ?? null);
        setPersona(user.user_metadata?.persona ?? null);
        fetchProviders();
      })
      .catch(() => {
        router.replace("/login");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [router, searchParams, fetchProviders]);

  const handleLinkProvider = async (provider: Provider) => {
    setError(null);
    setSuccess(null);
    setLinkingProvider(provider);

    const supabase = createClient();
    const { error: linkError } = await supabase.auth.linkIdentity({
      provider,
      options: {
        redirectTo: `${window.location.origin}/callback?link=true`,
      },
    });

    if (linkError) {
      setError(
        `Failed to link ${getProviderName(provider)}: ${linkError.message}`,
      );
      setLinkingProvider(null);
    }
    // Note: If successful, user will be redirected to OAuth flow
  };

  const handleUnlinkProvider = async () => {
    if (!unlinkingProvider) return;

    setError(null);
    setSuccess(null);

    const connectedCount = providers.filter((p) => p.connected).length;
    if (connectedCount <= 1) {
      setError("You must have at least one connected account");
      setShowUnlinkDialog(false);
      setUnlinkingProvider(null);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Please sign in again");
      setShowUnlinkDialog(false);
      setUnlinkingProvider(null);
      return;
    }

    // Find the identity to unlink
    const identity = user.identities?.find(
      (id: { provider: string }) => id.provider === unlinkingProvider,
    );

    if (!identity) {
      setError("Provider not found");
      setShowUnlinkDialog(false);
      setUnlinkingProvider(null);
      return;
    }

    const { error: unlinkError } = await supabase.auth.unlinkIdentity(identity);

    if (unlinkError) {
      setError(
        `Failed to unlink ${getProviderName(unlinkingProvider)}: ${unlinkError.message}`,
      );
    } else {
      setSuccess(`${getProviderName(unlinkingProvider)} has been disconnected`);
      await fetchProviders();
    }

    setShowUnlinkDialog(false);
    setUnlinkingProvider(null);
  };

  const handleGithubSync = async () => {
    setIsGithubSyncing(true);
    setError(null);

    try {
      const response = await fetch("/api/github/sync", {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || "Failed to sync GitHub profile");
        return;
      }

      setSuccess("GitHub profile synced successfully!");
      await fetchGithubSyncStatus();
    } catch (err) {
      setError("Failed to sync GitHub profile. Please try again.");
    } finally {
      setIsGithubSyncing(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const getProviderName = (provider: Provider): string => {
    switch (provider) {
      case "google":
        return "Google";
      case "github":
        return "GitHub";
      case "linkedin_oidc":
        return "LinkedIn";
      default:
        return provider;
    }
  };

  const getProviderIcon = (provider: Provider) => {
    switch (provider) {
      case "google":
        return <GoogleIcon className="h-5 w-5" />;
      case "github":
        return <Github className="h-5 w-5" />;
      case "linkedin_oidc":
        return <Linkedin className="h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const connectedCount = providers.filter((p) => p.connected).length;
  const githubConnected = providers.find(
    (p) => p.provider === "github",
  )?.connected;

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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your account preferences
        </p>
      </div>

      {/* Error/Success Messages */}
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

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{userEmail}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Account type</p>
            <p className="font-medium capitalize">
              {persona === "developer"
                ? "Developer"
                : persona === "project_owner"
                  ? "Project Owner"
                  : "Not set"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Connected Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>
            Link multiple providers to access all features. You need at least
            one connected account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {providers.map((providerData) => (
            <div
              key={providerData.provider}
              className="flex items-center justify-between rounded-lg border border-border p-4"
            >
              <div className="flex items-center gap-3">
                {getProviderIcon(providerData.provider)}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {getProviderName(providerData.provider)}
                    </p>
                    {providerData.isPrimary && (
                      <Badge variant="secondary" className="text-xs">
                        Primary
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {providerData.connected ? "Connected" : "Not connected"}
                  </p>
                </div>
              </div>

              {providerData.connected ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUnlinkingProvider(providerData.provider);
                    setShowUnlinkDialog(true);
                  }}
                  disabled={connectedCount <= 1}
                >
                  <X className="mr-2 h-4 w-4" />
                  Disconnect
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLinkProvider(providerData.provider)}
                  disabled={linkingProvider !== null}
                >
                  {linkingProvider === providerData.provider ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Connect
                    </>
                  )}
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* GitHub Sync */}
      {githubConnected && (
        <Card>
          <CardHeader>
            <CardTitle>GitHub Profile Sync</CardTitle>
            <CardDescription>
              Automatically enrich your profile with data from your GitHub
              account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {githubSyncStatus?.synced && (
              <div className="text-sm">
                <p className="text-muted-foreground">
                  Last synced:{" "}
                  {githubSyncStatus.lastSyncedAt
                    ? new Date(githubSyncStatus.lastSyncedAt).toLocaleString()
                    : "Never"}
                </p>
                <p className="text-muted-foreground">
                  Status:{" "}
                  <span className="capitalize">
                    {githubSyncStatus.syncStatus}
                  </span>
                </p>
              </div>
            )}

            <Button
              variant="outline"
              onClick={handleGithubSync}
              disabled={isGithubSyncing}
            >
              {isGithubSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync GitHub Profile
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>View and edit your profile details</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/profile">Go to Profile</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible account actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Sign out</p>
              <p className="text-sm text-muted-foreground">
                Sign out of your account on this device
              </p>
            </div>
            <Button variant="destructive" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Unlink Confirmation Dialog */}
      <AlertDialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Disconnect{" "}
              {unlinkingProvider && getProviderName(unlinkingProvider)}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove{" "}
              {unlinkingProvider && getProviderName(unlinkingProvider)} from
              your connected accounts. You can reconnect it later if needed.
              {unlinkingProvider === "github" && (
                <span className="block mt-2 text-yellow-600 dark:text-yellow-500">
                  Note: Disconnecting GitHub will prevent automatic profile
                  syncing.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUnlinkingProvider(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlinkProvider}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
