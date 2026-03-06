"use client";

import { useState, useCallback } from "react";
import { Copy, Link2, X, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { labels } from "@/lib/labels";
import {
  InlineInvitePicker,
  type InvitedUser,
} from "@/components/shared/inline-invite-picker";
import {
  PostingSettingsRow,
  type PostingSettings,
} from "./posting-settings-row";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContextBarState {
  /** Parent posting (group context) */
  parentPostingId: string;
  parentPostingTitle: string | null;
  parentMemberCount: number | null;
  /** Invited users */
  invitedUsers: InvitedUser[];
  /** Link */
  linkToken: string | null;
  /** Discover toggle */
  inDiscover: boolean;
  /** Settings row */
  settings: PostingSettings;
}

interface PostingContextBarProps {
  state: ContextBarState;
  onChange: (state: ContextBarState) => void;
}

// ---------------------------------------------------------------------------
// Summary line
// ---------------------------------------------------------------------------

function buildSummary(state: ContextBarState): string {
  const l = labels.contextBar;
  const parts: string[] = [];
  const hasContext = !!state.parentPostingId;
  const hasInvitees = state.invitedUsers.length > 0;
  const hasLink = !!state.linkToken;

  // Context
  if (hasContext && state.parentPostingTitle) {
    parts.push(
      l.summaryMembers(state.parentPostingTitle, state.parentMemberCount ?? 0),
    );
  }

  // Invitees
  if (hasInvitees) {
    const names = state.invitedUsers.map((u) => u.full_name);
    if (names.length <= 3) {
      parts.push(names.join(", "));
    } else {
      parts.push(l.summaryInvited(names.length));
    }
  }

  // Link
  if (hasLink) {
    parts.push(l.summaryAnyoneWithLink);
  }

  // Discover
  if (state.inDiscover) {
    if (parts.length === 0) {
      return l.summaryEveryone;
    }
    return l.summaryPlusDiscover(parts.join(" + "));
  }

  if (parts.length === 0) {
    return l.summaryEveryone;
  }

  if (!hasContext && !hasLink && hasInvitees) {
    const names = state.invitedUsers.map((u) => u.full_name);
    if (names.length <= 3) {
      return l.summaryOnly(names.join(" and "));
    }
  }

  return parts.join(" + ");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PostingContextBar({ state, onChange }: PostingContextBarProps) {
  const l = labels.contextBar;
  const [showInvitePicker, setShowInvitePicker] = useState(false);
  const [inviteButtonRef, setInviteButtonRef] =
    useState<HTMLButtonElement | null>(null);

  const update = useCallback(
    (partial: Partial<ContextBarState>) => onChange({ ...state, ...partial }),
    [state, onChange],
  );

  // Link management
  const handleCreateLink = useCallback(() => {
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    update({ linkToken: token });
  }, [update]);

  const handleCopyLink = useCallback(() => {
    if (!state.linkToken) return;
    const url = `${window.location.origin}/p/${state.linkToken}`;
    navigator.clipboard.writeText(url);
    toast.success(l.linkCopied);
  }, [state.linkToken, l.linkCopied]);

  const handleRevokeLink = useCallback(() => {
    update({ linkToken: null });
  }, [update]);

  // Invite picker position (relative to button)
  const getInvitePickerPosition = () => {
    if (!inviteButtonRef) return { top: 200, left: 100 };
    const rect = inviteButtonRef.getBoundingClientRect();
    return { top: rect.bottom + 4, left: rect.left };
  };

  // Remove invited user
  const removeInvitedUser = (userId: string) => {
    update({
      invitedUsers: state.invitedUsers.filter((u) => u.user_id !== userId),
    });
  };

  const summary = buildSummary(state);

  return (
    <div className="space-y-2 rounded-lg border bg-card p-3 text-sm">
      {/* Context row */}
      {state.parentPostingId && state.parentPostingTitle && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="size-4 shrink-0" />
          <span className="font-medium text-foreground">
            {state.parentPostingTitle}
          </span>
        </div>
      )}

      {/* Invite row */}
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">
          {l.inviteLabel}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {state.invitedUsers.map((user) => (
            <span
              key={user.user_id}
              className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium"
            >
              {user.full_name}
              <button
                type="button"
                onClick={() => removeInvitedUser(user.user_id)}
                className="rounded-full p-0.5 hover:bg-accent-foreground/10"
                aria-label={`Remove ${user.full_name}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <button
            ref={setInviteButtonRef}
            type="button"
            onClick={() => setShowInvitePicker(true)}
            className="text-xs text-primary hover:underline"
          >
            {l.inviteAdd}
          </button>
        </div>
      </div>

      {/* Link row */}
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">
          {l.linkLabel}
        </span>
        {state.linkToken ? (
          <div className="flex items-center gap-2">
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              /p/{state.linkToken.slice(0, 8)}...
            </code>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleCopyLink}
            >
              <Copy className="mr-1 size-3" />
              {l.linkCopy}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-destructive hover:text-destructive"
              onClick={handleRevokeLink}
            >
              {l.linkRevoke}
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleCreateLink}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Link2 className="size-3" />
            {l.linkCreate}
          </button>
        )}
      </div>

      {/* Discover toggle */}
      <div className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">
          {/* spacer to align with rows above */}
        </span>
        <div className="flex items-center gap-2">
          <Switch
            id="discover-toggle"
            checked={state.inDiscover}
            onCheckedChange={(checked) => update({ inDiscover: checked })}
          />
          <label htmlFor="discover-toggle" className="text-xs">
            {l.discoverLabel}
          </label>
        </div>
      </div>

      {/* Summary line */}
      <div className="border-t pt-2 text-xs text-muted-foreground">
        <span className="font-medium">{l.summaryPrefix}</span> {summary}
      </div>

      {/* Settings row */}
      <PostingSettingsRow
        settings={state.settings}
        onChange={(settings) => update({ settings })}
      />

      {/* Invite picker overlay */}
      {showInvitePicker && (
        <InlineInvitePicker
          position={getInvitePickerPosition()}
          selected={state.invitedUsers}
          onDone={(users) => {
            update({ invitedUsers: users });
            setShowInvitePicker(false);
          }}
          onClose={() => setShowInvitePicker(false)}
        />
      )}
    </div>
  );
}
