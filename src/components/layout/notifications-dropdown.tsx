"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  FolderKanban,
  MessageSquare,
  ListOrdered,
  Users,
  Check,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { useNotifications } from "@/lib/hooks/use-notifications";
import type { Notification } from "@/lib/supabase/realtime";

// ---------------------------------------------------------------------------
// Helpers (reused from notifications-list.tsx)
// ---------------------------------------------------------------------------

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "application_received":
    case "application_accepted":
    case "application_rejected":
      return <FolderKanban className="h-4 w-4" />;
    case "new_message":
      return <MessageSquare className="h-4 w-4" />;
    case "sequential_invite":
      return <ListOrdered className="h-4 w-4" />;
    case "friend_request":
      return <Users className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

function getIconColor(type: string) {
  switch (type) {
    case "application_accepted":
      return "bg-green-100 text-green-600 dark:bg-green-900/30";
    case "application_rejected":
      return "bg-red-100 text-red-600 dark:bg-red-900/30";
    case "sequential_invite":
      return "bg-blue-100 text-blue-600 dark:bg-blue-900/30";
    case "friend_request":
      return "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function isActionableInvite(notification: Notification) {
  return (
    notification.type === "sequential_invite" &&
    notification.title === "Sequential Invite Received" &&
    notification.related_posting_id
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationsDropdown() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { unreadCount, notifications, markAsRead, markAllAsRead } =
    useNotifications();

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      if (!notification.read) {
        markAsRead(notification.id);
      }
      if (notification.type === "friend_request") {
        router.push("/connections");
      } else if (notification.related_posting_id) {
        router.push(`/postings/${notification.related_posting_id}`);
      }
      setOpen(false);
    },
    [markAsRead, router],
  );

  const handleInviteResponse = useCallback(
    async (notification: Notification, action: "accept" | "decline") => {
      if (!notification.related_posting_id) return;
      setRespondingTo(notification.id);

      try {
        const response = await fetch("/api/sequential-invite/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postingId: notification.related_posting_id,
            action,
          }),
        });

        if (response.ok) {
          markAsRead(notification.id);
        }
      } finally {
        setRespondingTo(null);
      }
    },
    [markAsRead],
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-5 w-5" />
        <span className="sr-only">{labels.nav.notifications}</span>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-medium text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 origin-top-right rounded-md border border-border bg-popover shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold">
              {labels.notification.dropdownTitle}
            </h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-xs"
                onClick={() => markAllAsRead()}
              >
                <CheckCheck className="mr-1 h-3 w-3" />
                {labels.notification.markAllRead}
              </Button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 opacity-50" />
                <p className="mt-2 text-sm">{labels.notification.empty}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => {
                  const isResponding = respondingTo === notification.id;
                  const showInviteActions = isActionableInvite(notification);

                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 cursor-pointer",
                        !notification.read && "bg-primary/5",
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          getIconColor(notification.type),
                        )}
                      >
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "text-sm leading-tight",
                              !notification.read && "font-medium",
                            )}
                          >
                            {notification.title}
                          </p>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatDate(notification.created_at)}
                          </span>
                        </div>
                        {notification.body && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                            {notification.body}
                          </p>
                        )}
                        {showInviteActions && (
                          <div
                            className="mt-2 flex gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              disabled={isResponding}
                              onClick={() =>
                                handleInviteResponse(notification, "accept")
                              }
                            >
                              {isResponding ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                              {labels.inbox.joinAction}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={isResponding}
                              onClick={() =>
                                handleInviteResponse(notification, "decline")
                              }
                            >
                              {labels.inbox.doNotJoinAction}
                            </Button>
                          </div>
                        )}
                      </div>
                      {!notification.read && (
                        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border px-4 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  router.push("/connections");
                  setOpen(false);
                }}
              >
                {labels.notification.viewAll}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
