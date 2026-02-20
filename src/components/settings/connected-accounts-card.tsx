"use client";

import { useState } from "react";
import { X, Github, Linkedin, Loader2, Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { labels } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon } from "@/components/icons/auth-icons";
import type { Provider } from "@/lib/hooks/use-settings";

type ProviderData = {
  provider: Provider;
  connected: boolean;
  isPrimary: boolean;
};

type ConnectedAccountsCardProps = {
  providers: ProviderData[];
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
  onMutate: () => Promise<unknown>;
};

const getProviderName = (provider: Provider): string =>
  labels.settings.providerNames[provider] ?? provider;

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

export function ConnectedAccountsCard({
  providers,
  onError,
  onSuccess,
  onMutate,
}: ConnectedAccountsCardProps) {
  const [linkingProvider, setLinkingProvider] = useState<Provider | null>(null);
  const [unlinkingProvider, setUnlinkingProvider] = useState<Provider | null>(
    null,
  );
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);

  const connectedCount = providers.filter((p) => p.connected).length;

  const handleLinkProvider = async (provider: Provider) => {
    onError("");
    onSuccess("");
    setLinkingProvider(provider);

    const supabase = createClient();
    const { error: linkError } = await supabase.auth.linkIdentity({
      provider,
      options: {
        redirectTo: `${window.location.origin}/callback?link=true`,
      },
    });

    if (linkError) {
      onError(
        `Failed to link ${getProviderName(provider)}: ${linkError.message}`,
      );
      setLinkingProvider(null);
    }
  };

  const handleUnlinkProvider = async () => {
    if (!unlinkingProvider) return;

    if (connectedCount <= 1) {
      onError("You must have at least one connected account");
      setShowUnlinkDialog(false);
      setUnlinkingProvider(null);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      onError("Please sign in again");
      setShowUnlinkDialog(false);
      setUnlinkingProvider(null);
      return;
    }

    const identity = user.identities?.find(
      (id: { provider: string }) => id.provider === unlinkingProvider,
    );

    if (!identity) {
      onError("Provider not found");
      setShowUnlinkDialog(false);
      setUnlinkingProvider(null);
      return;
    }

    const { error: unlinkError } = await supabase.auth.unlinkIdentity(identity);

    if (unlinkError) {
      onError(
        `Failed to unlink ${getProviderName(unlinkingProvider)}: ${unlinkError.message}`,
      );
    } else {
      onSuccess(`${getProviderName(unlinkingProvider)} has been disconnected`);
      await onMutate();
    }

    setShowUnlinkDialog(false);
    setUnlinkingProvider(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{labels.settings.connectedAccountsTitle}</CardTitle>
          <CardDescription>
            {labels.settings.connectedAccountsDescription}
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
                        {labels.common.primary}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {providerData.connected
                      ? labels.common.connected
                      : labels.common.notConnected}
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
                  {labels.common.disconnect}
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
                      {labels.common.connecting}
                    </>
                  ) : (
                    <>
                      <Link2 className="mr-2 h-4 w-4" />
                      {labels.common.connect}
                    </>
                  )}
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Unlink Confirmation Dialog */}
      <AlertDialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {unlinkingProvider &&
                labels.settings.disconnectDialogTitle(
                  getProviderName(unlinkingProvider),
                )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {unlinkingProvider &&
                labels.settings.disconnectDialogDescription(
                  getProviderName(unlinkingProvider),
                )}
              {unlinkingProvider === "github" && (
                <span className="block mt-2 text-yellow-600 dark:text-yellow-500">
                  {labels.settings.disconnectGithubNote}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUnlinkingProvider(null)}>
              {labels.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlinkProvider}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {labels.common.disconnect}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
