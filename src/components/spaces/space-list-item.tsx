"use client";

import Link from "next/link";
import { Pin, Globe, BellOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Stack } from "@/components/ui/stack";
import { Group } from "@/components/ui/group";
import { RelativeTime } from "@/components/ui/relative-time";
import { formatTimeAgoShort } from "@/lib/format";
import { labels } from "@/lib/labels";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import type { SpaceListItem } from "@/lib/supabase/types";
import { GLOBAL_SPACE_ID } from "@/lib/supabase/types";

interface SpaceListItemRowProps {
  space: SpaceListItem;
  currentUserId?: string | null;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface PreviewData {
  /** Plain-text prefix (emoji + sender name) */
  prefix: string;
  /** Markdown content to render */
  content: string;
}

/** Build the preview with sender name prefix and message content */
function buildPreview(
  space: SpaceListItem,
  currentUserId?: string | null,
): PreviewData | null {
  const msg = space.last_message;
  if (!msg) return null;

  const content = msg.content ?? "";
  if (!content) return null;

  // System messages: plain content, no sender prefix
  if (msg.type === "system") return { prefix: "", content };

  // Type prefix for non-text messages
  let prefix = "";
  if (msg.type === "posting")
    prefix = "\uD83D\uDCCC "; // 📌
  else if (msg.type === "card") prefix = "\uD83C\uDFB4 "; // 🎴

  // Sender prefix (skip for DMs where it's obvious)
  if (space.type !== "dm" && msg.sender_id) {
    if (msg.sender_id === currentUserId) {
      prefix += "You: ";
    } else if (msg.sender_name) {
      const firstName = msg.sender_name.split(" ")[0];
      prefix += `${firstName}: `;
    }
  }

  return { prefix, content };
}

export function SpaceListItemRow({
  space,
  currentUserId,
}: SpaceListItemRowProps) {
  const isGlobal = space.id === GLOBAL_SPACE_ID;
  const membership = space.space_members?.[0];
  const isPinned = membership?.pinned ?? false;
  const isMuted = membership?.muted ?? false;
  const unreadCount = membership?.unread_count ?? 0;

  const displayName =
    space.type === "dm"
      ? space.other_member_profile?.full_name || space.name
      : space.name;
  const lastMessageTime = space.last_message?.created_at ?? space.updated_at;
  const preview = buildPreview(space, currentUserId);
  const isSystem = space.last_message?.type === "system";

  return (
    <Link
      href={`/spaces/${space.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors active:bg-muted min-h-[68px] sm:px-6"
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar size="lg">
          <AvatarFallback
            className={cn(isGlobal && "bg-primary text-primary-foreground")}
          >
            {isGlobal ? <Globe className="size-5" /> : getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        {/* Online indicator for DMs — placeholder for presence */}
        {space.type === "dm" && (
          <span className="absolute bottom-0 right-0 size-3 rounded-full bg-muted-foreground/30 ring-2 ring-background" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <Group gap="xs">
          {isPinned && !isGlobal && (
            <Pin className="size-3 text-muted-foreground shrink-0" />
          )}
          {isMuted && (
            <BellOff className="size-3 text-muted-foreground shrink-0" />
          )}
          <span
            className={cn(
              "font-semibold truncate text-sm",
              unreadCount > 0 && !isMuted && "text-foreground",
            )}
          >
            {isGlobal ? labels.spaces.explore : displayName}
          </span>
          {(space.type === "large" || isGlobal) && space.member_count && (
            <span className="text-xs text-muted-foreground shrink-0">
              · {labels.spaces.members(space.member_count)}
            </span>
          )}
        </Group>
        {preview && (
          <div
            className={cn(
              "text-sm",
              isSystem && "italic",
              unreadCount > 0 && !isMuted
                ? "text-foreground font-medium"
                : "text-muted-foreground",
            )}
          >
            {preview.prefix && <span>{preview.prefix}</span>}
            <MarkdownRenderer
              content={preview.content}
              clamp={1}
              className="inline [&_p]:inline [&_p]:mb-0"
            />
          </div>
        )}
      </div>

      {/* Right side: time + unread */}
      <Stack gap="xs" align="end" className="shrink-0">
        <RelativeTime
          date={lastMessageTime}
          formatter={formatTimeAgoShort}
          className="text-xs text-muted-foreground"
        />
        {unreadCount > 0 && (
          <Badge
            className={cn(
              "h-5 min-w-5 flex items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
              isMuted && "bg-muted-foreground",
            )}
          >
            {unreadCount}
          </Badge>
        )}
      </Stack>
    </Link>
  );
}
