"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { labels } from "@/lib/labels";
import type { GithubSyncStatus } from "@/lib/hooks/use-settings";

type GithubSyncCardProps = {
  githubSyncStatus: GithubSyncStatus | null;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
  onMutateGithubSync: () => Promise<unknown>;
};

export function GithubSyncCard({
  githubSyncStatus,
  onError,
  onSuccess,
  onMutateGithubSync,
}: GithubSyncCardProps) {
  const [isGithubSyncing, setIsGithubSyncing] = useState(false);

  const handleGithubSync = async () => {
    setIsGithubSyncing(true);
    onError("");

    try {
      const response = await fetch("/api/github/sync", {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        onError(errorData.message || "Failed to sync GitHub profile");
        return;
      }

      onSuccess("GitHub profile synced successfully!");
      await onMutateGithubSync();
    } catch {
      onError("Failed to sync GitHub profile. Please try again.");
    } finally {
      setIsGithubSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.settings.githubSyncTitle}</CardTitle>
        <CardDescription>
          {labels.settings.githubSyncDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {githubSyncStatus?.synced && (
          <div className="text-sm">
            <p className="text-muted-foreground">
              {labels.settings.lastSyncedLabel}{" "}
              {githubSyncStatus.lastSyncedAt
                ? new Date(githubSyncStatus.lastSyncedAt).toLocaleString()
                : "Never"}
            </p>
            <p className="text-muted-foreground">
              {labels.settings.statusLabel}{" "}
              <span className="capitalize">{githubSyncStatus.syncStatus}</span>
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
              {labels.github.syncingButton}
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              {labels.settings.syncGithubButton}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
