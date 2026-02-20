"use client";

import { useState } from "react";
import { Search, UserPlus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { getInitials } from "@/lib/format";
import { useProfileSearch } from "@/lib/hooks/use-profile-search";

type AddConnectionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnectionSent?: () => void;
};

export function AddConnectionDialog({
  open,
  onOpenChange,
  onConnectionSent,
}: AddConnectionDialogProps) {
  const [query, setQuery] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const { results, isLoading } = useProfileSearch(query);

  async function handleConnect(userId: string) {
    setSendingId(userId);
    try {
      const res = await fetch("/api/friendships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friend_id: userId }),
      });
      if (res.ok || res.status === 409) {
        setSentIds((prev) => new Set(prev).add(userId));
        onConnectionSent?.();
      }
    } finally {
      setSendingId(null);
    }
  }

  function statusLabel(
    status: string,
    userId: string,
  ): { label: string; disabled: boolean } {
    if (sentIds.has(userId) || status === "pending_sent") {
      return { label: labels.connectionsPage.requestSent, disabled: true };
    }
    if (status === "accepted") {
      return { label: labels.connectionAction.connected, disabled: true };
    }
    if (status === "pending_incoming") {
      return { label: labels.connectionAction.accept, disabled: false };
    }
    return { label: labels.connectionsPage.connectButton, disabled: false };
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{labels.connectionsPage.addConnectionTitle}</DialogTitle>
          <DialogDescription>
            {labels.connectionsPage.addConnectionSubtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.connectionsPage.searchPeoplePlaceholder}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="mt-2 min-h-[120px]">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && query.trim().length >= 2 && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <p className="text-sm">{labels.connectionsPage.noResults}</p>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <div className="space-y-2">
              {results.map((profile) => {
                const { label, disabled } = statusLabel(
                  profile.connectionStatus,
                  profile.user_id,
                );
                const isSending = sendingId === profile.user_id;
                return (
                  <div
                    key={profile.user_id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium",
                      )}
                    >
                      {getInitials(profile.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {profile.full_name || labels.common.unknown}
                      </p>
                      {profile.headline && (
                        <p className="text-xs text-muted-foreground truncate">
                          {profile.headline}
                        </p>
                      )}
                    </div>
                    {disabled ? (
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {label}
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        disabled={isSending}
                        onClick={() => handleConnect(profile.user_id)}
                      >
                        {isSending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <UserPlus className="h-3 w-3" />
                        )}
                        {label}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
