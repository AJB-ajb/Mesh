"use client";

import { useState } from "react";
import { MessageSquare, Send, Loader2, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { OnlineStatus, OnlineStatusBadge } from "@/components/ui/online-status";
import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { getInitials } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { usePresenceContext } from "@/components/providers/presence-provider";
import { ChatPanel } from "@/components/inbox/conversation-panel";
import type { MergedConnection } from "@/lib/hooks/use-connections-page";
import type { Conversation } from "@/lib/hooks/use-inbox";

type ConnectionChatAreaProps = {
  selectedConnection: MergedConnection | null;
  currentUserId: string | null;
  onBack: () => void;
  onConversationCreated?: () => void;
};

// ---------------------------------------------------------------------------
// New Conversation Panel (no existing conversation)
// Creates conversation on first message send
// ---------------------------------------------------------------------------

type NewConversationPanelProps = {
  connection: MergedConnection;
  currentUserId: string | null;
  onBack: () => void;
  onConversationCreated: (conversationId: string) => void;
};

function NewConversationPanel({
  connection,
  currentUserId,
  onBack,
  onConversationCreated,
}: NewConversationPanelProps) {
  const { isUserOnline } = usePresenceContext();
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const isOnline = isUserOnline(connection.otherUser.user_id);

  async function handleSend() {
    if (!newMessage.trim() || !currentUserId) return;
    setIsSending(true);

    const supabase = createClient();

    // Create conversation
    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .insert({
        participant_1: currentUserId,
        participant_2: connection.otherUser.user_id,
      })
      .select()
      .single();

    if (convError || !conv) {
      console.error("Error creating conversation:", convError);
      setIsSending(false);
      return;
    }

    // Send first message
    const { error: msgError } = await supabase.from("messages").insert({
      conversation_id: conv.id,
      sender_id: currentUserId,
      content: newMessage.trim(),
    });

    if (msgError) {
      console.error("Error sending message:", msgError);
      setIsSending(false);
      return;
    }

    // Create notification
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", currentUserId)
      .maybeSingle();

    supabase
      .from("notifications")
      .insert({
        user_id: connection.otherUser.user_id,
        type: "new_message",
        title: "New Message",
        body: `${profile?.full_name || "Someone"}: ${newMessage.trim().slice(0, 50)}${newMessage.length > 50 ? "..." : ""}`,
        related_user_id: currentUserId,
      })
      .then(({ error: notifError }) => {
        if (notifError)
          console.error("Error creating notification:", notifError);
      });

    setIsSending(false);
    onConversationCreated(conv.id);
  }

  return (
    <Card className={cn("flex flex-col h-full min-h-[600px]")}>
      {/* Header */}
      <CardHeader className="border-b border-border py-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <OnlineStatusBadge isOnline={isOnline}>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium shrink-0">
              {getInitials(connection.otherUser.full_name)}
            </div>
          </OnlineStatusBadge>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium truncate">
                {connection.otherUser.full_name || labels.common.unknown}
              </h4>
              <OnlineStatus isOnline={isOnline} showLabel size="sm" />
            </div>
            {connection.otherUser.headline && (
              <p className="text-xs text-muted-foreground truncate">
                {connection.otherUser.headline}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Empty messages area */}
      <CardContent className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
        <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">{labels.connectionsPage.startConversationOnSend}</p>
      </CardContent>

      {/* Message input */}
      <div className="border-t border-border p-4 shrink-0">
        <div className="flex gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={labels.chat.messagePlaceholder}
            rows={1}
            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ConnectionChatArea({
  selectedConnection,
  currentUserId,
  onBack,
  onConversationCreated,
}: ConnectionChatAreaProps) {
  if (!selectedConnection) {
    return (
      <Card className="flex flex-col items-center justify-center h-full min-h-[600px]">
        <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">
          {labels.connectionsPage.selectConnection}
        </p>
      </Card>
    );
  }

  if (selectedConnection.conversation) {
    // Build a Conversation shape for ChatPanel
    const conv: Conversation = {
      id: selectedConnection.conversation.id,
      participant_1: selectedConnection.conversation.participant_1,
      participant_2: selectedConnection.conversation.participant_2,
      posting_id: selectedConnection.conversation.posting_id,
      other_user: {
        user_id: selectedConnection.otherUser.user_id,
        full_name: selectedConnection.otherUser.full_name,
        headline: selectedConnection.otherUser.headline,
      },
      posting: selectedConnection.conversation.posting,
      last_message: selectedConnection.lastMessage ?? undefined,
      unread_count: selectedConnection.unreadCount,
      last_message_at: selectedConnection.lastMessage?.created_at ?? null,
      created_at: "",
      updated_at: "",
    };

    return (
      <ChatPanel
        key={conv.id}
        conversation={conv}
        currentUserId={currentUserId}
        onBack={onBack}
        className="h-full min-h-[600px]"
      />
    );
  }

  return (
    <NewConversationPanel
      key={selectedConnection.friendshipId}
      connection={selectedConnection}
      currentUserId={currentUserId}
      onBack={onBack}
      onConversationCreated={() => {
        onConversationCreated?.();
      }}
    />
  );
}
