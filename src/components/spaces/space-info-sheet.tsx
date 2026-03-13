"use client";

import { useState, useCallback } from "react";

import { labels } from "@/lib/labels";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type {
  SpaceDetail,
  SpaceMemberWithProfile,
} from "@/lib/hooks/use-space";
import { GLOBAL_SPACE_ID, type SpaceMember } from "@/lib/supabase/types";

interface SpaceInfoSheetProps {
  space: SpaceDetail;
  currentMember: SpaceMember | null;
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
  currentMember,
  open,
  onOpenChange,
}: SpaceInfoSheetProps) {
  const isGlobal = space.id === GLOBAL_SPACE_ID;
  const isAdmin = currentMember?.role === "admin";
  const [matchingEnabled, setMatchingEnabled] = useState(
    space.settings?.matching_enabled ?? false,
  );
  const [saving, setSaving] = useState(false);

  const toggleMatching = useCallback(
    async (checked: boolean) => {
      setMatchingEnabled(checked);
      setSaving(true);
      try {
        const res = await fetch(`/api/spaces/${space.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            settings: { ...space.settings, matching_enabled: checked },
          }),
        });
        if (!res.ok) {
          // Revert on failure
          setMatchingEnabled(!checked);
        }
      } catch {
        setMatchingEnabled(!checked);
      } finally {
        setSaving(false);
      }
    },
    [space.id, space.settings],
  );

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

          {/* Admin settings */}
          {isAdmin && (
            <div>
              <h3 className="text-sm font-medium mb-3">
                {labels.spaces.spaceSettings}
              </h3>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="matching-toggle" className="text-sm">
                    {labels.spaces.postingBrowser.enableMatching}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {labels.spaces.postingBrowser.enableMatchingDescription}
                  </p>
                </div>
                <Switch
                  id="matching-toggle"
                  checked={matchingEnabled}
                  onCheckedChange={toggleMatching}
                  disabled={saving}
                />
              </div>
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
