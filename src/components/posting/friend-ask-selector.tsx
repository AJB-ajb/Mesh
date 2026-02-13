"use client";

import { useState, useCallback } from "react";
import { GripVertical, X, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useFriendships } from "@/lib/hooks/use-friendships";

type FriendItem = {
  user_id: string;
  full_name: string;
};

interface FriendAskSelectorProps {
  currentUserId: string;
  selectedFriends: FriendItem[];
  onChange: (friends: FriendItem[]) => void;
}

/**
 * Select friends and drag to reorder for a friend-ask sequence.
 * The order determines who gets asked first, second, etc.
 */
export function FriendAskSelector({
  currentUserId,
  selectedFriends,
  onChange,
}: FriendAskSelectorProps) {
  const { friendships, isLoading } = useFriendships();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Only accepted friends are selectable
  const acceptedFriends: FriendItem[] = friendships
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

  const selectedIds = new Set(selectedFriends.map((f) => f.user_id));
  const available = acceptedFriends.filter((f) => !selectedIds.has(f.user_id));

  const addFriend = useCallback(
    (friend: FriendItem) => {
      onChange([...selectedFriends, friend]);
    },
    [selectedFriends, onChange],
  );

  const removeFriend = useCallback(
    (userId: string) => {
      onChange(selectedFriends.filter((f) => f.user_id !== userId));
    },
    [selectedFriends, onChange],
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

    const reordered = [...selectedFriends];
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
      {/* Selected friends (ordered) */}
      {selectedFriends.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Ask order (drag to reorder)
          </p>
          <div className="space-y-1">
            {selectedFriends.map((friend, index) => (
              <div
                key={friend.user_id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "flex items-center gap-2 rounded-md border border-border bg-background p-2 cursor-grab active:cursor-grabbing transition-colors",
                  dragIndex === index && "opacity-50",
                  dragOverIndex === index &&
                    dragIndex !== index &&
                    "border-primary bg-primary/5",
                )}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-muted-foreground w-6 shrink-0">
                  {index + 1}.
                </span>
                <span className="text-sm truncate flex-1">
                  {friend.full_name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => removeFriend(friend.user_id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available friends to add */}
      {available.length > 0 ? (
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Add friends
          </p>
          <div className="space-y-1">
            {available.map((friend) => (
              <button
                key={friend.user_id}
                type="button"
                onClick={() => addFriend(friend)}
                className="flex w-full items-center gap-2 rounded-md border border-dashed border-border p-2 text-left transition-colors hover:border-primary hover:bg-primary/5"
              >
                <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{friend.full_name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        selectedFriends.length === 0 && (
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                No friends available. Add friends first to use Friend-Ask mode.
              </p>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
