"use client";

import { labels } from "@/lib/labels";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { SpaceDetail, SpaceMemberWithProfile } from "@/lib/hooks/use-space";
import { GLOBAL_SPACE_ID } from "@/lib/supabase/types";

interface SpaceInfoSheetProps {
  space: SpaceDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function MemberRow({ member }: { member: SpaceMemberWithProfile }) {
  const name = member.profiles?.full_name ?? "Unknown";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 py-2">
      <Avatar size="sm">
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
        {member.profiles?.headline && (
          <p className="text-xs text-muted-foreground truncate">
            {member.profiles.headline}
          </p>
        )}
      </div>
      {member.role === "admin" && (
        <Badge variant="secondary" className="text-[10px]">
          Admin
        </Badge>
      )}
    </div>
  );
}

export function SpaceInfoSheet({
  space,
  open,
  onOpenChange,
}: SpaceInfoSheetProps) {
  const isGlobal = space.id === GLOBAL_SPACE_ID;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {isGlobal ? labels.spaces.explore : space.name}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          {/* State text / description */}
          {space.state_text && (
            <div>
              <h3 className="text-sm font-medium mb-1">
                {labels.spaces.stateText}
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {space.state_text}
              </p>
            </div>
          )}

          {/* Members */}
          <div>
            <h3 className="text-sm font-medium mb-2">
              {labels.spaces.memberList} ({space.members.length})
            </h3>
            <div className="divide-y divide-border">
              {space.members.map((member) => (
                <MemberRow key={member.user_id} member={member} />
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
