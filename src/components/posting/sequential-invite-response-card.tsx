"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, X, Loader2, ListOrdered } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface SequentialInviteResponseCardProps {
  postingId: string;
  currentUserId: string;
}

type InviteState =
  | { type: "loading" }
  | { type: "not_invited" }
  | { type: "pending"; friendAskId: string }
  | { type: "accepted" }
  | { type: "declined" };

export function SequentialInviteResponseCard({
  postingId,
  currentUserId,
}: SequentialInviteResponseCardProps) {
  const [state, setState] = useState<InviteState>({ type: "loading" });
  const [isResponding, setIsResponding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if the current user has a pending invite for this posting
  useEffect(() => {
    let cancelled = false;

    const checkInvite = async () => {
      const supabase = createClient();

      // Look for a pending friend_ask where the user is the current invitee
      const { data: friendAsks } = await supabase
        .from("friend_asks")
        .select(
          "id, ordered_friend_list, current_request_index, status, invite_mode, declined_list",
        )
        .eq("posting_id", postingId)
        .in("status", ["pending", "accepted"]);

      if (cancelled) return;

      if (!friendAsks || friendAsks.length === 0) {
        setState({ type: "not_invited" });
        return;
      }

      // Check each friend_ask for user's status
      for (const fa of friendAsks) {
        const inviteMode = fa.invite_mode ?? "sequential";
        const declinedList: string[] = fa.declined_list ?? [];

        if (inviteMode === "parallel") {
          // Parallel: user is invited if in the list
          if (!fa.ordered_friend_list.includes(currentUserId)) continue;

          // Accepted?
          if (
            fa.status === "accepted" &&
            fa.ordered_friend_list[fa.current_request_index] === currentUserId
          ) {
            setState({ type: "accepted" });
            return;
          }

          // Declined?
          if (declinedList.includes(currentUserId)) {
            setState({ type: "declined" });
            return;
          }

          // Still pending and user hasn't responded?
          if (fa.status === "pending") {
            setState({ type: "pending", friendAskId: fa.id });
            return;
          }
        } else {
          // Sequential: user is the current invitee
          if (
            fa.status === "pending" &&
            fa.ordered_friend_list[fa.current_request_index] === currentUserId
          ) {
            setState({ type: "pending", friendAskId: fa.id });
            return;
          }

          // User accepted
          if (
            fa.status === "accepted" &&
            fa.ordered_friend_list[fa.current_request_index] === currentUserId
          ) {
            setState({ type: "accepted" });
            return;
          }

          // User was previously asked (earlier index) — they declined
          if (
            fa.ordered_friend_list
              .slice(0, fa.current_request_index)
              .includes(currentUserId)
          ) {
            setState({ type: "declined" });
            return;
          }
        }
      }

      setState({ type: "not_invited" });
    };

    checkInvite();
    return () => {
      cancelled = true;
    };
  }, [postingId, currentUserId]);

  const handleRespond = useCallback(
    async (action: "accept" | "decline") => {
      if (state.type !== "pending") return;

      setIsResponding(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/friend-ask/${state.friendAskId}/respond`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          },
        );

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error?.message || "Failed to respond");
        }

        setState({ type: action === "accept" ? "accepted" : "declined" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsResponding(false);
      }
    },
    [state],
  );

  if (state.type === "loading") {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (state.type === "not_invited") {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ListOrdered className="h-4 w-4" />
            This posting uses Sequential Invite — the poster will invite
            connections directly.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state.type === "accepted") {
    return (
      <Card className="border-green-200 dark:border-green-800">
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
            <Check className="h-4 w-4" />
            You joined this posting!
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state.type === "declined") {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <X className="h-4 w-4" />
            You declined this invite.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Pending invite — show response UI
  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListOrdered className="h-5 w-5 text-blue-600" />
          You&apos;ve been invited!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          The posting creator has invited you to join. Would you like to accept?
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button
            onClick={() => handleRespond("accept")}
            disabled={isResponding}
          >
            {isResponding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Join
          </Button>
          <Button
            variant="outline"
            onClick={() => handleRespond("decline")}
            disabled={isResponding}
          >
            Do not join
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
