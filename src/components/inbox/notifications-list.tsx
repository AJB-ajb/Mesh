"use client";

import {
  Inbox,
  Bell,
  MessageSquare,
  Trash2,
  Check,
  CheckCheck,
  FolderKanban,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/supabase/realtime";

const formatDate = (dateString: string) => {
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
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "application_received":
    case "application_accepted":
    case "application_rejected":
      return <FolderKanban className="h-4 w-4" />;
    case "new_message":
      return <MessageSquare className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

type NotificationsListProps = {
  notifications: Notification[];
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (notificationId: string) => void;
  onClick: (notification: Notification) => void;
};

export function NotificationsList({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClick,
}: NotificationsListProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-4">
      {/* Actions */}
      {notifications.length > 0 && unreadCount > 0 && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onMarkAllAsRead}>
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        </div>
      )}

      {/* Notifications list */}
      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Inbox className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">No notifications yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                "group flex items-start gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50",
                !notification.read && "bg-primary/5 border-primary/20",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full shrink-0 cursor-pointer",
                  notification.type === "application_accepted"
                    ? "bg-green-100 text-green-600 dark:bg-green-900/30"
                    : notification.type === "application_rejected"
                      ? "bg-red-100 text-red-600 dark:bg-red-900/30"
                      : "bg-muted text-muted-foreground",
                )}
                onClick={() => onClick(notification)}
              >
                {getNotificationIcon(notification.type)}
              </div>
              <div
                className="flex-1 cursor-pointer min-w-0"
                onClick={() => onClick(notification)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium">{notification.title}</h4>
                    {notification.body && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {notification.body}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDate(notification.created_at)}
                  </span>
                </div>
              </div>
              <div
                className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {!notification.read && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAsRead(notification.id);
                    }}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(notification.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
