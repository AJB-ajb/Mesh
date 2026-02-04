"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Inbox,
  Bell,
  MessageSquare,
  Trash2,
  Check,
  CheckCheck,
  Send,
  ArrowLeft,
  Loader2,
  FolderKanban,
  Wifi,
  WifiOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TypingIndicator } from "@/components/ui/typing-indicator";
import { OnlineStatus, OnlineStatusBadge } from "@/components/ui/online-status";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeChat } from "@/lib/hooks/use-realtime-chat";
import { usePresenceContext } from "@/components/providers/presence-provider";
import { getTestDataValue } from "@/lib/environment";
import { getInitials } from "@/lib/format";
import {
  subscribeToNotifications,
  subscribeToConversations,
  unsubscribeChannel,
  requestNotificationPermission,
  showBrowserNotification,
  type Notification as RealtimeNotification,
  type Conversation as RealtimeConversation,
} from "@/lib/supabase/realtime";

type Notification = RealtimeNotification;

type Conversation = RealtimeConversation & {
  project_id: string | null;
  other_user?: {
    full_name: string | null;
    headline: string | null;
    user_id: string;
  };
  project?: {
    title: string;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unread_count?: number;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
};

type Tab = "notifications" | "messages";

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

function InboxPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationParam = searchParams.get("conversation");
  const { isUserOnline } = usePresenceContext();

  const [activeTab, setActiveTab] = useState<Tab>(
    conversationParam ? "messages" : "notifications",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Conversations state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Real-time chat hook
  const handleNewMessage = useCallback((message: Message) => {
    setMessages((prev) => {
      // Avoid duplicates
      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, message];
    });
  }, []);

  const {
    typingUsers,
    onlineUsers: _onlineUsers,
    setIsTyping,
    isConnected,
  } = useRealtimeChat({
    conversationId: selectedConversation?.id || null,
    currentUserId,
    onNewMessage: handleNewMessage,
  });

  // Get the other user's name for typing indicator
  const otherUserName =
    selectedConversation?.other_user?.full_name || "Someone";

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setCurrentUserId(user.id);

      // Fetch notifications
      const { data: notificationsData } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (notificationsData) {
        setNotifications(notificationsData);
        setUnreadNotifications(notificationsData.filter((n) => !n.read).length);
      }

      // Fetch conversations
      const { data: conversationsData, error: conversationsError } =
        await supabase
          .from("conversations")
          .select("*")
          .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
          .order("updated_at", { ascending: false });

      if (conversationsError) {
        console.error("Error fetching conversations:", conversationsError);
      }

      if (conversationsData) {
        // Enrich conversations with other user info and last message
        const enrichedConversations = await Promise.all(
          conversationsData.map(async (conv) => {
            const otherUserId =
              conv.participant_1 === user.id
                ? conv.participant_2
                : conv.participant_1;

            // Get other user's profile
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("full_name, headline, user_id")
              .eq("user_id", otherUserId)
              .maybeSingle();

            if (profileError && profileError.code !== "PGRST116") {
              console.error("Error fetching profile:", profileError);
            }

            // Get project title if exists
            let project = null;
            if (conv.project_id) {
              const { data: projectData, error: projectError } = await supabase
                .from("projects")
                .select("title")
                .eq("id", conv.project_id)
                .eq("is_test_data", getTestDataValue())
                .maybeSingle();

              if (projectError && projectError.code !== "PGRST116") {
                console.error("Error fetching project:", projectError);
              }
              project = projectData;
            }

            // Get last message
            const { data: lastMessageData, error: lastMessageError } =
              await supabase
                .from("messages")
                .select("content, created_at, sender_id")
                .eq("conversation_id", conv.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            // Only log error if it's not a "not found" error
            if (lastMessageError && lastMessageError.code !== "PGRST116") {
              console.error("Error fetching last message:", lastMessageError);
            }

            // Get unread count
            const { count } = await supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("conversation_id", conv.id)
              .eq("read", false)
              .neq("sender_id", user.id);

            return {
              ...conv,
              other_user: profile || undefined,
              project: project || undefined,
              last_message: lastMessageData || undefined,
              unread_count: count || 0,
            };
          }),
        );

        setConversations(enrichedConversations);

        // If conversation param exists, select it
        if (conversationParam) {
          const conv = enrichedConversations.find(
            (c) => c.id === conversationParam,
          );
          if (conv) {
            setSelectedConversation(conv);
            setActiveTab("messages");
          }
        }
      }

      setIsLoading(false);

      // Request browser notification permission
      requestNotificationPermission();
    };

    fetchData();
  }, [router, conversationParam]);

  // Real-time notifications subscription
  useEffect(() => {
    if (!currentUserId) return;

    const notificationChannel = subscribeToNotifications(
      currentUserId,
      // On new notification
      (notification) => {
        setNotifications((prev) => [notification, ...prev]);
        if (!notification.read) {
          setUnreadNotifications((prev) => prev + 1);
          // Show browser notification
          showBrowserNotification(
            notification.title,
            notification.body || "",
            () => {
              if (notification.related_project_id) {
                router.push(`/projects/${notification.related_project_id}`);
              }
            },
          );
        }
      },
      // On notification update
      (notification) => {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? notification : n)),
        );
        // Recalculate unread count
        setNotifications((prev) => {
          setUnreadNotifications(prev.filter((n) => !n.read).length);
          return prev;
        });
      },
      // On notification delete
      (notification) => {
        setNotifications((prev) =>
          prev.filter((n) => n.id !== notification.id),
        );
      },
    );

    const conversationChannel = subscribeToConversations(
      currentUserId,
      // On conversation update
      async (conv) => {
        // Refresh conversation data
        const supabase = createClient();
        const otherUserId =
          conv.participant_1 === currentUserId
            ? conv.participant_2
            : conv.participant_1;

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, headline, user_id")
          .eq("user_id", otherUserId)
          .maybeSingle();

        if (profileError && profileError.code !== "PGRST116") {
          console.error("Error fetching profile in realtime:", profileError);
        }

        const { data: lastMessageData, error: lastMessageError } =
          await supabase
            .from("messages")
            .select("content, created_at, sender_id")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        // Only log error if it's not a "not found" error
        if (lastMessageError && lastMessageError.code !== "PGRST116") {
          console.error(
            "Error fetching last message in realtime:",
            lastMessageError,
          );
        }

        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .eq("read", false)
          .neq("sender_id", currentUserId);

        const enrichedConv: Conversation = {
          ...conv,
          project_id: null,
          other_user: profile || undefined,
          last_message: lastMessageData || undefined,
          unread_count: count || 0,
        };

        setConversations((prev) => {
          const exists = prev.find((c) => c.id === conv.id);
          if (exists) {
            return prev
              .map((c) => (c.id === conv.id ? enrichedConv : c))
              .sort(
                (a, b) =>
                  new Date(b.updated_at).getTime() -
                  new Date(a.updated_at).getTime(),
              );
          }
          return [enrichedConv, ...prev];
        });
      },
    );

    return () => {
      unsubscribeChannel(notificationChannel);
      unsubscribeChannel(conversationChannel);
    };
  }, [currentUserId, router]);

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (!selectedConversation) return;

    const fetchMessages = async () => {
      if (!selectedConversation?.id || !currentUserId) {
        console.warn("Cannot fetch messages: missing conversation or user ID");
        return;
      }

      const supabase = createClient();

      console.log(
        "Fetching messages for conversation:",
        selectedConversation.id,
      );

      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedConversation.id)
        .order("created_at", { ascending: true });

      if (messagesError) {
        console.error("Error fetching messages:", messagesError);
        console.error("Error details:", {
          code: messagesError.code,
          message: messagesError.message,
          details: messagesError.details,
          hint: messagesError.hint,
        });
        setMessages([]);
        return;
      }

      console.log("Fetched messages:", messagesData?.length || 0, messagesData);

      if (messagesData) {
        setMessages(messagesData);

        // Mark messages as read
        const { error: updateError } = await supabase
          .from("messages")
          .update({ read: true })
          .eq("conversation_id", selectedConversation.id)
          .neq("sender_id", currentUserId);

        if (updateError) {
          console.error("Error marking messages as read:", updateError);
        }
      } else {
        setMessages([]);
      }
    };

    fetchMessages();
  }, [selectedConversation, currentUserId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleMarkAsRead = async (notificationId: string) => {
    const supabase = createClient();

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
    );
    setUnreadNotifications((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = async () => {
    const supabase = createClient();

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", currentUserId)
      .eq("read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadNotifications(0);
  };

  const handleDeleteNotification = async (notificationId: string) => {
    const supabase = createClient();

    await supabase.from("notifications").delete().eq("id", notificationId);

    const notification = notifications.find((n) => n.id === notificationId);
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    if (notification && !notification.read) {
      setUnreadNotifications((prev) => Math.max(0, prev - 1));
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    handleMarkAsRead(notification.id);

    // Navigate based on notification type
    if (notification.related_project_id) {
      router.push(`/projects/${notification.related_project_id}`);
    }
  };

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedConversation || !currentUserId) return;

    setIsSendingMessage(true);
    const supabase = createClient();

    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: selectedConversation.id,
        sender_id: currentUserId,
        content: newMessage.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error sending message:", error);
      setIsSendingMessage(false);
      return;
    }

    // Add message to local state
    setMessages((prev) => [...prev, message]);
    setNewMessage("");

    // Create notification for other user
    const otherUserId =
      selectedConversation.participant_1 === currentUserId
        ? selectedConversation.participant_2
        : selectedConversation.participant_1;

    // Get sender's name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", currentUserId)
      .maybeSingle();

    // Create notification for other user (don't block on this - fire and forget)
    (async () => {
      const { error } = await supabase.from("notifications").insert({
        user_id: otherUserId,
        type: "new_message",
        title: "New Message",
        body: `${profile?.full_name || "Someone"}: ${newMessage.trim().slice(0, 50)}${newMessage.length > 50 ? "..." : ""}`,
        related_user_id: currentUserId,
      });
      if (error) {
        console.error("Error creating notification:", error);
        // Don't block message sending if notification fails
      }
    })();

    setIsSendingMessage(false);
  }, [newMessage, selectedConversation, currentUserId]);

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
            setSelectedConversation(null);
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
        <div className="space-y-4">
          {/* Actions */}
          {notifications.length > 0 && unreadNotifications > 0 && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
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
                <p className="mt-4 text-muted-foreground">
                  No notifications yet
                </p>
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
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div
                    className="flex-1 cursor-pointer min-w-0"
                    onClick={() => handleNotificationClick(notification)}
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
                          handleMarkAsRead(notification.id);
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
                        handleDeleteNotification(notification.id);
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
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Conversations list */}
          <div className="space-y-2 lg:col-span-1">
            {conversations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">
                    No conversations yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Start by contacting a project creator
                  </p>
                </CardContent>
              </Card>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={cn(
                    "w-full flex items-start gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted/50",
                    selectedConversation?.id === conversation.id &&
                      "bg-muted border-primary/50",
                    conversation.unread_count &&
                      conversation.unread_count > 0 &&
                      "bg-primary/5",
                  )}
                >
                  <OnlineStatusBadge
                    isOnline={isUserOnline(
                      conversation.other_user?.user_id || "",
                    )}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium shrink-0">
                      {getInitials(conversation.other_user?.full_name || null)}
                    </div>
                  </OnlineStatusBadge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium truncate">
                        {conversation.other_user?.full_name || "Unknown"}
                      </h4>
                      {conversation.last_message && (
                        <span className="text-xs text-muted-foreground">
                          {formatDate(conversation.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    {conversation.project && (
                      <p className="text-xs text-primary truncate">
                        Re: {conversation.project.title}
                      </p>
                    )}
                    {conversation.last_message && (
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.last_message.sender_id === currentUserId
                          ? "You: "
                          : ""}
                        {conversation.last_message.content}
                      </p>
                    )}
                  </div>
                  {conversation.unread_count &&
                    conversation.unread_count > 0 && (
                      <Badge
                        variant="destructive"
                        className="h-5 min-w-5 px-1.5"
                      >
                        {conversation.unread_count}
                      </Badge>
                    )}
                </button>
              ))
            )}
          </div>

          {/* Chat area */}
          <div className="lg:col-span-2">
            {selectedConversation ? (
              <Card className="flex flex-col h-[600px]">
                {/* Chat header */}
                <CardHeader className="border-b border-border py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden"
                        onClick={() => setSelectedConversation(null)}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <OnlineStatusBadge
                        isOnline={isUserOnline(
                          selectedConversation.other_user?.user_id || "",
                        )}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                          {getInitials(
                            selectedConversation.other_user?.full_name || null,
                          )}
                        </div>
                      </OnlineStatusBadge>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">
                            {selectedConversation.other_user?.full_name ||
                              "Unknown"}
                          </h4>
                          <OnlineStatus
                            isOnline={isUserOnline(
                              selectedConversation.other_user?.user_id || "",
                            )}
                            showLabel
                            size="sm"
                          />
                        </div>
                        {selectedConversation.project && (
                          <Link
                            href={`/projects/${selectedConversation.project_id}`}
                            className="text-xs text-primary hover:underline"
                          >
                            Re: {selectedConversation.project.title}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mb-2" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex",
                          message.sender_id === currentUserId
                            ? "justify-end"
                            : "justify-start",
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] rounded-lg px-4 py-2",
                            message.sender_id === currentUserId
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted",
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap">
                            {message.content}
                          </p>
                          <p
                            className={cn(
                              "text-xs mt-1",
                              message.sender_id === currentUserId
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground",
                            )}
                          >
                            {formatDate(message.created_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </CardContent>

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                  <div className="border-t border-border px-4 py-2">
                    <TypingIndicator userName={otherUserName} />
                  </div>
                )}

                {/* Message input */}
                <div className="border-t border-border p-4">
                  <div className="flex gap-2">
                    <textarea
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        // Trigger typing indicator
                        if (e.target.value.length > 0) {
                          setIsTyping(true);
                        } else {
                          setIsTyping(false);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          setIsTyping(false);
                          handleSendMessage();
                        }
                      }}
                      onBlur={() => setIsTyping(false)}
                      placeholder="Type a message..."
                      rows={1}
                      className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                    <Button
                      onClick={() => {
                        setIsTyping(false);
                        handleSendMessage();
                      }}
                      disabled={!newMessage.trim() || isSendingMessage}
                    >
                      {isSendingMessage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {/* Connection status */}
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    {isConnected ? (
                      <>
                        <Wifi className="h-3 w-3 text-green-500" />
                        <span>Connected</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-3 w-3 text-red-500" />
                        <span>Connecting...</span>
                      </>
                    )}
                  </div>
                </div>
              </Card>
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
