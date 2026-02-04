import { Metadata } from "next";
import { Search, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { getTestDataValue } from "@/lib/environment";
import { getInitials } from "@/lib/format";

export const metadata: Metadata = {
  title: "Messages",
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24)
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return new Date(dateString).toLocaleDateString();
};

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let conversations: Array<{
    id: string;
    projectTitle: string;
    projectId: string;
    participants: Array<{ name: string; initials: string }>;
    lastMessage: {
      sender: string;
      content: string;
      time: string;
    };
    unread: number;
  }> = [];

  let selectedConversation: {
    id: string;
    projectTitle: string;
    projectId: string;
    participants: Array<{ name: string; initials: string }>;
    messages: Array<{
      id: string;
      sender: string;
      senderId: string;
      content: string;
      time: string;
    }>;
  } | null = null;

  if (user) {
    // Get projects the user created
    const { data: createdProjects } = await supabase
      .from("projects")
      .select("id, title, creator_id")
      .eq("creator_id", user.id)
      .eq("is_test_data", getTestDataValue());

    // Get projects where user has accepted matches
    const { data: acceptedMatches } = await supabase
      .from("matches")
      .select("project_id")
      .eq("user_id", user.id)
      .eq("status", "accepted");

    const projectIds = new Set<string>();
    if (createdProjects) {
      createdProjects.forEach((p) => projectIds.add(p.id));
    }
    if (acceptedMatches) {
      acceptedMatches.forEach((m) => projectIds.add(m.project_id));
    }

    if (projectIds.size > 0) {
      const projectIdsArray = Array.from(projectIds);

      // Get all messages for these projects
      const { data: messagesData } = await supabase
        .from("messages")
        .select(
          `
          id,
          project_id,
          sender_id,
          content,
          created_at,
          profiles:sender_id (
            full_name,
            user_id
          ),
          projects:project_id (
            id,
            title,
            creator_id,
            profiles:creator_id (
              full_name,
              user_id
            )
          )
        `,
        )
        .in("project_id", projectIdsArray)
        .order("created_at", { ascending: false });

      if (messagesData) {
        // Group messages by project
        const projectMap = new Map<
          string,
          {
            projectId: string;
            projectTitle: string;
            messages: Array<{
              id: string;
              sender: string;
              senderId: string;
              content: string;
              time: string;
              createdAt: string;
            }>;
            participants: Set<string>;
            participantNames: Map<string, string>;
          }
        >();

        for (const msg of messagesData) {
          const projectId = msg.project_id;
          const senderId = msg.sender_id;
          const senderName =
            ((msg.profiles as unknown as Record<string, unknown>)
              ?.full_name as string) || "Unknown";
          const project = msg.projects as unknown as Record<
            string,
            unknown
          > | null;
          const projectTitle = (project?.title as string) || "Unknown Project";

          if (!projectMap.has(projectId)) {
            projectMap.set(projectId, {
              projectId,
              projectTitle,
              messages: [],
              participants: new Set(),
              participantNames: new Map(),
            });
          }

          const conv = projectMap.get(projectId)!;
          conv.participants.add(senderId);
          conv.participantNames.set(senderId, senderName);

          // Add creator to participants
          if (project?.creator_id) {
            conv.participants.add(project.creator_id as string);
            const projectProfiles = project.profiles as Record<
              string,
              unknown
            > | null;
            const creatorName =
              (projectProfiles?.full_name as string) || "Unknown";
            conv.participantNames.set(
              project.creator_id as string,
              creatorName,
            );
          }

          conv.messages.push({
            id: msg.id,
            sender: senderName,
            senderId,
            content: msg.content,
            time: formatTimeAgo(msg.created_at),
            createdAt: msg.created_at,
          });
        }

        // Convert to conversations format
        conversations = Array.from(projectMap.values()).map((conv) => {
          const sortedMessages = conv.messages.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          const lastMsg = sortedMessages[0];

          return {
            id: conv.projectId,
            projectTitle: conv.projectTitle,
            projectId: conv.projectId,
            participants: Array.from(conv.participants)
              .filter((id) => id !== user.id)
              .slice(0, 2)
              .map((id) => ({
                name: conv.participantNames.get(id) || "Unknown",
                initials: getInitials(conv.participantNames.get(id) ?? null),
              })),
            lastMessage: lastMsg
              ? {
                  sender: lastMsg.sender,
                  content: lastMsg.content,
                  time: lastMsg.time,
                }
              : {
                  sender: "System",
                  content: "No messages yet",
                  time: "",
                },
            unread: 0, // TODO: Implement unread count when notifications are added
          };
        });

        // Sort conversations by last message time
        conversations.sort((a, b) => {
          const aTime =
            projectMap.get(a.projectId)?.messages[0]?.createdAt || "";
          const bTime =
            projectMap.get(b.projectId)?.messages[0]?.createdAt || "";
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });

        // Set first conversation as selected
        if (conversations.length > 0) {
          const firstConv = conversations[0];
          const convData = projectMap.get(firstConv.projectId)!;
          selectedConversation = {
            id: firstConv.projectId,
            projectTitle: firstConv.projectTitle,
            projectId: firstConv.projectId,
            participants: firstConv.participants,
            messages: convData.messages
              .sort(
                (a, b) =>
                  new Date(a.createdAt).getTime() -
                  new Date(b.createdAt).getTime(),
              )
              .map((m) => ({
                id: m.id,
                sender: m.sender,
                senderId: m.senderId,
                content: m.content,
                time: m.time,
              })),
          };
        }
      }
    }
  }
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col lg:flex-row">
      {/* Conversations sidebar */}
      <div className="w-full border-b border-border lg:w-80 lg:border-b-0 lg:border-r">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search conversations..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="space-y-1 p-2">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              className="flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted/50"
            >
              {/* Avatar stack */}
              <div className="relative flex -space-x-2">
                {conversation.participants.slice(0, 2).map((p, i) => (
                  <div
                    key={p.name}
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium"
                    style={{ zIndex: 2 - i }}
                  >
                    {p.initials}
                  </div>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium">
                    {conversation.projectTitle}
                  </p>
                  {conversation.unread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                      {conversation.unread}
                    </span>
                  )}
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {conversation.lastMessage.sender}:{" "}
                  {conversation.lastMessage.content}
                </p>
                <p className="text-xs text-muted-foreground">
                  {conversation.lastMessage.time}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col">
        {selectedConversation ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 border-b border-border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                {selectedConversation.participants[0]?.initials || "P"}
              </div>
              <div>
                <h2 className="font-medium">
                  {selectedConversation.projectTitle}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedConversation.participants
                    .map((p) => p.name)
                    .join(", ") || "No participants"}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedConversation.messages.map((message) => {
                const isCurrentUser = message.senderId === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${isCurrentUser ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                        isCurrentUser
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {isCurrentUser ? "ME" : getInitials(message.sender)}
                    </div>
                    <div
                      className={`rounded-lg p-3 max-w-[80%] ${
                        isCurrentUser ? "bg-primary/10" : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {message.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input */}
            <div className="border-t border-border p-4">
              <form className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1"
                  disabled
                />
                <Button type="submit" disabled>
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Send</span>
                </Button>
              </form>
              <p className="mt-2 text-xs text-muted-foreground">
                Message sending will be implemented soon. For extended
                collaboration, consider moving to Slack or Discord.
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              title="No messages yet"
              description="Your conversations with project teams will appear here."
            />
          </div>
        )}
      </div>
    </div>
  );
}
