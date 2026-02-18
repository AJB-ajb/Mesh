"use client";

import { useState } from "react";
import { Check, X, UserMinus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useConnections } from "@/lib/hooks/use-connections";

export function ConnectionList({ currentUserId }: { currentUserId: string }) {
  const { connections, isLoading, mutate } = useConnections();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const accepted = connections.filter((f) => f.status === "accepted");
  const pendingIncoming = connections.filter(
    (f) => f.status === "pending" && f.friend_id === currentUserId,
  );
  const pendingSent = connections.filter(
    (f) => f.status === "pending" && f.user_id === currentUserId,
  );

  async function handleAction(id: string, action: "accepted" | "declined") {
    setLoadingId(id);
    try {
      await fetch(`/api/friendships/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      await mutate();
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(id: string) {
    setLoadingId(id);
    try {
      await fetch(`/api/friendships/${id}`, { method: "DELETE" });
      await mutate();
    } finally {
      setLoadingId(null);
    }
  }

  /** Resolve the "other person" display name from a connection row. */
  function otherName(f: (typeof connections)[number]) {
    if (f.user_id === currentUserId) {
      return f.friend?.full_name ?? "Unknown";
    }
    return f.user?.full_name ?? "Unknown";
  }

  function otherHeadline(f: (typeof connections)[number]) {
    if (f.user_id === currentUserId) {
      return f.friend?.headline ?? null;
    }
    return f.user?.headline ?? null;
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg border border-border bg-muted/30"
          />
        ))}
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">No connections yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending incoming requests */}
      {pendingIncoming.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Pending Requests
          </h3>
          <div className="space-y-2">
            {pendingIncoming.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-primary/20 bg-primary/5 p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{otherName(f)}</p>
                  {otherHeadline(f) && (
                    <p className="text-sm text-muted-foreground truncate">
                      {otherHeadline(f)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loadingId === f.id}
                    onClick={() => handleAction(f.id, "accepted")}
                  >
                    <Check className="h-4 w-4" />
                    Accept
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={loadingId === f.id}
                    onClick={() => handleAction(f.id, "declined")}
                  >
                    <X className="h-4 w-4" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pending sent requests */}
      {pendingSent.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Sent Requests
          </h3>
          <div className="space-y-2">
            {pendingSent.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-border p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{otherName(f)}</p>
                  {otherHeadline(f) && (
                    <p className="text-sm text-muted-foreground truncate">
                      {otherHeadline(f)}
                    </p>
                  )}
                </div>
                <Badge variant="secondary">Pending</Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Accepted connections */}
      {accepted.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Connections ({accepted.length})
          </h3>
          <div className="space-y-2">
            {accepted.map((f) => (
              <div
                key={f.id}
                className={cn(
                  "group flex items-center justify-between gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50",
                )}
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{otherName(f)}</p>
                  {otherHeadline(f) && (
                    <p className="text-sm text-muted-foreground truncate">
                      {otherHeadline(f)}
                    </p>
                  )}
                </div>
                {f.user_id === currentUserId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                    disabled={loadingId === f.id}
                    onClick={() => handleDelete(f.id)}
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
