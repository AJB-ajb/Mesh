"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Loader2,
  Wifi,
  WifiOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TypingIndicator } from "@/components/ui/typing-indicator";
import { OnlineStatus, OnlineStatusBadge } from "@/components/ui/online-status";
import { cn } from "@/lib/utils";
import { useRealtimeChat } from "@/lib/hooks/use-realtime-chat";
import { useSendMessage } from "@/lib/hooks/use-send-message";
import { usePresenceContext } from "@/components/providers/presence-provider";
import { getInitials } from "@/lib/format";
import { useConversationMessages } from "@/lib/hooks/use-inbox";
import type { Conversation, Message } from "@/lib/hooks/use-inbox";

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

// ---------------------------------------------------------------------------
// Conversation List
// ---------------------------------------------------------------------------

type ConversationListProps = {
  conversations: Conversation[];
  selectedConversationId: string | null;
  currentUserId: string | null;
  onSelect: (conversation: Conversation) => void;
};

export function ConversationList({
  conversations,
  selectedConversationId,
  currentUserId,
  onSelect,
}: ConversationListProps) {
  const { isUserOnline } = usePresenceContext();

  if (conversations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">No conversations yet</p>
          <p className="text-sm text-muted-foreground">
            Start by contacting a posting creator
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {conversations.map((conversation) => (
        <button
          key={conversation.id}
          onClick={() => onSelect(conversation)}
          className={cn(
            "w-full flex items-start gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted/50",
            selectedConversationId === conversation.id &&
              "bg-muted border-primary/50",
            conversation.unread_count &&
              conversation.unread_count > 0 &&
              "bg-primary/5",
          )}
        >
          <OnlineStatusBadge
            isOnline={isUserOnline(conversation.other_user?.user_id || "")}
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
            {conversation.posting && (
              <p className="text-xs text-primary truncate">
                Re: {conversation.posting.title}
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
          {conversation.unread_count && conversation.unread_count > 0 && (
            <Badge variant="destructive" className="h-5 min-w-5 px-1.5">
              {conversation.unread_count}
            </Badge>
          )}
        </button>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Chat Panel
// ---------------------------------------------------------------------------

type ChatPanelProps = {
  conversation: Conversation;
  currentUserId: string | null;
  onBack: () => void;
};

export function ChatPanel({
  conversation,
  currentUserId,
  onBack,
}: ChatPanelProps) {
  const { isUserOnline } = usePresenceContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const { messages: fetchedMessages, mutate: mutateMessages } =
    useConversationMessages(conversation.id, currentUserId);

  // Sync fetched messages to local state
  useEffect(() => {
    setLocalMessages(fetchedMessages);
  }, [fetchedMessages]);

  // Real-time chat
  const handleNewMessage = useCallback((message: Message) => {
    setLocalMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, message];
    });
  }, []);

  const { typingUsers, setIsTyping, isConnected } = useRealtimeChat({
    conversationId: conversation.id,
    currentUserId,
    onNewMessage: handleNewMessage,
  });

  const otherUserName = conversation.other_user?.full_name || "Someone";

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  const onOptimisticMessage = useCallback((message: Message) => {
    setLocalMessages((prev) => [...prev, message]);
    setNewMessage("");
  }, []);

  const { sendMessage, isSending: isSendingMessage } = useSendMessage(
    conversation.id,
    currentUserId,
    conversation,
    onOptimisticMessage,
    mutateMessages,
  );

  const handleSendMessage = useCallback(() => {
    sendMessage(newMessage);
  }, [sendMessage, newMessage]);

  return (
    <Card className="flex flex-col h-[600px]">
      {/* Chat header */}
      <CardHeader className="border-b border-border py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <OnlineStatusBadge
              isOnline={isUserOnline(conversation.other_user?.user_id || "")}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                {getInitials(conversation.other_user?.full_name || null)}
              </div>
            </OnlineStatusBadge>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-medium">
                  {conversation.other_user?.full_name || "Unknown"}
                </h4>
                <OnlineStatus
                  isOnline={isUserOnline(
                    conversation.other_user?.user_id || "",
                  )}
                  showLabel
                  size="sm"
                />
              </div>
              {conversation.posting && (
                <Link
                  href={`/postings/${conversation.posting_id}`}
                  className="text-xs text-primary hover:underline"
                >
                  Re: {conversation.posting.title}
                </Link>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {localMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-8 w-8 mb-2" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          localMessages.map((message) => (
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
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
  );
}
