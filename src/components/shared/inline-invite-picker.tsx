"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Check, Search } from "lucide-react";
import { useConnections } from "@/lib/hooks/use-connections";

export interface InvitedUser {
  user_id: string;
  full_name: string;
}

interface InlineInvitePickerProps {
  position: { top: number; left: number };
  selected: InvitedUser[];
  onDone: (users: InvitedUser[]) => void;
  onClose: () => void;
}

export function InlineInvitePicker({
  position,
  selected,
  onDone,
  onClose,
}: InlineInvitePickerProps) {
  const { connections, isLoading } = useConnections();
  const [filter, setFilter] = useState("");
  const [localSelected, setLocalSelected] = useState<Map<string, string>>(
    () => new Map(selected.map((u) => [u.user_id, u.full_name])),
  );
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the filter input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [onClose],
  );

  const toggleUser = (userId: string, fullName: string) => {
    setLocalSelected((prev) => {
      const next = new Map(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.set(userId, fullName);
      }
      return next;
    });
  };

  const handleDone = () => {
    const users: InvitedUser[] = Array.from(localSelected.entries()).map(
      ([user_id, full_name]) => ({ user_id, full_name }),
    );
    onDone(users);
  };

  // Build the list of connection users (deduplicating friend/user sides)
  const connectionUsers = connections
    .map((c) => {
      const friend = c.friend ?? c.user;
      if (!friend) return null;
      return {
        user_id: friend.user_id,
        full_name: friend.full_name ?? "Unknown",
      };
    })
    .filter(Boolean) as InvitedUser[];

  const filteredUsers = filter
    ? connectionUsers.filter((u) =>
        u.full_name.toLowerCase().includes(filter.toLowerCase()),
      )
    : connectionUsers;

  const picker = (
    <div
      ref={menuRef}
      role="dialog"
      aria-label="Invite connections"
      className="fixed z-50 w-72 rounded-lg border bg-popover shadow-lg"
      style={{ top: position.top, left: position.left }}
      onKeyDown={handleKeyDown}
    >
      {/* Search input */}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search connections..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Connection list */}
      <div className="max-h-48 overflow-y-auto p-1">
        {isLoading && (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        )}
        {!isLoading && filteredUsers.length === 0 && (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            {filter ? "No matches" : "No connections yet"}
          </div>
        )}
        {filteredUsers.map((user) => {
          const isChecked = localSelected.has(user.user_id);
          return (
            <button
              key={user.user_id}
              type="button"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => toggleUser(user.user_id, user.full_name)}
            >
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  isChecked
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground"
                }`}
              >
                {isChecked && <Check className="h-3 w-3" />}
              </div>
              <span className="truncate">{user.full_name}</span>
            </button>
          );
        })}
      </div>

      {/* Done button */}
      <div className="border-t px-3 py-2">
        <button
          type="button"
          className="w-full rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          onClick={handleDone}
        >
          Done{localSelected.size > 0 ? ` (${localSelected.size})` : ""}
        </button>
      </div>
    </div>
  );

  return createPortal(picker, document.body);
}
