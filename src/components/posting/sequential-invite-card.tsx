"use client";

import { useState, useCallback, useEffect } from "react";
import { Loader2, ListOrdered, XCircle, Info, UserPlus } from "lucide-react";

import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { NumberPicker } from "@/components/ui/number-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSequentialInviteForPosting } from "@/lib/hooks/use-sequential-invites";
import { SequentialInviteStatus } from "./sequential-invite-status";
import { InvitePickerSheet } from "./invite-picker-sheet";

type ConnectionItem = {
  user_id: string;
  full_name: string;
};

type InviteMode = "sequential" | "parallel";

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
  const [inviteMode, setInviteMode] = useState<InviteMode>("sequential");
  const [concurrentInvites, setConcurrentInvites] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [connectionNames, setConnectionNames] = useState<
    Record<string, string>
  >({});

  // Resolve connection names when we have an active sequential invite.
  // Use the stringified friend list as dependency (stable across SWR polls)
  // to avoid re-fetching on every revalidation cycle.
  const friendListKey = sequentialInvite?.ordered_friend_list.join(",") ?? "";

  useEffect(() => {
    if (!sequentialInvite || friendListKey === "") return;

    const ids = sequentialInvite.ordered_friend_list;
    // Only fetch names for IDs we don't already have
    const missingIds = ids.filter((id) => !connectionNames[id]);
    if (missingIds.length === 0) return;

    let cancelled = false;

    const fetchNames = async () => {
      try {
        const res = await fetch("/api/profiles/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_ids: missingIds }),
        });

        if (!res.ok) return;

        const { profiles } = await res.json();
        if (cancelled) return;

        setConnectionNames((prev) => {
          const next = { ...prev };
          for (const p of profiles) {
            next[p.user_id] = p.full_name || p.user_id.slice(0, 8);
          }
          return next;
        });
      } catch {
        // Silently fail — SequentialInviteStatus will use truncated IDs
      }
    };

    fetchNames();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendListKey]);

  const handleCreate = useCallback(async () => {
    if (selectedConnections.length === 0) return;

    setIsCreating(true);
    setError(null);

    try {
      // 1. Create the invite
      const createRes = await fetch("/api/friend-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posting_id: postingId,
          ordered_friend_list: selectedConnections.map((c) => c.user_id),
          invite_mode: inviteMode,
          concurrent_invites:
            inviteMode === "sequential" ? concurrentInvites : undefined,
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

      // Seed connectionNames from the selected connections so names are
      // visible immediately when the UI switches to the active-invite view,
      // avoiding a flash of raw UUIDs while the batch profile fetch runs.
      const seeded: Record<string, string> = {};
      for (const c of selectedConnections) {
        seeded[c.user_id] = c.full_name;
      }
      setConnectionNames(seeded);

      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsCreating(false);
    }
  }, [selectedConnections, postingId, inviteMode, concurrentInvites, mutate]);

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
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Active invite (pending/accepted) — show status and cancel button
  if (
    sequentialInvite &&
    (sequentialInvite.status === "pending" ||
      sequentialInvite.status === "accepted")
  ) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListOrdered className="size-5" />
            {labels.invite.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <SequentialInviteStatus
            friendAsk={sequentialInvite}
            connectionNames={connectionNames}
          />

          <div className="flex gap-2">
            {sequentialInvite.status === "pending" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <XCircle className="size-4" />
                )}
                {labels.invite.cancelInvite}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // No active invite (or cancelled/completed) — show creation UI
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ListOrdered className="size-5" />
          {labels.invite.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Previous invite summary for cancelled/completed */}
        {sequentialInvite && (
          <div className="rounded-md border border-muted bg-muted/30 px-3 py-2">
            <SequentialInviteStatus
              friendAsk={sequentialInvite}
              connectionNames={connectionNames}
            />
          </div>
        )}

        {/* Invite mode toggle with info popover */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <label className="text-sm font-medium">
              {labels.invite.modeLabel}
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                  aria-label={labels.invite.modeInfoLabel}
                >
                  <Info className="size-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 text-sm" side="top">
                <p className="font-medium">{labels.invite.modeSequential}</p>
                <p className="mt-1 text-muted-foreground">
                  {labels.invite.modeSequentialHelp}
                </p>
                <p className="mt-3 font-medium">{labels.invite.modeParallel}</p>
                <p className="mt-1 text-muted-foreground">
                  {labels.invite.modeParallelHelp}
                </p>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex rounded-lg border border-input overflow-hidden">
            {(["sequential", "parallel"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setInviteMode(mode)}
                className={cn(
                  "flex-1 px-3 py-2 text-sm font-medium transition-colors",
                  inviteMode === mode
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted",
                )}
              >
                {mode === "sequential"
                  ? labels.invite.modeSequential
                  : labels.invite.modeParallel}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced settings (concurrent invites) — progressive disclosure */}
        {inviteMode === "sequential" && (
          <details>
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
              {labels.invite.advancedSettings}
            </summary>
            <div className="mt-2 space-y-2">
              <label className="text-sm font-medium">
                {labels.invite.concurrentLabel}
              </label>
              <NumberPicker
                value={concurrentInvites}
                onChange={setConcurrentInvites}
                min={1}
                max={Math.max(1, selectedConnections.length)}
                label={labels.invite.concurrentLabel}
              />
              <p className="text-xs text-muted-foreground">
                {labels.invite.concurrentHelp}
              </p>
            </div>
          </details>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Selected people summary + add button */}
        {selectedConnections.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {selectedConnections.map((c) => (
              <span
                key={c.user_id}
                className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium"
              >
                {c.full_name}
              </span>
            ))}
          </div>
        )}

        <Button variant="outline" size="sm" onClick={() => setShowPicker(true)}>
          <UserPlus className="size-4" />
          {selectedConnections.length > 0
            ? labels.invite.pickerInviteMore
            : labels.invite.pickerTitle}
        </Button>

        {selectedConnections.length > 0 && (
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {labels.invite.starting}
              </>
            ) : (
              labels.invite.startButton
            )}
          </Button>
        )}

        <InvitePickerSheet
          open={showPicker}
          onOpenChange={setShowPicker}
          selectedConnections={selectedConnections}
          onChange={setSelectedConnections}
          currentUserId={currentUserId}
          inviteMode={inviteMode}
        />
      </CardContent>
    </Card>
  );
}
