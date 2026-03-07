"use client";

import { useState, useCallback } from "react";
import {
  GripVertical,
  X,
  UserPlus,
  Search,
  Check,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { useConnections } from "@/lib/hooks/use-connections";
import { formatScore } from "@/lib/matching/scoring";
import { getInitials } from "@/lib/format";
import type { MatchedProfile } from "@/lib/hooks/use-posting-detail";

type ConnectionItem = {
  user_id: string;
  full_name: string;
};

interface InvitePickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedConnections: ConnectionItem[];
  onChange: (connections: ConnectionItem[]) => void;
  currentUserId: string;
  suggestedProfiles?: MatchedProfile[];
  inviteMode?: "sequential" | "parallel";
}

export function InvitePickerSheet({
  open,
  onOpenChange,
  selectedConnections,
  onChange,
  currentUserId,
  suggestedProfiles = [],
  inviteMode = "sequential",
}: InvitePickerSheetProps) {
  const { connections, isLoading } = useConnections();
  const [filter, setFilter] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Build connection list
  const acceptedConnections: ConnectionItem[] = connections
    .filter((f) => f.status === "accepted")
    .map((f) => {
      if (f.user_id === currentUserId) {
        return {
          user_id: f.friend_id,
          full_name: f.friend?.full_name ?? "Unknown",
        };
      }
      return {
        user_id: f.user_id,
        full_name: f.user?.full_name ?? "Unknown",
      };
    });

  const selectedIds = new Set(selectedConnections.map((c) => c.user_id));

  const filteredConnections = acceptedConnections.filter((c) => {
    if (selectedIds.has(c.user_id)) return false;
    if (!filter) return true;
    return c.full_name.toLowerCase().includes(filter.toLowerCase());
  });

  // Suggested profiles not already selected
  const filteredSuggested = suggestedProfiles.filter(
    (p) => !selectedIds.has(p.user_id),
  );

  const addConnection = useCallback(
    (connection: ConnectionItem) => {
      onChange([...selectedConnections, connection]);
    },
    [selectedConnections, onChange],
  );

  const removeConnection = useCallback(
    (userId: string) => {
      onChange(selectedConnections.filter((c) => c.user_id !== userId));
    },
    [selectedConnections, onChange],
  );

  // Drag-to-reorder
  const handleDragStart = (index: number) => setDragIndex(index);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const reordered = [...selectedConnections];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    onChange(reordered);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] rounded-t-xl"
        showCloseButton={false}
      >
        <SheetHeader>
          <SheetTitle>{labels.invite.pickerTitle}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2 rounded-md border px-3 py-2">
            <Search className="size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={labels.invite.pickerSearch}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Selected connections (ordered list) */}
          {selectedConnections.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                {inviteMode === "sequential"
                  ? "Ask order (drag to reorder)"
                  : "Selected connections"}
              </p>
              {selectedConnections.map((connection, index) => (
                <div
                  key={connection.user_id}
                  draggable={inviteMode === "sequential"}
                  onDragStart={
                    inviteMode === "sequential"
                      ? () => handleDragStart(index)
                      : undefined
                  }
                  onDragOver={
                    inviteMode === "sequential"
                      ? (e) => handleDragOver(e, index)
                      : undefined
                  }
                  onDrop={
                    inviteMode === "sequential"
                      ? () => handleDrop(index)
                      : undefined
                  }
                  onDragEnd={
                    inviteMode === "sequential" ? handleDragEnd : undefined
                  }
                  className={cn(
                    "flex items-center gap-2 rounded-md border bg-background p-2 transition-colors",
                    inviteMode === "sequential" &&
                      "cursor-grab active:cursor-grabbing",
                    dragIndex === index && "opacity-50",
                    dragOverIndex === index &&
                      dragIndex !== index &&
                      "border-primary bg-primary/5",
                  )}
                >
                  {inviteMode === "sequential" && (
                    <>
                      <GripVertical className="size-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium text-muted-foreground w-6 shrink-0">
                        {index + 1}.
                      </span>
                    </>
                  )}
                  <span className="text-sm truncate flex-1">
                    {connection.full_name}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0"
                    onClick={() => removeConnection(connection.user_id)}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Suggested profiles */}
          {filteredSuggested.length > 0 && !filter && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Sparkles className="size-3" />
                {labels.invite.pickerSuggested}
              </p>
              {filteredSuggested.map((profile) => (
                <button
                  key={profile.user_id}
                  type="button"
                  onClick={() =>
                    addConnection({
                      user_id: profile.user_id,
                      full_name: profile.full_name ?? "Unknown",
                    })
                  }
                  className="flex w-full items-center gap-3 rounded-md border border-dashed p-2 text-left transition-colors hover:border-primary hover:bg-primary/5"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {getInitials(profile.full_name)}
                  </div>
                  <span className="text-sm truncate flex-1">
                    {profile.full_name ?? "Anonymous"}
                  </span>
                  <Badge variant="default" className="shrink-0 text-xs">
                    {formatScore(profile.overall_score)}
                  </Badge>
                  <UserPlus className="size-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Available connections */}
          {isLoading ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : filteredConnections.length > 0 ? (
            <div className="space-y-1">
              {filteredConnections.map((connection) => (
                <button
                  key={connection.user_id}
                  type="button"
                  onClick={() => addConnection(connection)}
                  className="flex w-full items-center gap-3 rounded-md p-2 text-left text-sm transition-colors hover:bg-accent/50"
                >
                  <div className="flex size-4 shrink-0 items-center justify-center rounded border border-muted-foreground">
                    {selectedIds.has(connection.user_id) && (
                      <Check className="size-3" />
                    )}
                  </div>
                  <span className="truncate">{connection.full_name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {filter
                ? labels.invite.pickerNoMatches
                : labels.invite.pickerNoConnections}
            </div>
          )}
        </div>

        <SheetFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full">
            {labels.invite.pickerDone}
            {selectedConnections.length > 0
              ? ` (${selectedConnections.length})`
              : ""}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
