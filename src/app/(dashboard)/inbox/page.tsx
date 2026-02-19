"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, MessageSquare, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  subscribeToNotifications,
  subscribeToConversations,
  unsubscribeChannel,
  requestNotificationPermission,
  showBrowserNotification,
} from "@/lib/supabase/realtime";
import { useInboxData } from "@/lib/hooks/use-inbox";
import { useNotificationPreferences } from "@/lib/hooks/use-notification-preferences";
import {
  type NotificationType,
  shouldNotify,
} from "@/lib/notifications/preferences";

import { NotificationsList } from "@/components/inbox/notifications-list";
import {
  ConversationList,
  ChatPanel,
} from "@/components/inbox/conversation-panel";

type Tab = "notifications" | "messages";

function InboxPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationParam = searchParams.get("conversation");

  const {
    notifications,
    conversations,
    currentUserId,
    isLoading,
    mutate: mutateInbox,
  } = useInboxData();

  const { preferences: notifPrefs } = useNotificationPreferences();

  const [activeTab, setActiveTab] = useState<Tab>(
    conversationParam ? "messages" : "notifications",
  );
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(conversationParam);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const unreadNotifications = notifications.filter((n) => !n.read).length;

  // Real-time subscriptions
  useEffect(() => {
    if (!currentUserId) return;

    requestNotificationPermission();

    const notificationChannel = subscribeToNotifications(
      currentUserId,
      (notification) => {
        mutateInbox();
        if (
          !notification.read &&
          shouldNotify(
            notifPrefs,
            notification.type as NotificationType,
            "browser",
          )
        ) {
          showBrowserNotification(
            notification.title,
            notification.body || "",
            () => {
              if (notification.related_posting_id) {
                router.push(`/postings/${notification.related_posting_id}`);
              }
            },
          );
        }
      },
      () => mutateInbox(),
      () => mutateInbox(),
    );

    const conversationChannel = subscribeToConversations(currentUserId, () =>
      mutateInbox(),
    );

    return () => {
      unsubscribeChannel(notificationChannel);
      unsubscribeChannel(conversationChannel);
    };
  }, [currentUserId, mutateInbox, router, notifPrefs]);

  const handleMarkAsRead = async (notificationId: string) => {
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);
    mutateInbox();
  };

  const handleMarkAllAsRead = async () => {
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", currentUserId)
      .eq("read", false);
    mutateInbox();
  };

  const handleDeleteNotification = async (notificationId: string) => {
    const supabase = createClient();
    await supabase.from("notifications").delete().eq("id", notificationId);
    mutateInbox();
  };

  const handleNotificationClick = (notification: (typeof notifications)[0]) => {
    handleMarkAsRead(notification.id);
    if (notification.related_posting_id) {
      router.push(`/postings/${notification.related_posting_id}`);
    }
  };

  const handleSequentialInviteRespond = async ({
    postingId,
    action,
    notificationId,
  }: {
    postingId: string;
    action: "accept" | "decline";
    notificationId: string;
  }) => {
    const supabase = createClient();

    // Look up the sequential invite by posting_id where user is in the ordered list
    const { data: friendAsks } = await supabase
      .from("friend_asks")
      .select("id, ordered_friend_list, current_request_index")
      .eq("posting_id", postingId)
      .eq("status", "pending");

    const friendAsk = friendAsks?.find(
      (fa) =>
        fa.ordered_friend_list[fa.current_request_index] === currentUserId,
    );

    if (!friendAsk) return;

    const res = await fetch(`/api/friend-ask/${friendAsk.id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    if (res.ok) {
      handleMarkAsRead(notificationId);
      mutateInbox();
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inbox</h1>
          <p className="mt-1 text-muted-foreground">
            Notifications and messages
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => {
            setActiveTab("notifications");
            setSelectedConversationId(null);
          }}
          className={cn(
            "relative px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "notifications"
              ? "text-foreground border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
            {unreadNotifications > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 px-1.5">
                {unreadNotifications}
              </Badge>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab("messages")}
          className={cn(
            "relative px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "messages"
              ? "text-foreground border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Messages
            {conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0) >
              0 && (
              <Badge variant="destructive" className="h-5 min-w-5 px-1.5">
                {conversations.reduce(
                  (acc, c) => acc + (c.unread_count || 0),
                  0,
                )}
              </Badge>
            )}
          </div>
        </button>
      </div>

      {/* Content */}
      {activeTab === "notifications" ? (
        <NotificationsList
          notifications={notifications}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          onDelete={handleDeleteNotification}
          onClick={handleNotificationClick}
          onSequentialInviteRespond={handleSequentialInviteRespond}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Conversations list */}
          <div className="space-y-2 lg:col-span-1 min-w-0">
            <ConversationList
              conversations={conversations}
              selectedConversationId={selectedConversation?.id ?? null}
              currentUserId={currentUserId}
              onSelect={(c) => setSelectedConversationId(c.id)}
            />
          </div>

          {/* Chat area */}
          <div className="lg:col-span-2 min-w-0">
            {selectedConversation ? (
              <ChatPanel
                key={selectedConversation.id}
                conversation={selectedConversation}
                currentUserId={currentUserId}
                onBack={() => setSelectedConversationId(null)}
              />
            ) : (
              <Card className="flex flex-col items-center justify-center h-[600px]">
                <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  Select a conversation to start messaging
                </p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <InboxPageContent />
    </Suspense>
  );
}
