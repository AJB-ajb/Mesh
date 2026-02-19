"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import {
  Send,
  Loader2,
  Wifi,
  WifiOff,
  MessageSquare,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TypingIndicator } from "@/components/ui/typing-indicator";
import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { getInitials } from "@/lib/format";
import {
  useGroupMessages,
  markGroupMessageRead,
} from "@/lib/hooks/use-group-messages";
import { useRealtimeGroupChat } from "@/lib/hooks/use-realtime-group-chat";
import { useSendGroupMessage } from "@/lib/hooks/use-send-group-message";
import type { GroupMessageWithSender } from "@/lib/hooks/use-group-messages";
import type { GroupMessage } from "@/lib/supabase/realtime";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TeamMember = {
  user_id: string;
  full_name: string | null;
  role?: string;
};

type GroupChatPanelProps = {
  postingId: string;
  postingTitle: string;
  currentUserId: string;
  currentUserName: string | null;
  teamMembers: TeamMember[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function buildTypingLabel(
  typingUserIds: string[],
  teamMembers: TeamMember[],
  currentUserId: string,
): string | null {
  const names = typingUserIds
    .filter((id) => id !== currentUserId)
    .map((id) => {
      const member = teamMembers.find((m) => m.user_id === id);
      return member?.full_name ?? labels.common.unknown;
    });

  if (names.length === 0) return null;
  if (names.length === 1) return labels.groupChat.isTyping(names[0]);
  return labels.groupChat.multipleTyping(names);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GroupChatPanel({
  postingId,
  postingTitle,
  currentUserId,
  currentUserName,
  teamMembers,
}: GroupChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [localMessages, setLocalMessages] = useState<GroupMessageWithSender[]>(
    [],
  );
  const [newMessage, setNewMessage] = useState("");

  const { messages: fetchedMessages, mutate } = useGroupMessages(
    postingId,
    currentUserId,
  );

  // Sync fetched messages to local state
  useEffect(() => {
    setLocalMessages(fetchedMessages);
  }, [fetchedMessages]);

  // Handle incoming realtime messages
  const handleNewMessage = useCallback(
    (message: GroupMessage) => {
      const senderMember = teamMembers.find(
        (m) => m.user_id === message.sender_id,
      );
      const withSender: GroupMessageWithSender = {
        ...message,
        sender_name: senderMember?.full_name ?? null,
      };
      setLocalMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, withSender];
      });
      // Mark as read immediately (fire-and-forget)
      markGroupMessageRead(message.id, currentUserId);
      // Revalidate SWR cache in background
      mutate();
    },
    [teamMembers, currentUserId, mutate],
  );

  const { typingUsers, onlineUsers, setIsTyping, isConnected } =
    useRealtimeGroupChat({
      postingId,
      currentUserId,
      onNewMessage: handleNewMessage,
    });

  // Optimistic message handler
  const handleOptimisticMessage = useCallback(
    (message: GroupMessageWithSender) => {
      setLocalMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      setNewMessage("");
    },
    [],
  );

  const { sendMessage, isSending } = useSendGroupMessage({
    postingId,
    postingTitle,
    currentUserId,
    senderName: currentUserName,
    teamMembers,
    onOptimisticMessage: handleOptimisticMessage,
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || isSending) return;
    setIsTyping(false);
    await sendMessage(newMessage);
    // Revalidate to replace optimistic messages with real ones
    mutate();
  }, [newMessage, isSending, sendMessage, setIsTyping, mutate]);

  const typingLabel = buildTypingLabel(typingUsers, teamMembers, currentUserId);

  return (
    <Card className="flex flex-col h-[600px]">
      {/* Header */}
      <CardHeader className="border-b border-border py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">{labels.groupChat.teamChat}</h3>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {labels.groupChat.memberCount(teamMembers.length)}
            </span>
            {onlineUsers.length > 0 && (
              <span className="text-green-600 dark:text-green-400 text-xs">
                {labels.groupChat.onlineCount(onlineUsers.length + 1)}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Messages area */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {localMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm text-center">{labels.groupChat.noMessages}</p>
          </div>
        ) : (
          localMessages.map((message) => {
            const isOwn = message.sender_id === currentUserId;
            return (
              <div
                key={message.id}
                className={cn("flex", isOwn ? "justify-end" : "justify-start")}
              >
                {!isOwn && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium mr-2 mt-1">
                    {getInitials(message.sender_name)}
                  </div>
                )}
                <div className={cn("max-w-[70%]", !isOwn && "space-y-0.5")}>
                  {!isOwn && message.sender_name && (
                    <p className="text-xs font-medium text-muted-foreground px-1">
                      {message.sender_name}
                    </p>
                  )}
                  <div
                    className={cn(
                      "rounded-lg px-4 py-2",
                      isOwn ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                    <p
                      className={cn(
                        "text-xs mt-1",
                        isOwn
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground",
                      )}
                    >
                      {formatDate(message.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Typing indicator */}
      {typingLabel && (
        <div className="border-t border-border px-4 py-2">
          <TypingIndicator userName={typingLabel} />
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-border p-4 shrink-0">
        <div className="flex gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              setIsTyping(e.target.value.length > 0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            onBlur={() => setIsTyping(false)}
            placeholder={labels.groupChat.messagePlaceholder}
            rows={1}
            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            aria-label={labels.groupChat.sendMessage}
          >
            {isSending ? (
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
              <span>{labels.chat.connectionConnected}</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-red-500" />
              <span>{labels.chat.connectionConnecting}</span>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
