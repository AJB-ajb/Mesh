"use client";

import { useState } from "react";
import { Search, Check, X, QrCode, Share2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { OnlineStatusBadge } from "@/components/ui/online-status";
import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { getInitials } from "@/lib/format";
import { usePresenceContext } from "@/components/providers/presence-provider";
import type { MergedConnection } from "@/lib/hooks/use-connections-page";

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return "1d";
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

type PendingConnection = {
  friendshipId: string;
  otherUser: { user_id: string; full_name: string | null; headline: string | null };
};

type ConnectionsLeftPanelProps = {
  connections: MergedConnection[];
  pendingIncoming: PendingConnection[];
  selectedUserId: string | null;
  currentUserId: string | null;
  onSelect: (userId: string) => void;
  onAccept: (friendshipId: string) => Promise<void>;
  onDecline: (friendshipId: string) => Promise<void>;
  onAddConnection: () => void;
  onQrCode: () => void;
  onShareLink: () => void;
};

export function ConnectionsLeftPanel({
  connections,
  pendingIncoming,
  selectedUserId,
  currentUserId,
  onSelect,
  onAccept,
  onDecline,
  onAddConnection,
  onQrCode,
  onShareLink,
}: ConnectionsLeftPanelProps) {
  const { isUserOnline } = usePresenceContext();
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filtered = connections.filter((c) =>
    (c.otherUser.full_name ?? "")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  async function handleAccept(friendshipId: string) {
    setLoadingId(friendshipId);
    try {
      await onAccept(friendshipId);
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDecline(friendshipId: string) {
    setLoadingId(friendshipId);
    try {
      await onDecline(friendshipId);
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="flex flex-col h-full border-r border-border">
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={labels.connectionsPage.searchPlaceholder}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">
        {/* Pending requests section */}
        {pendingIncoming.length > 0 && (
          <section className="border-b border-border">
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {labels.connectionsPage.pendingRequestsTitle} ({pendingIncoming.length})
              </p>
            </div>
            {pendingIncoming.map((p) => (
              <div
                key={p.friendshipId}
                className="flex items-center gap-3 px-3 py-2 border-b border-border/50 last:border-b-0"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium shrink-0">
                  {getInitials(p.otherUser.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {p.otherUser.full_name || labels.common.unknown}
                  </p>
                  {p.otherUser.headline && (
                    <p className="text-xs text-muted-foreground truncate">
                      {p.otherUser.headline}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    disabled={loadingId === p.friendshipId}
                    onClick={() => handleAccept(p.friendshipId)}
                    title={labels.joinRequest.action.accept}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={loadingId === p.friendshipId}
                    onClick={() => handleDecline(p.friendshipId)}
                    title={labels.joinRequest.action.decline}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Connections list */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <p className="text-sm text-muted-foreground">
              {search
                ? labels.connectionsPage.noResults
                : labels.connectionsPage.noConnections}
            </p>
            {!search && (
              <p className="text-xs text-muted-foreground mt-1">
                {labels.connectionsPage.noConnectionsHint}
              </p>
            )}
          </div>
        ) : (
          filtered.map((conn) => {
            const isSelected = selectedUserId === conn.otherUser.user_id;
            const isOnline = isUserOnline(conn.otherUser.user_id);

            return (
              <button
                key={conn.friendshipId}
                onClick={() => onSelect(conn.otherUser.user_id)}
                className={cn(
                  "w-full flex items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50 border-b border-border/50 last:border-b-0",
                  isSelected && "bg-muted",
                  conn.unreadCount > 0 && !isSelected && "bg-primary/5",
                )}
              >
                <OnlineStatusBadge isOnline={isOnline}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium shrink-0">
                    {getInitials(conn.otherUser.full_name)}
                  </div>
                </OnlineStatusBadge>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-sm font-medium truncate">
                      {conn.otherUser.full_name || labels.common.unknown}
                    </p>
                    {conn.lastMessage && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatRelativeTime(conn.lastMessage.created_at)}
                      </span>
                    )}
                  </div>
                  {conn.lastMessage ? (
                    <p className="text-xs text-muted-foreground truncate">
                      {conn.lastMessage.sender_id === currentUserId
                        ? labels.chat.youPrefix
                        : ""}
                      {conn.lastMessage.content}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground truncate">
                      {conn.otherUser.headline || ""}
                    </p>
                  )}
                </div>
                {conn.unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="h-5 min-w-5 px-1.5 shrink-0"
                  >
                    {conn.unreadCount}
                  </Badge>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Action buttons at bottom */}
      <div className="p-3 border-t border-border flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onAddConnection}
        >
          <UserPlus className="h-3 w-3" />
          {labels.connectionsPage.addConnection}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onQrCode}
          title={labels.connectionsPage.qrCode}
        >
          <QrCode className="h-3 w-3" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onShareLink}
          title={labels.connectionsPage.shareLink}
        >
          <Share2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
