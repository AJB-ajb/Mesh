"use client";

import Link from "next/link";
import { Pin, Globe } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RelativeTime } from "@/components/ui/relative-time";
import { formatTimeAgoShort } from "@/lib/format";
import { labels } from "@/lib/labels";
import type { SpaceListItem } from "@/lib/supabase/types";
import { GLOBAL_SPACE_ID } from "@/lib/supabase/types";

interface SpaceListItemRowProps {
  space: SpaceListItem;
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

export function SpaceListItemRow({ space }: SpaceListItemRowProps) {
  const isGlobal = space.id === GLOBAL_SPACE_ID;
  const membership = space.space_members?.[0];
  const isPinned = membership?.pinned ?? false;
  const unreadCount = membership?.unread_count ?? 0;

  const lastMessageTime =
    space.last_message?.created_at ?? space.updated_at;
  const lastMessagePreview = space.last_message?.content ?? null;

  return (
    <Link
      href={`/spaces/${space.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors active:bg-muted min-h-[68px] sm:px-6"
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar size="lg">
          <AvatarFallback
            className={cn(
              isGlobal && "bg-primary text-primary-foreground",
            )}
          >
            {isGlobal ? (
              <Globe className="size-5" />
            ) : (
              getInitials(space.name)
            )}
          </AvatarFallback>
        </Avatar>
        {/* Online indicator for DMs — placeholder for presence */}
        {space.type === "dm" && (
          <span className="absolute bottom-0 right-0 size-3 rounded-full bg-muted-foreground/30 ring-2 ring-background" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {isPinned && !isGlobal && (
            <Pin className="size-3 text-muted-foreground shrink-0" />
          )}
          <span
            className={cn(
              "font-semibold truncate text-sm",
              unreadCount > 0 && "text-foreground",
            )}
          >
            {isGlobal ? labels.spaces.explore : space.name}
          </span>
          {(space.type === "large" || isGlobal) && space.member_count && (
            <span className="text-xs text-muted-foreground shrink-0">
              · {labels.spaces.members(space.member_count)}
            </span>
          )}
        </div>
        {lastMessagePreview && (
          <p
            className={cn(
              "text-sm truncate",
              unreadCount > 0
                ? "text-foreground font-medium"
                : "text-muted-foreground",
            )}
          >
            {lastMessagePreview}
          </p>
        )}
      </div>

      {/* Right side: time + unread */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <RelativeTime
          date={lastMessageTime}
          formatter={formatTimeAgoShort}
          className="text-xs text-muted-foreground"
        />
        {unreadCount > 0 && (
          <Badge className="h-5 min-w-5 flex items-center justify-center rounded-full px-1.5 text-[10px] font-bold">
            {unreadCount}
          </Badge>
        )}
      </div>
    </Link>
  );
}
