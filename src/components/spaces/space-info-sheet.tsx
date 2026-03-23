"use client";

import { useState, useCallback } from "react";
import { Trash2, Archive, ArchiveRestore } from "lucide-react";
import { useSWRConfig } from "swr";

import { toast } from "sonner";
import { labels } from "@/lib/labels";
import { cacheKeys } from "@/lib/swr/keys";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useProfileSearch } from "@/lib/hooks/use-profile-search";
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

function MemberRow({
  member,
  isAdmin,
  currentUserId,
  spaceId,
  onMemberChange,
}: {
  member: SpaceMemberWithProfile;
  isAdmin: boolean;
  currentUserId: string | null;
  spaceId: string;
  onMemberChange: () => void;
}) {
  const name = member.profiles?.full_name ?? "Unknown";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const isSelf = member.user_id === currentUserId;
  const showActions = isAdmin && !isSelf;

  const handleRemove = useCallback(async () => {
    const res = await fetch(
      `/api/spaces/${spaceId}/members/${member.user_id}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      onMemberChange();
    } else {
      toast.error("Failed to remove member");
    }
    setConfirmingRemove(false);
  }, [spaceId, member.user_id, onMemberChange]);

  const handleRoleToggle = useCallback(async () => {
    const newRole = member.role === "admin" ? "member" : "admin";
    const res = await fetch(
      `/api/spaces/${spaceId}/members/${member.user_id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      },
    );
    if (res.ok) {
      onMemberChange();
    } else {
      const data = await res.json().catch(() => null);
      if (data?.error?.message) {
        alert(data.error.message);
      }
    }
  }, [spaceId, member.user_id, member.role, onMemberChange]);

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
      {showActions ? (
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleRoleToggle}
            className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:bg-muted transition-colors"
          >
            {member.role === "admin"
              ? labels.spaces.memberManagement.admin
              : labels.spaces.memberManagement.member}
          </button>
          {confirmingRemove ? (
            <>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs"
                onClick={handleRemove}
              >
                {labels.activity.actions.confirm}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setConfirmingRemove(false)}
              >
                {labels.spaces.posting.cancel}
              </Button>
            </>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-destructive"
              onClick={() => setConfirmingRemove(true)}
              aria-label={labels.spaces.memberManagement.remove(name)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      ) : (
        member.role === "admin" && (
          <Badge variant="secondary" className="text-[10px]">
            Admin
          </Badge>
        )
      )}
    </div>
  );
}

function InviteMemberSection({
  spaceId,
  existingMemberIds,
  onMemberAdded,
}: {
  spaceId: string;
  existingMemberIds: Set<string>;
  onMemberAdded: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const { results, isLoading: searchLoading } = useProfileSearch(searchQuery);
  const [adding, setAdding] = useState(false);

  const handleAdd = useCallback(
    async (userId: string) => {
      setAdding(true);
      try {
        const res = await fetch(`/api/spaces/${spaceId}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId }),
        });
        if (res.ok) {
          setSearchQuery("");
          onMemberAdded();
        } else {
          toast.error("Failed to add member");
        }
      } finally {
        setAdding(false);
      }
    },
    [spaceId, onMemberAdded],
  );

  const filtered = results.filter((r) => !existingMemberIds.has(r.user_id));

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">
        {labels.spaces.memberManagement.inviteMember}
      </h3>
      <Input
        type="text"
        placeholder={labels.spaces.memberManagement.searchByName}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="h-9 text-sm"
      />
      {searchQuery.trim().length >= 2 && (
        <div className="max-h-40 overflow-y-auto space-y-1">
          {searchLoading ? (
            <p className="text-xs text-muted-foreground py-2">
              {labels.spaces.memberManagement.searching}
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              {labels.spaces.memberManagement.noResults}
            </p>
          ) : (
            filtered.map((profile) => (
              <button
                key={profile.user_id}
                type="button"
                onClick={() => handleAdd(profile.user_id)}
                disabled={adding}
                className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors text-left min-h-[36px]"
              >
                <span className="font-medium truncate">
                  {profile.full_name ?? "Unknown"}
                </span>
                {profile.headline && (
                  <span className="text-xs text-muted-foreground truncate">
                    {profile.headline}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
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
  const { mutate } = useSWRConfig();
  const isGlobal = space.id === GLOBAL_SPACE_ID;
  const isAdmin = currentMember?.role === "admin";
  const currentUserId = currentMember?.user_id ?? null;
  const [matchingEnabled, setMatchingEnabled] = useState(
    space.settings?.matching_enabled ?? false,
  );
  const [saving, setSaving] = useState(false);
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const isArchived = !!space.archived_at;

  const handleMemberChange = useCallback(() => {
    mutate(cacheKeys.space(space.id));
  }, [mutate, space.id]);

  const existingMemberIds = new Set(space.members.map((m) => m.user_id));

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

        <div className="mt-4 space-y-6 px-4">
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

              {/* Archive / Unarchive */}
              {!isGlobal && (
                <div className="pt-3 border-t border-border">
                  {confirmingArchive ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {labels.spaces.archiveConfirm}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs"
                          disabled={saving}
                          onClick={async () => {
                            setSaving(true);
                            try {
                              const res = await fetch(
                                `/api/spaces/${space.id}`,
                                {
                                  method: "PATCH",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({ archived: true }),
                                },
                              );
                              if (res.ok) {
                                toast.success(labels.spaces.archiveSpace);
                                mutate(cacheKeys.spaces());
                                mutate(cacheKeys.space(space.id));
                                onOpenChange(false);
                              }
                            } finally {
                              setSaving(false);
                              setConfirmingArchive(false);
                            }
                          }}
                        >
                          {labels.activity.actions.confirm}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => setConfirmingArchive(false)}
                        >
                          {labels.spaces.posting.cancel}
                        </Button>
                      </div>
                    </div>
                  ) : isArchived ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5"
                      disabled={saving}
                      onClick={async () => {
                        setSaving(true);
                        try {
                          const res = await fetch(`/api/spaces/${space.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ archived: false }),
                          });
                          if (res.ok) {
                            toast.success(labels.spaces.unarchiveSpace);
                            mutate(cacheKeys.spaces());
                            mutate(cacheKeys.space(space.id));
                          }
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      <ArchiveRestore className="size-3.5" />
                      {labels.spaces.unarchiveSpace}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => setConfirmingArchive(true)}
                    >
                      <Archive className="size-3.5" />
                      {labels.spaces.archiveSpace}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Members */}
          <div>
            <h3 className="text-sm font-medium mb-2">
              {labels.spaces.memberList} ({space.members.length})
            </h3>
            <div className="divide-y divide-border">
              {space.members.map((member) => (
                <MemberRow
                  key={member.user_id}
                  member={member}
                  isAdmin={isAdmin}
                  currentUserId={currentUserId}
                  spaceId={space.id}
                  onMemberChange={handleMemberChange}
                />
              ))}
            </div>
          </div>

          {/* Invite member (admin only) */}
          {isAdmin && (
            <InviteMemberSection
              spaceId={space.id}
              existingMemberIds={existingMemberIds}
              onMemberAdded={handleMemberChange}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
