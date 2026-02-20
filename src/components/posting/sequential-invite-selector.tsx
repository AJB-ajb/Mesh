"use client";

import { useState, useCallback } from "react";
import { GripVertical, X, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useConnections } from "@/lib/hooks/use-connections";

type ConnectionItem = {
  user_id: string;
  full_name: string;
};

interface SequentialInviteSelectorProps {
  currentUserId: string;
  selectedConnections: ConnectionItem[];
  onChange: (connections: ConnectionItem[]) => void;
  inviteMode?: "sequential" | "parallel";
}

/**
 * Select connections and drag to reorder for a sequential invite.
 * The order determines who gets asked first, second, etc.
 */
export function SequentialInviteSelector({
  currentUserId,
  selectedConnections,
  onChange,
  inviteMode = "sequential",
}: SequentialInviteSelectorProps) {
  const { connections, isLoading } = useConnections();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Only accepted connections are selectable
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
  const available = acceptedConnections.filter(
    (c) => !selectedIds.has(c.user_id),
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

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

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

  if (isLoading) {
    return (
      <div className="h-32 animate-pulse rounded-lg border border-border bg-muted/30" />
    );
  }

  return (
    <div className="space-y-4">
      {/* Selected connections (ordered) */}
      {selectedConnections.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            {inviteMode === "sequential"
              ? "Ask order (drag to reorder)"
              : "Selected connections"}
          </p>
          <div className="space-y-1">
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
                  "flex items-center gap-2 rounded-md border border-border bg-background p-2 transition-colors",
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
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
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
                  className="h-6 w-6 shrink-0"
                  onClick={() => removeConnection(connection.user_id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available connections to add */}
      {available.length > 0 ? (
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Add connections
          </p>
          <div className="space-y-1">
            {available.map((connection) => (
              <button
                key={connection.user_id}
                type="button"
                onClick={() => addConnection(connection)}
                className="flex w-full items-center gap-2 rounded-md border border-dashed border-border p-2 text-left transition-colors hover:border-primary hover:bg-primary/5"
              >
                <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{connection.full_name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        selectedConnections.length === 0 && (
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                No connections available. Connect with others first to use
                Sequential Invite mode.
              </p>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
