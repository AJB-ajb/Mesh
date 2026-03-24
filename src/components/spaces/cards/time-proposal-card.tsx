"use client";

import { Check, X, Clock, Users, Lock, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SpaceCard, TimeProposalData } from "@/lib/supabase/types";
import { CardDeadlineBadge } from "./card-deadline-badge";
import { CalendarContextStrip } from "./calendar-context-strip";
import { AddToCalendar } from "./add-to-calendar";
import type { CalendarEventParams } from "@/lib/calendar/event-links";
import type { SpaceMemberWithProfile } from "@/lib/hooks/use-space";

interface TimeProposalCardProps {
  card: SpaceCard;
  userId: string | null;
  members?: SpaceMemberWithProfile[];
  onVote: (cardId: string, optionIndex: number) => void;
  onResolve: (cardId: string) => void;
  onCancel: (cardId: string) => void;
  onOptOut?: (cardId: string, reason: "cant_make_any" | "pass") => void;
  onUndoOptOut?: (cardId: string) => void;
  onCommit?: (
    cardId: string,
    commitment: "attending" | "maybe" | "cant_make_it",
  ) => void;
}

export function TimeProposalCard({
  card,
  userId,
  members,
  onVote,
  onResolve,
  onCancel,
  onOptOut,
  onUndoOptOut,
  onCommit,
}: TimeProposalCardProps) {
  const data = card.data as TimeProposalData;
  const isActive = card.status === "active";
  const isCreator = card.created_by === userId;
  const memberCount = members?.length ?? 0;

  // Find the option with the most votes (consensus indicator)
  const maxVotes = Math.max(...data.options.map((opt) => opt.votes.length), 0);

  // Opt-out state
  const optOuts = card.opt_outs ?? [];
  const userOptOut = userId
    ? optOuts.find((o) => o.user_id === userId)
    : undefined;
  const otherOptOuts = optOuts.filter((o) => o.user_id !== userId);

  // Quorum
  const quorum = data.quorum;

  return (
    <div className="mx-auto w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Clock className="size-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {labels.cards.timeProposal}
        </span>
        {isActive && card.deadline && (
          <span className="ml-auto">
            <CardDeadlineBadge deadline={card.deadline} />
          </span>
        )}
        {!isActive && (
          <span
            className={cn(
              "ml-auto text-xs font-medium px-2 py-0.5 rounded-full",
              card.status === "resolved"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-muted text-muted-foreground",
            )}
          >
            {card.status === "resolved"
              ? labels.cards.resolved
              : labels.cards.cancelled}
          </span>
        )}
      </div>

      {/* Title */}
      <p className="font-medium text-sm mb-1">{data.title}</p>
      <p className="text-xs text-muted-foreground mb-1">
        {labels.cards.timeProposalHint}
      </p>

      {/* Quorum display */}
      {quorum && (
        <p className="text-xs text-muted-foreground mb-2">
          {labels.cards.quorumLabel}: {quorum}
        </p>
      )}

      {/* Resolved slot */}
      {card.status === "resolved" && data.resolved_slot && (
        <div className="mb-3 p-2 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            {data.resolved_slot}
          </p>
        </div>
      )}

      {/* Post-resolution commitment strip */}
      {card.status === "resolved" && data.resolved_slot && userId && (
        <CommitmentStrip
          card={card}
          data={data}
          userId={userId}
          members={members}
          onCommit={onCommit}
        />
      )}

      {/* Time slot options */}
      <div className="space-y-2">
        {data.options.map((option, idx) => {
          const voteCount = option.votes.length;
          const isSelected = userId ? option.votes.includes(userId) : false;
          const isConsensus =
            voteCount > 0 &&
            voteCount === maxVotes &&
            memberCount > 0 &&
            voteCount >= Math.ceil(memberCount / 2);

          const slotTime = data.slot_times?.[idx];

          return (
            <div key={idx} className="space-y-1">
              <button
                type="button"
                disabled={!isActive || !userId || !!userOptOut}
                onClick={() => onVote(card.id, idx)}
                className={cn(
                  "relative w-full text-left rounded-md border px-3 py-2 text-sm transition-colors",
                  isActive && userId && !userOptOut
                    ? "hover:border-primary cursor-pointer"
                    : "cursor-default",
                  isSelected ? "border-primary bg-primary/5" : "border-border",
                  isConsensus && isActive && "ring-1 ring-green-500/50",
                  userOptOut && "opacity-50",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    {isSelected && (
                      <Check className="size-3.5 text-primary shrink-0" />
                    )}
                    <span>{option.label}</span>
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <Users className="size-3" />
                    {voteCount}
                  </span>
                </div>

                {/* Who voted — show names */}
                {voteCount > 0 && members && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {option.votes
                      .map((uid) => {
                        const member = members.find((m) => m.user_id === uid);
                        return member?.profiles?.full_name ?? "Someone";
                      })
                      .join(", ")}
                  </div>
                )}
              </button>

              {/* Calendar context strip — shows busy blocks for this day */}
              {isActive && slotTime && userId && !userOptOut && (
                <CalendarContextStrip
                  date={slotTime.start.split("T")[0]}
                  highlightStart={slotTime.start}
                  highlightEnd={slotTime.end}
                  profileId={userId}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Opt-out section */}
      {isActive && userId && !userOptOut && onOptOut && (
        <div className="mt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <MoreHorizontal className="size-3.5" />
                <span>{labels.cards.optOutMenu}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => onOptOut(card.id, "cant_make_any")}
              >
                {labels.cards.cantMakeAny}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOptOut(card.id, "pass")}>
                {labels.cards.pass}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* User's opt-out status with undo */}
      {isActive && userId && userOptOut && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">
            {userOptOut.reason === "cant_make_any"
              ? labels.cards.cantMakeAny
              : labels.cards.pass}
          </span>
          {onUndoOptOut && (
            <button
              type="button"
              onClick={() => onUndoOptOut(card.id)}
              className="text-primary hover:underline"
            >
              {labels.cards.optOutUndo}
            </button>
          )}
        </div>
      )}

      {/* Other members who opted out */}
      {otherOptOuts.length > 0 && members && (
        <div className="mt-1 text-xs text-muted-foreground">
          {otherOptOuts
            .map((o) => {
              const member = members.find((m) => m.user_id === o.user_id);
              const name = member?.profiles?.full_name ?? "Someone";
              const reason =
                o.reason === "pass"
                  ? labels.cards.pass
                  : labels.cards.cantMakeAny;
              return `${name}: ${reason}`;
            })
            .join(" · ")}
        </div>
      )}

      {/* Private constraint note for current user */}
      {isActive && userId && data.member_notes?.[userId] && (
        <div className="flex items-start gap-1.5 mt-2 text-xs text-muted-foreground">
          <Lock className="size-3 shrink-0 mt-0.5" />
          <span>{data.member_notes[userId]}</span>
        </div>
      )}

      {/* Footer with invalidation buttons */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground">
          {labels.cards.timeProposalVoteHint}
        </span>

        {isActive && isCreator && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onCancel(card.id)}
            >
              <X className="size-3 mr-1" />
              {labels.cards.cancelCard}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onResolve(card.id)}
            >
              <Check className="size-3 mr-1" />
              {labels.cards.resolveCard}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Parse the resolved slot into CalendarEventParams for the AddToCalendar component. */
function parseResolvedEvent(
  data: TimeProposalData,
): CalendarEventParams | null {
  const resolvedSlot = data.resolved_slot;
  if (!resolvedSlot) return null;

  let start: Date | null = null;
  let end: Date | null = null;

  // Try structured slot_times first
  if (data.slot_times) {
    const slotIndex = data.options.findIndex((o) => o.label === resolvedSlot);
    if (slotIndex >= 0 && data.slot_times[slotIndex]) {
      start = new Date(data.slot_times[slotIndex].start);
      end = new Date(data.slot_times[slotIndex].end);
    }
  }

  // Fall back to parsing the label
  if (!start) {
    const parsed = new Date(resolvedSlot);
    if (isNaN(parsed.getTime())) return null;
    start = parsed;
    end = new Date(start.getTime() + (data.duration_minutes || 60) * 60 * 1000);
  }

  if (!start || !end) return null;
  return { title: data.title ?? "Meeting", start, end };
}

/** Post-resolution commitment strip — shown below the winning slot on resolved cards. */
function CommitmentStrip({
  card,
  data,
  userId,
  members,
  onCommit,
}: {
  card: SpaceCard;
  data: TimeProposalData;
  userId: string;
  members?: SpaceMemberWithProfile[];
  onCommit?: (
    cardId: string,
    commitment: "attending" | "maybe" | "cant_make_it",
  ) => void;
}) {
  const commitments = data.commitments ?? {};
  const userCommitment = commitments[userId];

  // Check if user voted for the winning slot (auto-committed)
  const winningOption = data.options.find(
    (o) => o.label === data.resolved_slot,
  );
  const votedForWinner = winningOption?.votes.includes(userId) ?? false;

  // If user voted for winner and hasn't explicitly changed, they're auto-attending
  const effectiveCommitment =
    userCommitment ?? (votedForWinner ? "attending" : null);

  // Users who opted out with "pass" don't get a commitment prompt
  const optOuts = card.opt_outs ?? [];
  const userPassed = optOuts.some(
    (o) => o.user_id === userId && o.reason === "pass",
  );
  if (userPassed) return null;

  const otherCommitments = Object.entries(commitments).filter(
    ([uid]) => uid !== userId,
  );

  const calendarEvent = parseResolvedEvent(data);

  return (
    <div className="mb-3 space-y-2">
      {/* User committed as attending — show Add to Calendar */}
      {effectiveCommitment === "attending" && (
        <div className="flex items-center justify-between text-xs p-2 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          {calendarEvent ? (
            <AddToCalendar event={calendarEvent} />
          ) : (
            <span className="text-green-700 dark:text-green-400">
              {labels.cards.attending}
            </span>
          )}
          {!userCommitment && votedForWinner && onCommit && (
            <button
              type="button"
              onClick={() => onCommit(card.id, "cant_make_it")}
              className="text-green-600 dark:text-green-400 hover:underline"
            >
              {labels.cards.undoCalendarAdd}
            </button>
          )}
        </div>
      )}

      {/* User committed as maybe — show Add to Calendar */}
      {effectiveCommitment === "maybe" && (
        <div className="flex items-center justify-between text-xs p-2 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400">
          {calendarEvent ? (
            <AddToCalendar event={calendarEvent} />
          ) : (
            <span>{labels.cards.maybeTentative}</span>
          )}
        </div>
      )}

      {/* User committed as can't make it */}
      {effectiveCommitment === "cant_make_it" && (
        <div className="flex items-center gap-1.5 text-xs p-2 rounded-md bg-muted text-muted-foreground">
          {labels.cards.cantMakeIt}
        </div>
      )}

      {/* Prompt for users without a commitment */}
      {!effectiveCommitment && onCommit && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs flex-1"
            onClick={() => onCommit(card.id, "attending")}
          >
            {labels.cards.addToCalendar}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onCommit(card.id, "maybe")}
          >
            {labels.cards.maybe}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onCommit(card.id, "cant_make_it")}
          >
            {labels.cards.cantMakeIt}
          </Button>
        </div>
      )}

      {/* Show other members' commitments */}
      {members && otherCommitments.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {otherCommitments
            .map(([uid, status]) => {
              const member = members.find((m) => m.user_id === uid);
              const name = member?.profiles?.full_name ?? "Someone";
              const statusLabel =
                status === "attending"
                  ? "attending"
                  : status === "maybe"
                    ? "maybe"
                    : "can\u2019t make it";
              return `${name}: ${statusLabel}`;
            })
            .join(" \u00B7 ")}
        </div>
      )}
    </div>
  );
}
