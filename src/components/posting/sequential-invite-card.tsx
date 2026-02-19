"use client";

import { useState, useCallback, useEffect } from "react";
import { Loader2, ListOrdered, XCircle } from "lucide-react";

import { labels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSequentialInviteForPosting } from "@/lib/hooks/use-sequential-invites";
import { SequentialInviteSelector } from "./sequential-invite-selector";
import { SequentialInviteStatus } from "./sequential-invite-status";

type ConnectionItem = {
  user_id: string;
  full_name: string;
};

interface SequentialInviteCardProps {
  postingId: string;
  currentUserId: string;
}

export function SequentialInviteCard({
  postingId,
  currentUserId,
}: SequentialInviteCardProps) {
  const { sequentialInvite, isLoading, mutate } =
    useSequentialInviteForPosting(postingId);
  const [selectedConnections, setSelectedConnections] = useState<
    ConnectionItem[]
  >([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionNames, setConnectionNames] = useState<
    Record<string, string>
  >({});

  // Resolve connection names when we have an active sequential invite
  useEffect(() => {
    if (!sequentialInvite) return;

    const ids = sequentialInvite.ordered_friend_list;
    if (ids.length === 0) return;

    let cancelled = false;

    const fetchNames = async () => {
      try {
        const res = await fetch("/api/profiles/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_ids: ids }),
        });

        if (!res.ok) return;

        const { profiles } = await res.json();
        if (cancelled) return;

        const names: Record<string, string> = {};
        for (const p of profiles) {
          names[p.user_id] = p.full_name || p.user_id.slice(0, 8);
        }
        setConnectionNames(names);
      } catch {
        // Silently fail — SequentialInviteStatus will use truncated IDs
      }
    };

    fetchNames();
    return () => {
      cancelled = true;
    };
  }, [sequentialInvite]);

  const handleCreate = useCallback(async () => {
    if (selectedConnections.length === 0) return;

    setIsCreating(true);
    setError(null);

    try {
      // 1. Create the sequential invite
      const createRes = await fetch("/api/friend-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posting_id: postingId,
          ordered_friend_list: selectedConnections.map((c) => c.user_id),
        }),
      });

      if (!createRes.ok) {
        const data = await createRes.json();
        throw new Error(data.error?.message || "Failed to create invite");
      }

      const { friend_ask } = await createRes.json();

      // 2. Send the first invite
      const sendRes = await fetch(`/api/friend-ask/${friend_ask.id}/send`, {
        method: "POST",
      });

      if (!sendRes.ok) {
        const data = await sendRes.json();
        throw new Error(data.error?.message || "Failed to send first invite");
      }

      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsCreating(false);
    }
  }, [selectedConnections, postingId, mutate]);

  const handleCancel = useCallback(async () => {
    if (!sequentialInvite) return;

    setIsCancelling(true);
    setError(null);

    try {
      const res = await fetch(`/api/friend-ask/${sequentialInvite.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Failed to cancel");
      }

      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsCancelling(false);
    }
  }, [sequentialInvite, mutate]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Active or completed sequential invite — show status
  if (sequentialInvite) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListOrdered className="h-5 w-5" />
            {labels.sequentialInvite.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <SequentialInviteStatus
            friendAsk={sequentialInvite}
            connectionNames={connectionNames}
          />

          {sequentialInvite.status === "pending" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {labels.sequentialInvite.cancelInvite}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // No sequential invite yet — show creation UI
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ListOrdered className="h-5 w-5" />
          {labels.sequentialInvite.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {labels.sequentialInvite.description}
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <SequentialInviteSelector
          currentUserId={currentUserId}
          selectedConnections={selectedConnections}
          onChange={setSelectedConnections}
        />

        {selectedConnections.length > 0 && (
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {labels.sequentialInvite.starting}
              </>
            ) : (
              labels.sequentialInvite.startButton
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
