"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  X,
  UserPlus,
  Search,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { useMobileKeyboard } from "@/lib/hooks/use-mobile-keyboard";
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
  const { keyboardVisible, keyboardHeight } = useMobileKeyboard();
  const [filter, setFilter] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Memoize the keyboard-dependent style so it only changes when the actual
  // values change, not on every render. This prevents the SheetContent DOM
  // from being updated on unrelated re-renders which can reset the mobile
  // input cursor position.
  const sheetStyle = useMemo(
    () => ({
      maxHeight: keyboardVisible ? `calc(85vh - ${keyboardHeight}px)` : "85vh",
      paddingBottom: keyboardVisible ? `${keyboardHeight}px` : undefined,
      transition: "max-height 0.15s ease-out, padding-bottom 0.15s ease-out",
    }),
    [keyboardVisible, keyboardHeight],
  );
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

  // Reorder via pointer (touch + mouse) drag
  const pointerOrigin = useRef<{ index: number; y: number } | null>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const handlePointerDown = useCallback(
    (index: number, e: React.PointerEvent) => {
      if (inviteMode !== "sequential") return;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      pointerOrigin.current = { index, y: e.clientY };
      setDragIndex(index);
    },
    [inviteMode],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const origin = pointerOrigin.current;
    if (!origin) return;
    // Determine which item the pointer is over based on midpoints
    for (const [idx, el] of itemRefs.current) {
      const rect = el.getBoundingClientRect();
      if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
        setDragOverIndex(idx !== origin.index ? idx : null);
        return;
      }
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    const origin = pointerOrigin.current;
    if (origin && dragOverIndex !== null && dragOverIndex !== origin.index) {
      const reordered = [...selectedConnections];
      const [moved] = reordered.splice(origin.index, 1);
      reordered.splice(dragOverIndex, 0, moved);
      onChange(reordered);
    }
    pointerOrigin.current = null;
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragOverIndex, selectedConnections, onChange]);

  // Button-based reorder (accessible fallback)
  const moveItem = useCallback(
    (index: number, direction: -1 | 1) => {
      const target = index + direction;
      if (target < 0 || target >= selectedConnections.length) return;
      const reordered = [...selectedConnections];
      [reordered[index], reordered[target]] = [
        reordered[target],
        reordered[index],
      ];
      onChange(reordered);
    },
    [selectedConnections, onChange],
  );

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) setFilter("");
        onOpenChange(isOpen);
      }}
    >
      <SheetContent
        side="bottom"
        className="rounded-t-xl"
        style={sheetStyle}
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
              ref={inputRef}
              type="text"
              inputMode="search"
              autoComplete="off"
              autoCorrect="off"
              dir="ltr"
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
                  ? labels.invite.pickerAskOrder
                  : labels.invite.pickerSelected}
              </p>
              {selectedConnections.map((connection, index) => (
                <div
                  key={connection.user_id}
                  ref={(el) => {
                    if (el) itemRefs.current.set(index, el);
                    else itemRefs.current.delete(index);
                  }}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className={cn(
                    "flex items-center gap-2 rounded-md border bg-background p-2 transition-colors select-none",
                    dragIndex === index && "opacity-50",
                    dragOverIndex === index &&
                      dragIndex !== index &&
                      "border-primary bg-primary/5",
                  )}
                >
                  {inviteMode === "sequential" && (
                    <>
                      <GripVertical
                        className="size-4 text-muted-foreground shrink-0 touch-none cursor-grab active:cursor-grabbing"
                        onPointerDown={(e) => handlePointerDown(index, e)}
                      />
                      <span className="text-sm font-medium text-muted-foreground w-6 shrink-0">
                        {index + 1}.
                      </span>
                    </>
                  )}
                  <span className="text-sm truncate flex-1">
                    {connection.full_name}
                  </span>
                  {inviteMode === "sequential" && (
                    <div className="flex flex-col shrink-0">
                      <button
                        type="button"
                        className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        disabled={index === 0}
                        onClick={() => moveItem(index, -1)}
                        aria-label={`Move ${connection.full_name} up`}
                      >
                        <ChevronUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        disabled={index === selectedConnections.length - 1}
                        onClick={() => moveItem(index, 1)}
                        aria-label={`Move ${connection.full_name} down`}
                      >
                        <ChevronDown className="size-3.5" />
                      </button>
                    </div>
                  )}
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
              {labels.common.loading}
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
                  <UserPlus className="size-4 text-muted-foreground shrink-0" />
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
