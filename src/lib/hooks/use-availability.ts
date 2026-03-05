"use client";

import { useAvailabilityWindows } from "./use-availability-windows";
import { useCalendarBusyBlocks } from "./use-calendar-busy-blocks";
import { useCommonAvailability } from "./use-common-availability";
import { useMeetingProposals } from "./use-meeting-proposals";
import { useCalendarConnections } from "./use-calendar-connections";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseAvailabilityOptions {
  /** Posting context for team availability and proposals */
  postingId: string | null;
  /** Current user's profile ID (for personal windows & busy blocks) */
  userId: string | null;
  /** Additional owner key for availability windows (profile vs posting) */
  windowOwner?: { profileId?: string; postingId?: string } | null;
}

// ---------------------------------------------------------------------------
// Facade — composes availability sub-hooks into a unified API.
// ---------------------------------------------------------------------------

/**
 * Facade hook that unifies availability-related functionality.
 *
 * Composes:
 * - `useAvailabilityWindows` — the user's own availability windows
 * - `useCalendarBusyBlocks` — busy blocks from connected calendars
 * - `useCommonAvailability` — overlapping availability for a posting's team
 * - `useMeetingProposals` — proposed meeting times for a posting
 * - `useCalendarConnections` — connected calendar accounts
 *
 * Sub-hooks remain available for granular use; this facade is an
 * additional convenience, not a replacement.
 */
export function useAvailability(options: UseAvailabilityOptions) {
  const { postingId, userId, windowOwner } = options;

  // Determine the owner key for availability windows.
  // If an explicit windowOwner is provided, use it; otherwise default
  // to the user's profile.
  const resolvedOwner = windowOwner ?? (userId ? { profileId: userId } : null);

  // --- Personal availability -----------------------------------------------

  const windows = useAvailabilityWindows(resolvedOwner);

  // --- Calendar integration ------------------------------------------------

  const busy = useCalendarBusyBlocks(userId);
  const calendarConnections = useCalendarConnections();

  // --- Group / team availability -------------------------------------------

  const common = useCommonAvailability(postingId);

  // --- Meeting proposals ---------------------------------------------------

  const meetingProposals = useMeetingProposals(postingId);

  // --- Aggregate loading state ---------------------------------------------

  const isLoading =
    windows.isLoading ||
    busy.isLoading ||
    common.isLoading ||
    meetingProposals.isLoading ||
    calendarConnections.isLoading;

  // --- Unified return ------------------------------------------------------

  return {
    // My availability windows
    recurringWindows: windows.recurringWindows,
    specificWindows: windows.specificWindows,
    replaceWindows: windows.replaceWindows,
    mutateWindows: windows.mutate,

    // Calendar integration
    busyBlocks: busy.busyWindows,
    connections: calendarConnections.connections,
    mutateConnections: calendarConnections.mutate,

    // Group availability (for a posting context)
    commonSlots: common.windows,

    // Meeting proposals
    proposals: meetingProposals.proposals,
    mutateProposals: meetingProposals.mutate,

    // Loading states
    isLoading,
  };
}
