"use client";

import Link from "next/link";
import { Pin, Globe } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Space } from "./mock-data";

type SpaceListItemProps = {
  space: Space;
};

export function SpaceListItem({ space }: SpaceListItemProps) {
  return (
    <Link
      href={`/spaces/${space.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors active:bg-muted min-h-[68px]"
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar size="lg">
          <AvatarFallback
            className={cn(
              space.type === "global" && "bg-primary text-primary-foreground",
            )}
          >
            {space.type === "global" ? (
              <Globe className="size-5" />
            ) : (
              space.avatarInitials
            )}
          </AvatarFallback>
        </Avatar>
        {/* Online indicator for DMs */}
        {space.type === "dm" && space.online && (
          <span className="absolute bottom-0 right-0 size-3 rounded-full bg-green-500 ring-2 ring-background" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {space.pinned && space.type !== "global" && (
            <Pin className="size-3 text-muted-foreground shrink-0" />
          )}
          <span className="font-semibold truncate text-sm">{space.name}</span>
          {space.type === "large" && (
            <span className="text-xs text-muted-foreground shrink-0">
              · {space.memberCount} members
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {space.lastMessage}
        </p>
      </div>

      {/* Right side: time + unread */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-xs text-muted-foreground">
          {space.lastMessageTime}
        </span>
        {space.unreadCount > 0 && (
          <Badge className="h-5 min-w-5 flex items-center justify-center rounded-full px-1.5 text-[10px] font-bold">
            {space.unreadCount}
          </Badge>
        )}
      </div>
    </Link>
  );
}
